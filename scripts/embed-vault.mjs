import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs'
import { join, relative, sep } from 'path'
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
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const MAX_CHUNK_TOKENS = 500
const OVERLAP_TOKENS = 50
const BATCH_SIZE = 100
const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

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
if (!OPENAI_KEY) {
  err('OPENAI_API_KEY required in .env.local')
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
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (e) {
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1)
      if (attempt < MAX_RETRIES) {
        warn(
          `${label} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms: ${e.message}`
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
  const parts = relPath.split(sep)
  return parts[0] || 'unknown'
}

function extractSubdomain(relPath) {
  const parts = relPath.split(sep)
  return parts[1] || ''
}

function detectLang(text) {
  const cyrillicKz = /[әғқңөұүһі]/i
  const hasKzChars = cyrillicKz.test(text)
  if (hasKzChars) return 'kz'
  const cyrillicRu = /[а-яё]/i
  const hasRuChars = cyrillicRu.test(text)
  if (hasRuChars) return 'ru'
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

  if (error) {
    warn(`Failed to fetch existing hashes for ${sourceFile}: ${error.message}`)
    return new Set()
  }
  return new Set(data.map((r) => r.content_hash))
}

async function getExistingSourceFiles() {
  const { data, error } = await supabase.from('vault_embeddings').select('source_file')

  if (error) {
    warn(`Failed to fetch existing source files: ${error.message}`)
    return new Set()
  }
  return new Set(data.map((r) => r.source_file))
}

async function generateEmbeddings(texts) {
  const batchSize = BATCH_SIZE
  const allEmbeddings = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const response = await retry(
      async () => {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            dimensions: EMBEDDING_DIMENSIONS,
            input: batch,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error?.message || `OpenAI embeddings HTTP ${res.status}`)
        }
        return res.json()
      },
      `Embedding batch ${Math.floor(i / batchSize) + 1}`
    )

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
  const startTime = Date.now()
  log('Starting vault embedding pipeline...')
  log(`Vault directory: ${VAULT_DIR}`)

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

  for (const fileInfo of files) {
    const sourceFile = `vault/${fileInfo.relPath}`
    const chunks = processFile(fileInfo)

    if (chunks.length === 0) {
      log(`  ${fileInfo.relPath} — no chunks (skipping)`)
      continue
    }

    const existingHashes = await getExistingHashes(sourceFile)
    const newChunks = chunks.filter((c) => !existingHashes.has(c.content_hash))
    const unchangedChunks = chunks.filter((c) => existingHashes.has(c.content_hash))
    const currentHashes = new Set(chunks.map((c) => c.content_hash))
    const staleHashes = [...existingHashes].filter((h) => !currentHashes.has(h))

    log(
      `  ${fileInfo.relPath} — ${chunks.length} chunks (${newChunks.length} new, ${unchangedChunks.length} unchanged, ${staleHashes.length} stale)`
    )

    if (staleHashes.length > 0) {
      await deleteChunksByHash(sourceFile, staleHashes)
      totalDeleted += staleHashes.length
    }

    if (newChunks.length > 0) {
      const texts = newChunks.map((c) => c.content)
      log(`    Generating embeddings for ${texts.length} chunks...`)
      const embeddings = await generateEmbeddings(texts)

      const chunksWithEmbeddings = newChunks.map((c, i) => ({
        ...c,
        embedding: embeddings[i],
      }))

      await upsertChunks(chunksWithEmbeddings)
      totalNew += newChunks.length
      totalUpdated += staleHashes.length
    }

    totalUnchanged += unchangedChunks.length
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  log('')
  log('╔══════════════════════════════════════╗')
  log('║     Vault Embedding Pipeline Done     ║')
  log('╠══════════════════════════════════════╣')
  log(`║  Files processed:  ${String(files.length).padStart(4)}              ║`)
  log(`║  New chunks:      ${String(totalNew).padStart(4)}              ║`)
  log(`║  Updated chunks:  ${String(totalUpdated).padStart(4)}              ║`)
  log(`║  Deleted chunks:  ${String(totalDeleted).padStart(4)}              ║`)
  log(`║  Unchanged:       ${String(totalUnchanged).padStart(4)}              ║`)
  log(`║  Elapsed:     ${String(elapsed + 's').padStart(6)}              ║`)
  log('╚══════════════════════════════════════╝')
}

main().catch((e) => {
  err(`Fatal: ${e.message}`)
  process.exit(1)
})
