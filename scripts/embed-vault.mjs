import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile() {
  const envPath = join(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx <= 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile()

const VAULT_DIR = join(process.cwd(), 'docs', 'vault')
const EMBEDDING_DIMENSIONS = 1536
const MAX_CHUNK_TOKENS = 500
const OVERLAP_TOKENS = 50
const BATCH_SIZE = 50
const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000
const IGNORED_DIRS = new Set(['.obsidian', 'changelog', 'archive'])

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const GEMINI_KEY = process.env.GEMINI_API_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_API_BASE_URL || ''
const EMBEDDINGS_API_KEY = process.env.EMBEDDINGS_API_KEY

// Primary zero-cost provider: Google Gemini 1536d
// Secondary provider: OpenAI text-embedding-3-small if EMBEDDINGS_API_KEY is explicitly provided
const activeProvider = GEMINI_KEY
  ? 'gemini'
  : EMBEDDINGS_API_KEY
    ? 'openai'
    : (!OPENAI_BASE_URL || OPENAI_BASE_URL.includes('openai.com')) && OPENAI_KEY
      ? 'openai'
      : null

function log(msg) {
  console.log(`[embed-vault] ${msg}`)
}
function warn(msg) {
  console.warn(`[embed-vault] WARN: ${msg}`)
}
function err(msg) {
  console.error(`[embed-vault] ERROR: ${msg}`)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  err('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function estimateTokens(text) {
  return Math.ceil(text.length / 4)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function retry(fn, label) {
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const res = await fn()
      await sleep(350) // polite pacing to respect 100 RPM limit
      return res
    } catch (e) {
      let delay = RETRY_BASE_MS * Math.pow(2, attempt - 1)
      const waitMatch = e.message.match(/retry in ([\d.]+)s/i)
      if (waitMatch) {
        delay = Math.ceil(parseFloat(waitMatch[1]) * 1000) + 2000
      } else if (e.message.toLowerCase().includes('quota')) {
        delay = 65000 // Google AI Studio minute window reset
      }
      if (attempt < 12) {
        warn(
          `${label} notice (attempt ${attempt}/12), waiting ${Math.ceil(delay / 1000)}s: ${e.message.slice(0, 140)}...`
        )
        await sleep(delay)
      } else {
        throw e
      }
    }
  }
}

function collectMarkdownFiles(dir, basePath = '') {
  const results = []
  if (!existsSync(dir)) return results

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      results.push(...collectMarkdownFiles(fullPath, relPath))
    } else if (entry.name.endsWith('.md')) {
      results.push({ fullPath, relPath })
    }
  }
  return results
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { metadata: {}, body: content }
  const end = content.indexOf('---', 3)
  if (end === -1) return { metadata: {}, body: content }
  const yaml = content.slice(3, end).trim()
  const body = content.slice(end + 3).trim()
  const metadata = {}
  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const val = line
        .slice(colonIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, '')
      metadata[key] = val
    }
  }
  return { metadata, body }
}

function extractDomain(relPath) {
  const parts = splitVaultPath(relPath)
  return parts[0] || 'unknown'
}

function extractSubdomain(relPath) {
  const parts = splitVaultPath(relPath)
  return parts[1] || ''
}

function splitVaultPath(relPath) {
  return relPath.split(/[\\/]+/).filter(Boolean)
}

function detectLang(text) {
  const cyrillicKz = /[әғқңөұүһі]/i
  if (cyrillicKz.test(text)) return 'kz'
  const cyrillicRu = /[а-яё]/i
  if (cyrillicRu.test(text)) return 'ru'
  return 'en'
}

function chunkByHeadings(content) {
  const lines = content.split('\n')
  const sections = []
  let currentHeading = ''
  let currentLines = []

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() })
      }
      currentHeading = headingMatch[2].trim()
      currentLines = [line]
    } else {
      currentLines.push(line)
    }
  }
  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() })
  }

  return sections.filter((s) => s.content.length > 0)
}

function splitLargeChunk(section, maxTokens, overlapTokens) {
  const text = section.content
  const totalTokens = estimateTokens(text)
  if (totalTokens <= maxTokens) {
    return [{ heading: section.heading, content: text }]
  }

  const paragraphs = text.split(/\n\n+/)
  const chunks = []
  let currentChunk = ''
  let currentTokens = 0

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para)
    if (currentTokens + paraTokens > maxTokens && currentChunk.length > 0) {
      chunks.push({ heading: section.heading, content: currentChunk.trim() })
      const overlapText = currentChunk.split(/\n\n+/).slice(-2).join('\n\n')
      currentChunk = overlapText + '\n\n' + para
      currentTokens = estimateTokens(overlapText) + paraTokens
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
      currentTokens += paraTokens
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push({ heading: section.heading, content: currentChunk.trim() })
  }

  return chunks
}

