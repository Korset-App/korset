import { createClient } from '@supabase/supabase-js'

const SURL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

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
  const args = parseArgs()

  if (args.help || !args.slug) {
    console.log(`
KORSET — Deactivate Store

Required:
  --slug      Store slug to deactivate

Options:
  --hard      Also delete store_products for this store
  --dry-run   Show what would be done without executing

Notes:
  - Soft deactivation: sets is_active = false (store disappears from public routes)
  - Hard mode: also removes store_products (catalog data)
  - Scan history, alternative events, and import batches are NEVER deleted
  - The store record is preserved for audit and analytics
    `)
    if (!args.slug && !args.help) console.error('Error: --slug is required')
    process.exit(args.help ? 0 : 1)
  }

  if (!SURL || !SKEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }

  const supabase = createClient(SURL, SKEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const slug = args.slug
  const hard = args.hard || false
  const dryRun = args['dry-run'] || false

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, code, name, type, city, is_active')
    .eq('code', slug)
    .maybeSingle()

  if (error || !store) {
    console.error(`Store "${slug}" not found`)
    process.exit(1)
  }

  if (!store.is_active) {
    console.log(`Store "${store.name}" (${slug}) is already inactive.`)
    process.exit(0)
  }

  let catalogCount = 0
  if (hard) {
    const { count } = await supabase
      .from('store_products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
    catalogCount = count || 0
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would deactivate store:`)
    console.log(`  Name: ${store.name}`)
    console.log(`  Slug: ${store.code}`)
    console.log(`  Type: ${store.type}`)
    console.log(`  City: ${store.city}`)
    if (hard) console.log(`  HARD: Would delete ${catalogCount} store_products`)
    else console.log(`  SOFT: Set is_active = false, keep all data`)
    process.exit(0)
  }

  console.log(`Deactivating store "${store.name}" (${slug})...`)

  if (hard) {
    console.log(`  Deleting ${catalogCount} store_products...`)
    const { error: delError } = await supabase
      .from('store_products')
      .delete()
      .eq('store_id', store.id)
    if (delError) console.error('  Error deleting store_products:', delError.message)
    else console.log('  store_products deleted.')
  }

  const { error: updateError } = await supabase
    .from('stores')
    .update({ is_active: false })
    .eq('id', store.id)

  if (updateError) {
    console.error('Failed to deactivate store:', updateError.message)
    process.exit(1)
  }

  console.log(`Store "${store.name}" deactivated successfully.`)
  console.log('  The store will no longer appear in consumer or public routes.')
  console.log('  All scan history, events, and audit data are preserved.')
}

main()
