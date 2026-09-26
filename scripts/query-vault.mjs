import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

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

const EMBEDDING_DIMENSIONS = 1536
const DEFAULT_MATCH_COUNT = 5

let GEMINI_KEY, OPENAI_KEY, EMBEDDINGS_API_KEY
let activeProvider = null

const VAULT_DIR = join(process.cwd(), 'docs', 'vault')
const IGNORED_DIRS = new Set(['.obsidian', 'changelog', 'archive'])

let supabase = null
async function initializeRemote() {
  loadEnvFile()
  GEMINI_KEY = process.env.GEMINI_API_KEY
  OPENAI_KEY = process.env.OPENAI_API_KEY
  EMBEDDINGS_API_KEY = process.env.EMBEDDINGS_API_KEY
  const base = process.env.OPENAI_API_BASE_URL || ''
  activeProvider = GEMINI_KEY ? 'gemini' : EMBEDDINGS_API_KEY || ((!base || base.includes('openai.com')) && OPENAI_KEY) ? 'openai' : null
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const query = []
  let count = DEFAULT_MATCH_COUNT
  let domain = null
  let subdomain = null
  let status = null
  let source = null
  let updatedAfter = null
  let minSimilarity = 0.25
  let remote = false
  let local = false
  const valueOptions = new Set(['--count', '--domain', '--subdomain', '--status', '--source', '--updated-after', '--min-similarity'])

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (valueOptions.has(arg) && (!args[i + 1] || args[i + 1].startsWith('--'))) {
      throw new Error(`Missing value: ${arg}`)
    }
    if (arg === '--remote') {
      remote = true
    } else if (arg === '--local') {
      local = true
    } else if (arg === '--count' && args[i + 1]) {
      count = Number(args[i + 1])
      i++
    } else if (arg === '--domain' && args[i + 1]) {
      domain = args[i + 1]
      i++
    } else if (arg === '--subdomain' && args[i + 1]) {
      subdomain = args[i + 1]
      i++
    } else if (arg === '--status' && args[i + 1]) {
      status = args[i + 1]
      i++
    } else if (arg === '--source' && args[i + 1]) {
      source = args[i + 1]
      i++
    } else if (arg === '--updated-after' && args[i + 1]) {
      updatedAfter = args[i + 1]
      i++
    } else if (arg === '--min-similarity' && args[i + 1]) {
      minSimilarity = Number(args[i + 1])
      i++
    } else if (arg === '--help') {
      console.log(`
query-vault — Local-first search across Körset knowledge base

Usage:
  node scripts/query-vault.mjs "ваш запрос" [options]

Options:
  --local            Local markdown only (default; no credentials or network)
  --remote           Opt in to external embeddings and Supabase reads; may incur cost
  --count N          Number of results (default: ${DEFAULT_MATCH_COUNT})
  --domain NAME      Filter by domain (knowledge, architecture, decisions, patterns, plans)
  --subdomain NAME   Filter by subdomain (e-additives, halal-certification, etc.)
  --status NAME      Filter by frontmatter status (active, superseded, draft, legacy)
  --source TEXT      Post-filter by source_file substring
  --updated-after YYYY-MM-DD  Post-filter by metadata.updated date
  --min-similarity F  Remote similarity threshold 0-1 (default: 0.25; not a probability)
  --help             Show this help

Search Modes:
  1. Hybrid RRF: Fuses Google Gemini 1536d semantic embeddings + Supabase lexical ranking
  2. Database Text: Keyword matching with ilike and local relevance ranking
  3. Local Vault: Direct markdown index scanning on local disk (offline resilience)
`)
      process.exit(0)
    } else if (!arg.startsWith('--')) {
      query.push(arg)
    } else {
      throw new Error(`Unknown option or missing value: ${arg}`)
    }
  }

  if (remote && local) throw new Error('Choose either --local or --remote')
  if (!Number.isInteger(count) || count < 1) throw new Error('--count must be a positive integer')
  if (!Number.isFinite(minSimilarity) || minSimilarity < 0 || minSimilarity > 1) throw new Error('--min-similarity must be between 0 and 1')
  if (updatedAfter && (!/^\d{4}-\d{2}-\d{2}$/.test(updatedAfter) || Number.isNaN(Date.parse(updatedAfter)))) throw new Error('--updated-after requires YYYY-MM-DD')
  return {
    remote,
    query: query.join(' '),
    count,
    domain,
    subdomain,
    status,
    source,
    updatedAfter,
    minSimilarity,
  }
}

