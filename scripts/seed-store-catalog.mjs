import { createClient } from '@supabase/supabase-js'
import pkg from './seed-store-catalog-lib.mjs'
const { seedStoreCatalog } = pkg

const SURL = process.env.SUPABASE_URL || 'https://tcvuffoxwavqdexrzwjj.supabase.co'
const SKEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const MARS_STORE_ID = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4'

function parseArgs() {
  const args = {}
  let i = 2
  while (i < process.argv.length) {
    const key = process.argv[i]
    if (key.startsWith('--')) {
      const name = key.slice(2)
      const next = process.argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[name] = next
        i += 2
      } else {
        args[name] = true
        i += 1
      }
    } else {
      i += 1
    }
  }
  return args
}

async function main() {
  if (!SKEY) {
    console.error('Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY env var')
    process.exit(1)
  }

  const args = parseArgs()

  if (args.help) {
    console.log(`
KORSET — Seed Store Catalog

Options:
  --store-id        Store UUID (default: MARS store)
  --store-slug      Resolve slug to store UUID (alternative to --store-id)
  --max-products    Limit catalog size (0 = all available products)
  --category-weights JSON weights: {"dairy_eggs":0.3,"beverages":0.2,...}
  --dry-run         Show plan without executing

Examples:
  node scripts/seed-store-catalog.mjs
  node scripts/seed-store-catalog.mjs --store-slug nurly --max-products 2500
  node scripts/seed-store-catalog.mjs --store-slug kalina --max-products 2000 --category-weights '{"dairy_eggs":0.3}'
    `)
    process.exit(0)
  }

  const supabase = createClient(SURL, SKEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let storeId = args['store-id'] || MARS_STORE_ID

  if (args['store-slug'] && !args['store-id']) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, code')
      .eq('code', args['store-slug'])
      .maybeSingle()
    if (error || !data) {
      console.error(`Store not found: ${args['store-slug']}`)
      process.exit(1)
    }
    storeId = data.id
    console.log(`Resolved slug "${data.code}" → store: ${data.name} (${data.id})`)
  }

  const maxProducts = parseInt(args['max-products'] || '0', 10)
  const rawWeights = args['category-weights']
  let categoryWeights = null
  if (rawWeights) {
    try {
      categoryWeights = JSON.parse(rawWeights)
    } catch {
      const fixed = rawWeights.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
      categoryWeights = JSON.parse(fixed)
    }
  }

  if (args['dry-run']) {
    console.log(`[DRY RUN] Would seed store ${storeId}:`)
    console.log(`  Max products: ${maxProducts || 'all'}`)
    if (categoryWeights) console.log(`  Category weights:`, categoryWeights)
    process.exit(0)
  }

  console.log(`\n=== Seeding catalog for store ${storeId} ===\n`)

  const result = await seedStoreCatalog({
    supabase,
    storeId,
    maxProducts,
    categoryWeights,
  })

  console.log(`\nDone! ${result.inserted} products linked to store ${storeId}.`)
}

main()
