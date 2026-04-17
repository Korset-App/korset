import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
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

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const DEFAULT_MATCH_COUNT = 5

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

if (!SUPABASE_URL || !supabaseKey) {
  console.error('[query-vault] SUPABASE_URL and a key (ANON or SERVICE_ROLE) required')
  process.exit(1)
}
if (!OPENAI_KEY) {
  console.error('[query-vault] OPENAI_API_KEY required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function parseArgs() {
  const args = process.argv.slice(2)
  const query = []
  let count = DEFAULT_MATCH_COUNT
  let domain = null
  let subdomain = null
  let minSimilarity = 0.3

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10)
      i++
    } else if (arg === '--domain' && args[i + 1]) {
      domain = args[i + 1]
      i++
    } else if (arg === '--subdomain' && args[i + 1]) {
      subdomain = args[i + 1]
      i++
    } else if (arg === '--min-similarity' && args[i + 1]) {
      minSimilarity = parseFloat(args[i + 1])
      i++
    } else if (arg === '--help') {
      console.log(`
query-vault — Semantic search across Körset vault knowledge base

Usage:
  node scripts/query-vault.mjs "ваш запрос" [options]

Options:
  --count N          Number of results (default: ${DEFAULT_MATCH_COUNT})
  --domain NAME      Filter by domain (knowledge, architecture, decisions, patterns, changelog)
  --subdomain NAME   Filter by subdomain (e-additives, halal-certification, etc.)
  --min-similarity F  Minimum similarity threshold 0-1 (default: 0.3)
  --help             Show this help

Examples:
  node scripts/query-vault.mjs "какие Е-добавки не халал"
  node scripts/query-vault.mjs "халал правила" --domain knowledge
  node scripts/query-vault.mjs "кармин" --subdomain e-additives --count 10
  node scripts/query-vault.mjs "как работает fit-check" --domain architecture
`)
      process.exit(0)
    } else if (!arg.startsWith('--')) {
      query.push(arg)
    }
  }

  return { query: query.join(' '), count, domain, subdomain, minSimilarity }
}

async function generateQueryEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      input: text,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message || `OpenAI embeddings HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.data[0].embedding
}

async function searchVault(queryEmbedding, count, filter) {
  const { data, error } = await supabase.rpc('match_vault_chunks', {
    query_embedding: queryEmbedding,
    match_count: count,
    filter: filter,
  })

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`)
  }

  return data || []
}

function formatResult(result, index) {
  const sim = (result.similarity * 100).toFixed(1)
  const domain = result.metadata?.domain || '?'
  const sub = result.metadata?.subdomain ? `/${result.metadata.subdomain}` : ''
  const lang = result.metadata?.lang || ''

  const header = `[${index}] ${result.source_file}${result.heading ? ' → ' + result.heading : ''} (sim: ${sim}%, ${domain}${sub}, ${lang})`
  const separator = '─'.repeat(Math.min(header.length, 80))
  const content =
    result.content.length > 500 ? result.content.slice(0, 500) + '...' : result.content

  return `${header}\n${separator}\n${content}`
}

async function main() {
  const { query, count, domain, subdomain, minSimilarity } = parseArgs()

  if (!query) {
    console.error('[query-vault] Error: query text required')
    console.error(
      'Usage: node scripts/query-vault.mjs "your question" [--count N] [--domain X] [--subdomain X]'
    )
    process.exit(1)
  }

  const filter = {}
  if (domain || subdomain) {
    if (domain) filter.domain = domain
    if (subdomain) filter.subdomain = subdomain
  }

  const filterJson = Object.keys(filter).length > 0 ? filter : {}

  process.stderr.write(
    `[query-vault] Searching: "${query}" (count=${count}, filter=${JSON.stringify(filterJson)})\n`
  )

  const embedding = await generateQueryEmbedding(query)

  const results = await searchVault(embedding, count * 2, filterJson)

  const filtered = results.filter((r) => r.similarity >= minSimilarity).slice(0, count)

  if (filtered.length === 0) {
    console.log('[query-vault] No results found above similarity threshold.')
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
    `Found ${filtered.length} results (showing top ${count} with similarity >= ${minSimilarity})`
  )
}

main().catch((e) => {
  console.error(`[query-vault] Fatal: ${e.message}`)
  process.exit(1)
})