async function generateQueryEmbedding(text) {
  if (activeProvider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-2',
          content: { parts: [{ text }] },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error?.message || `Gemini Embed HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.embedding.values
  }

  if (activeProvider === 'openai') {
    const key = EMBEDDINGS_API_KEY || OPENAI_KEY
    const base = (process.env.EMBEDDINGS_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
    const res = await fetch(`${base}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error?.message || `OpenAI Embed HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.data[0].embedding
  }

  return null
}

async function searchVaultSemantic(queryEmbedding, count, filter) {
  if (!supabase || !queryEmbedding) return []
  const { data, error } = await supabase.rpc('match_vault_chunks', {
    query_embedding: queryEmbedding,
    match_count: count,
    filter: filter,
  })

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`)
  }

  return (data || []).map((r) => ({ ...r, mode: 'semantic' }))
}

async function searchVaultDbText(query, count, filter) {
  if (!supabase) return []

  const rawTerms = query
    .toLowerCase()
    .split(/[\s,.;:!?/\\_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
  const terms = [...new Set(rawTerms)]

  let queryBuilder = supabase
    .from('vault_embeddings')
    .select('id, source_file, heading, content, metadata')

  if (filter.domain) {
    queryBuilder = queryBuilder.ilike('metadata->>domain', `%${filter.domain}%`)
  }
  if (filter.subdomain) {
    queryBuilder = queryBuilder.ilike('metadata->>subdomain', `%${filter.subdomain}%`)
  }
  if (filter.status) {
    queryBuilder = queryBuilder.eq('metadata->>status', filter.status)
  }

  if (terms.length > 0) {
    const orConds = terms
      .map((t) => `content.ilike.%${t}%,heading.ilike.%${t}%,source_file.ilike.%${t}%`)
      .join(',')
    queryBuilder = queryBuilder.or(orConds)
  }

  const { data, error } = await queryBuilder.limit(count * 6)
  if (error) throw error
  if (!data || data.length === 0) return []

  const queryLower = query.toLowerCase()
  const scored = data.map((row) => {
    let score = 0
    const headingLower = (row.heading || '').toLowerCase()
    const contentLower = (row.content || '').toLowerCase()
    const sourceLower = (row.source_file || '').toLowerCase()

    if (headingLower.includes(queryLower)) score += 15
    if (contentLower.includes(queryLower)) score += 8
    if (sourceLower.includes(queryLower)) score += 12

    for (const term of terms) {
      if (headingLower.includes(term)) score += 4
      if (sourceLower.includes(term)) score += 3
      const matches = contentLower.split(term).length - 1
      score += Math.min(matches, 5)
    }

    return {
      ...row,
      score,
      similarity: Math.min(0.95, 0.45 + score / 25),
      mode: 'db-text',
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count)
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

function parseSections(content) {
  const lines = content.split('\n')
  const sections = []
  let heading = ''
  let currentLines = []
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)/)
    if (m) {
      if (currentLines.length > 0) {
        sections.push({ heading, content: currentLines.join('\n').trim() })
      }
      heading = m[2].trim()
      currentLines = [line]
    } else {
      currentLines.push(line)
    }
  }
  if (currentLines.length > 0) {
    sections.push({ heading, content: currentLines.join('\n').trim() })
  }
  return sections
}

function searchLocalVault(query, count, filter) {
  const rawTerms = query
    .toLowerCase()
    .split(/[\s,.;:!?/\\_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
  const terms = [...new Set(rawTerms)]

  const files = collectMarkdownFiles(VAULT_DIR)
  const results = []
  const queryLower = query.toLowerCase()

  for (const f of files) {
    const raw = readFileSync(f.fullPath, 'utf-8')
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
    const metadata = { domain: f.relPath.split('/')[0], subdomain: f.relPath.split('/')[1] || '' }
    if (frontmatter) {
      for (const line of frontmatter[1].split(/\r?\n/)) {
        const match = line.match(/^([\w-]+):\s*(.*?)\s*$/)
        if (match) metadata[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
    if (filter.domain && metadata.domain.toLowerCase() !== filter.domain.toLowerCase()) continue
    if (filter.subdomain && metadata.subdomain.toLowerCase() !== filter.subdomain.toLowerCase()) continue
    if (filter.status && metadata.status !== filter.status) continue
    if (filter.source && !`vault/${f.relPath}`.toLowerCase().includes(filter.source.toLowerCase())) continue
    if (filter.updatedAfter && !isOnOrAfter(metadata.updated, filter.updatedAfter)) continue
    const sections = parseSections(frontmatter ? raw.slice(frontmatter[0].length) : raw)
    const relPathLower = f.relPath.toLowerCase()

    for (const sec of sections) {
      let score = 0
      const headingLower = (sec.heading || '').toLowerCase()
      const contentLower = (sec.content || '').toLowerCase()

      if (headingLower.includes(queryLower)) score += 15
      if (contentLower.includes(queryLower)) score += 8
      if (relPathLower.includes(queryLower)) score += 12

      for (const t of terms) {
        if (headingLower.includes(t)) score += 4
        if (relPathLower.includes(t)) score += 3
        const matches = contentLower.split(t).length - 1
        score += Math.min(matches, 5)
      }

      if (score > 0) {
        results.push({
          source_file: `vault/${f.relPath}`,
          heading: sec.heading,
          content: sec.content,
          metadata,
          score,
          similarity: Math.min(0.95, 0.45 + score / 25),
          mode: 'local-vault',
        })
      }
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, count)
}

// Reciprocal Rank Fusion (RRF) combines rankings from multiple retrieval stages
function fuseRRF(semanticList, lexicalList, k = 60) {
  const scoreMap = new Map()

  const getKey = (item) => `${item.source_file}::${item.heading || ''}`

  semanticList.forEach((item, index) => {
    const key = getKey(item)
    const rrf = 1 / (k + (index + 1))
    scoreMap.set(key, {
      item,
      rrfScore: rrf,
      simSemantic: item.similarity || 0,
      hasLexical: false,
    })
  })

  lexicalList.forEach((item, index) => {
    const key = getKey(item)
    const rrf = 1 / (k + (index + 1))
    if (scoreMap.has(key)) {
      const existing = scoreMap.get(key)
      existing.rrfScore += rrf
      existing.hasLexical = true
      existing.item.content = existing.item.content || item.content
      existing.item.metadata = existing.item.metadata || item.metadata
    } else {
      scoreMap.set(key, {
        item,
        rrfScore: rrf,
        simSemantic: null,
        hasLexical: true,
      })
    }
  })

  const fused = Array.from(scoreMap.values()).map((entry) => {
    let mode = 'semantic'
    let sim = entry.simSemantic ?? 0.5
    if (entry.simSemantic !== null && entry.hasLexical) {
      mode = 'hybrid-rrf'
      sim = Math.min(0.98, Math.max(entry.simSemantic, 0.7) + 0.1)
    } else if (entry.hasLexical) {
      mode = 'db-text'
      sim = entry.item.similarity || 0.65
    }

    return {
      ...entry.item,
      similarity: sim,
      rrfScore: entry.rrfScore,
      mode,
    }
  })

  fused.sort((a, b) => b.rrfScore - a.rrfScore)
  return fused
}

function formatResult(result, index) {
  const sim = (result.similarity * 100).toFixed(1)
  const modeTag = result.mode === 'local-vault'
    ? `mode: local-vault, relevance: ${result.score}`
    : result.mode === 'hybrid-rrf'
    ? `mode: hybrid-rrf ★, sim: ${sim}%`
    : `mode: ${result.mode}, sim: ${sim}%`
  const domain = result.metadata?.domain || '?'
  const sub = result.metadata?.subdomain ? `/${result.metadata.subdomain}` : ''
  const lang = result.metadata?.lang || ''
  const status = result.metadata?.status ? `, status:${result.metadata.status}` : ''
  const updated = result.metadata?.updated ? `, updated:${result.metadata.updated}` : ''

  const header = `[${index}] ${result.source_file}${result.heading ? ' → ' + result.heading : ''} (${modeTag}, ${domain}${sub}${lang ? ', ' + lang : ''}${status}${updated})`
  const separator = '─'.repeat(Math.min(header.length, 80))
  const content =
    result.content.length > 500 ? result.content.slice(0, 500) + '...' : result.content

  return `${header}\n${separator}\n${content}`
}

function isOnOrAfter(value, threshold) {
  if (!value) return false
  const date = Date.parse(value)
  const minDate = Date.parse(threshold)
  if (Number.isNaN(date) || Number.isNaN(minDate)) return false
  return date >= minDate
}

async function main() {
  const { query, count, domain, subdomain, status, source, updatedAfter, minSimilarity, remote } =
    parseArgs()

  if (!query) {
    console.error('[query-vault] Error: query text required')
    console.error(
      'Usage: node scripts/query-vault.mjs "your question" [--count N] [--domain X] [--subdomain X]'
    )
    process.exit(1)
  }

  const filter = {}
  if (domain) filter.domain = domain
  if (subdomain) filter.subdomain = subdomain
  if (status) filter.status = status

  const needsPostFilter = Boolean(source || updatedAfter)
  const searchCount = needsPostFilter ? Math.max(count * 4, 20) : count * 2

  let semanticResults = []
  let dbTextResults = []

  if (remote) await initializeRemote()
  // 1. Semantic Embedding Search
  try {
    const embedding = await generateQueryEmbedding(query)
    if (embedding) {
      semanticResults = await searchVaultSemantic(embedding, searchCount, filter)
    }
  } catch (e) {
    process.stderr.write(`[query-vault] Semantic search notice: ${e.message}\n`)
  }

  // 2. Database Keyword Search
  if (supabase) {
    try {
      dbTextResults = await searchVaultDbText(query, searchCount, filter)
    } catch (e) {
      process.stderr.write(`[query-vault] DB text search notice: ${e.message}\n`)
    }
  }

  // 3. Fusion or Fallback
  let results = []
  if (semanticResults.length > 0 && dbTextResults.length > 0) {
    results = fuseRRF(semanticResults, dbTextResults)
  } else if (semanticResults.length > 0) {
    results = semanticResults
  } else if (dbTextResults.length > 0) {
    results = dbTextResults
  } else {
    // 4. Local Vault Offline Fallback
    results = searchLocalVault(query, searchCount, { ...filter, source, updatedAfter })
  }

  const activeMode = results[0]?.mode || 'none'
  process.stderr.write(
    `[query-vault] Query: "${query}" (provider: ${activeProvider || 'local'}, mode: ${activeMode}, found: ${results.length})\n`
  )

  const filtered = results
    .filter((r) => r.mode === 'local-vault' || r.similarity >= minSimilarity)
    .filter((r) => !source || r.source_file.toLowerCase().includes(source.toLowerCase()))
    .filter((r) => !updatedAfter || isOnOrAfter(r.metadata?.updated, updatedAfter))
    .slice(0, count)

  if (filtered.length === 0) {
    console.log('[query-vault] No matching results found.')
    if (results.length > 0) {
      console.log(
        `[query-vault] ${results.length} results below threshold (top: ${(results[0].similarity * 100).toFixed(1)}%). Try --min-similarity 0.2`
      )
    }
    return
  }

  console.log('')
  for (let i = 0; i < filtered.length; i++) {
    console.log(formatResult(filtered[i], i + 1))
    console.log('')
  }

  console.log(
    `Found ${filtered.length} results (mode: ${activeMode}, showing top ${count}; relevance is not a probability)`
  )
}

main().catch((e) => {
  console.error(`[query-vault] Fatal: ${e.message}`)
  process.exit(1)
})