function processFile(fileInfo) {
  const raw = readFileSync(fileInfo.fullPath, 'utf-8')
  const { metadata: fm, body } = parseFrontmatter(raw)
  const domain = fm.domain || extractDomain(fileInfo.relPath)
  const subdomain = fm.subdomain || extractSubdomain(fileInfo.relPath)
  const lang = fm.lang || detectLang(body)
  const sourceFile = `vault/${fileInfo.relPath}`

  const sections = chunkByHeadings(body)
  const allChunks = []

  for (const section of sections) {
    const chunks = splitLargeChunk(section, MAX_CHUNK_TOKENS, OVERLAP_TOKENS)
    for (const chunk of chunks) {
      const contentHash = createHash('sha256')
        .update(sourceFile + '\0' + chunk.heading + '\0' + chunk.content)
        .digest('hex')

      allChunks.push({
        source_file: sourceFile,
        heading: chunk.heading || null,
        content: chunk.content,
        content_hash: contentHash,
        metadata: {
          domain,
          subdomain,
          lang,
          ...(fm.status ? { status: fm.status } : {}),
          ...(fm.topic ? { topic: fm.topic } : {}),
          ...(fm.updated ? { updated: fm.updated } : {}),
          ...(fm.tags ? { tags: fm.tags } : {}),
        },
      })
    }
  }

  return allChunks
}

async function getExistingHashes(sourceFile) {
  const { data, error } = await supabase
    .from('vault_embeddings')
    .select('content_hash')
    .eq('source_file', sourceFile)
    .limit(10000)

  if (error) {
    warn(`Failed to fetch existing hashes for ${sourceFile}: ${error.message}`)
    return new Set()
  }
  return new Set(data.map((r) => r.content_hash))
}

async function getExistingSourceFiles() {
  const { data, error } = await supabase.from('vault_embeddings').select('source_file').limit(50000)

  if (error) {
    warn(`Failed to fetch existing source files: ${error.message}`)
    return new Set()
  }
  return new Set(data.map((r) => r.source_file))
}

async function generateEmbeddings(texts) {
  if (activeProvider === 'gemini') {
    return generateGeminiEmbeddings(texts)
  }
  if (activeProvider === 'openai') {
    return generateOpenAiEmbeddings(texts)
  }
  throw new Error('No valid embedding provider configured (GEMINI_API_KEY or EMBEDDINGS_API_KEY required)')
}

async function generateGeminiEmbeddings(texts) {
  const allEmbeddings = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const requests = batch.map((t) => ({
      model: 'models/gemini-embedding-2',
      content: { parts: [{ text: t }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }))

    const response = await retry(async () => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message || `Gemini Embeddings HTTP ${res.status}`)
      }
      return res.json()
    }, `Gemini batch ${Math.floor(i / BATCH_SIZE) + 1}`)

    const embeddings = response.embeddings.map((e) => e.values)
    allEmbeddings.push(...embeddings)
  }
  return allEmbeddings
}

async function generateOpenAiEmbeddings(texts) {
  const key = EMBEDDINGS_API_KEY || OPENAI_KEY
  const base = (process.env.EMBEDDINGS_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const allEmbeddings = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const response = await retry(async () => {
      const res = await fetch(`${base}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          input: batch,
          model: 'text-embedding-3-small',
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message || `OpenAI Embeddings HTTP ${res.status}`)
      }
      return res.json()
    }, `OpenAI batch ${Math.floor(i / BATCH_SIZE) + 1}`)

    const embeddings = response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
    allEmbeddings.push(...embeddings)
  }
  return allEmbeddings
}

async function upsertChunks(chunksWithEmbeddings) {
  if (chunksWithEmbeddings.length === 0) return

  const rows = chunksWithEmbeddings.map((c) => ({
    source_file: c.source_file,
    heading: c.heading,
    content: c.content,
    content_hash: c.content_hash,
    embedding: c.embedding,
    metadata: c.metadata,
  }))

  const batchSize = 50
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('vault_embeddings')
      .upsert(batch, { onConflict: 'source_file,content_hash' })

    if (error) {
      err(`Upsert failed for batch starting at ${i}: ${error.message}`)
      throw error
    }
  }
}

async function deleteChunksByHash(sourceFile, hashesToDelete) {
  if (hashesToDelete.length === 0) return
  const { error } = await supabase
    .from('vault_embeddings')
    .delete()
    .eq('source_file', sourceFile)
    .in('content_hash', hashesToDelete)

  if (error) {
    err(`Delete failed for ${sourceFile}: ${error.message}`)
  }
}

async function deleteFileChunks(sourceFile) {
  const { error } = await supabase.from('vault_embeddings').delete().eq('source_file', sourceFile)

  if (error) {
    err(`Delete file failed for ${sourceFile}: ${error.message}`)
  } else {
    log(`Deleted all chunks for removed file: ${sourceFile}`)
  }
}

async function main() {
  const forceReembed = process.argv.includes('--force') || process.argv.includes('--full')
  const startTime = Date.now()
  log('Starting vault embedding pipeline...')
  log(`Vault directory: ${VAULT_DIR}`)
  log(`Active embedding provider: ${activeProvider ? activeProvider.toUpperCase() + ' (1536d)' : 'NONE'}`)
  if (forceReembed) log('Mode: FULL RE-EMBEDDING (overwriting 100% of chunks with fresh 1536d vectors)')

  if (!activeProvider) {
    log('Neither GEMINI_API_KEY nor EMBEDDINGS_API_KEY found in .env.local.')
    log('Vulnerability note: files remain saved locally in docs/vault/.')
    log('Database text search and local markdown search remain fully active.')
    return
  }

  if (!existsSync(VAULT_DIR)) {
    err('Vault directory does not exist. Create docs/vault/ with markdown files.')
    process.exit(1)
  }

  const files = collectMarkdownFiles(VAULT_DIR)
  log(`Found ${files.length} markdown files`)

  let totalNew = 0
  let totalUpdated = 0
  let totalDeleted = 0
  let totalUnchanged = 0

  const diskSourceFiles = new Set(files.map((f) => `vault/${f.relPath}`))
  const existingSourceFiles = await getExistingSourceFiles()

  for (const removedFile of existingSourceFiles) {
    if (!diskSourceFiles.has(removedFile)) {
      await deleteFileChunks(removedFile)
      totalDeleted++
    }
  }

  const allPendingChunks = []

  for (const fileInfo of files) {
    const sourceFile = `vault/${fileInfo.relPath}`
    const chunks = processFile(fileInfo)

    if (chunks.length === 0) continue

    const existingHashes = await getExistingHashes(sourceFile)
    const newChunks = forceReembed ? chunks : chunks.filter((c) => !existingHashes.has(c.content_hash))
    const unchangedChunks = forceReembed ? [] : chunks.filter((c) => existingHashes.has(c.content_hash))
    const currentHashes = new Set(chunks.map((c) => c.content_hash))
    const staleHashes = [...existingHashes].filter((h) => !currentHashes.has(h))

    if (staleHashes.length > 0) {
      await deleteChunksByHash(sourceFile, staleHashes)
      totalDeleted += staleHashes.length
    }

    for (const chunk of newChunks) {
      allPendingChunks.push(chunk)
    }

    totalUnchanged += unchangedChunks.length
  }

  log(`Collected ${allPendingChunks.length} chunks to embed (unchanged: ${totalUnchanged})`)

  if (allPendingChunks.length > 0) {
    const totalBatches = Math.ceil(allPendingChunks.length / BATCH_SIZE)
    log(`Generating ${activeProvider.toUpperCase()} 1536d embeddings in ${totalBatches} batches of ${BATCH_SIZE}...`)

    for (let b = 0; b < allPendingChunks.length; b += BATCH_SIZE) {
      const chunkBatch = allPendingChunks.slice(b, b + BATCH_SIZE)
      const texts = chunkBatch.map((c) => c.content)
      const batchNum = Math.floor(b / BATCH_SIZE) + 1
      log(`  Batch ${batchNum}/${totalBatches} (${texts.length} chunks)...`)

      const embeddings = await generateEmbeddings(texts)
      const chunksWithEmbeddings = chunkBatch.map((c, i) => ({
        ...c,
        embedding: embeddings[i],
      }))

      await upsertChunks(chunksWithEmbeddings)
      totalNew += chunkBatch.length
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  log('')
  log('╔════════════════════════════════════════════════════════════════╗')
  log('║         Vault Hybrid Memory Synchronization Done               ║')
  log('╠════════════════════════════════════════════════════════════════╣')
  log(`║  Provider:         ${(activeProvider.toUpperCase() + ' 1536d').padEnd(16)}                    ║`)
  log(`║  Files processed:  ${String(files.length).padStart(4)}                                        ║`)
  log(`║  New chunks:      ${String(totalNew).padStart(4)}                                        ║`)
  log(`║  Updated chunks:  ${String(totalUpdated).padStart(4)}                                        ║`)
  log(`║  Deleted chunks:  ${String(totalDeleted).padStart(4)}                                        ║`)
  log(`║  Unchanged:       ${String(totalUnchanged).padStart(4)}                                        ║`)
  log(`║  Elapsed:         ${String(elapsed + 's').padStart(6)}                                      ║`)
  log('╚════════════════════════════════════════════════════════════════╝')
}

main().catch((e) => {
  err(`Fatal: ${e.message}`)
  process.exit(1)
})
