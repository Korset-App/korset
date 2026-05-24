import { createClient } from '@supabase/supabase-js'
import { argv } from 'process'

const SURL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

const VALID_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
const VALID_TYPES = ['supermarket', 'minimarket', 'halal', 'specialty', 'other']
const VALID_PLANS = ['pilot', 'basic', 'pro', 'enterprise']

function parseArgs() {
  const args = {}
  let i = 2
  while (i < argv.length) {
    const key = argv[i]
    if (key.startsWith('--')) {
      const name = key.slice(2)
      const next = argv[i + 1]
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

function validatePhone(phone) {
  if (!phone) return true
  return /^7\d{10}$/.test(phone)
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(pw) {
  return pw && pw.length >= 8
}

async function main() {
  const args = parseArgs()

  if (args.help) {
    console.log(`
KORSET — Create Store + Owner Account

Required:
  --slug            Store slug (lowercase, a-z0-9-, used in /s/:slug URLs)
  --name            Store display name
  --type            Store type: ${VALID_TYPES.join(', ')}
  --city            City name
  --owner-email     Email for the owner auth account
  --owner-password  Password for the owner auth account (min 8 chars)

Optional:
  --address         Street address (without exact house number for pilot)
  --phone           Phone in format 7XXXXXXXXXX
  --short-description  Max 240 chars
  --description     Max 1200 chars
  --whatsapp-number WhatsApp number in format 7XXXXXXXXXX
  --plan            Subscription plan: ${VALID_PLANS.join(', ')} (default: pilot)
  --max-products    Seed catalog with N products from global_products (0 = skip)
  --category-weights JSON: {"dairy_eggs":0.3,"beverages":0.2,...}
  --dry-run         Show what would be done without executing

Examples:
  node scripts/create-store.mjs --slug nurly --name "Нұрлы" --type minimarket \\
    --city "Усть-Каменогорск" --owner-email owner@korset.kz --owner-password Secret123!
  `)
    process.exit(0)
  }

  const errors = []
  if (!args.slug) errors.push('--slug is required')
  if (!args.name) errors.push('--name is required')
  if (!args.type) errors.push('--type is required')
  if (!args.city) errors.push('--city is required')
  if (!args['owner-email']) errors.push('--owner-email is required')
  if (!args['owner-password']) errors.push('--owner-password is required')

  if (args.slug && !VALID_SLUG.test(args.slug)) errors.push('--slug must be lowercase a-z0-9- (min 2 chars)')
  if (args.type && !VALID_TYPES.includes(args.type)) errors.push(`--type must be one of: ${VALID_TYPES.join(', ')}`)
  if (args.plan && !VALID_PLANS.includes(args.plan)) errors.push(`--plan must be one of: ${VALID_PLANS.join(', ')}`)
  if (args['owner-email'] && !validateEmail(args['owner-email'])) errors.push('--owner-email invalid format')
  if (args['owner-password'] && !validatePassword(args['owner-password'])) errors.push('--owner-password min 8 chars')
  if (args.phone && !validatePhone(args.phone)) errors.push('--phone must be 7XXXXXXXXXX')
  if (args['whatsapp-number'] && !validatePhone(args['whatsapp-number'])) errors.push('--whatsapp-number must be 7XXXXXXXXXX')

  if (errors.length) {
    console.error('Validation errors:')
    errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }

  if (!SURL || !SKEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }

  const supabase = createClient(SURL, SKEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const slug = args.slug
  const name = args.name
  const type = args.type
  const city = args.city
  const ownerEmail = args['owner-email']
  const ownerPassword = args['owner-password']
  const plan = args.plan || 'pilot'
  const maxProducts = parseInt(args['max-products'] || '0', 10)
  const dryRun = args['dry-run'] || false

  console.log('\n=== KORSET Create Store ===\n')

  const { data: existingStore } = await supabase
    .from('stores')
    .select('id, name')
    .eq('code', slug)
    .maybeSingle()

  if (existingStore) {
    console.error(`Store with slug "${slug}" already exists (id: ${existingStore.id}, name: ${existingStore.name})`)
    process.exit(1)
  }

  const { data: existingUser } = await supabase.auth.admin
    .listUsers()
    .then(({ data }) => ({ data: data?.users?.find(u => u.email === ownerEmail) }))

  if (existingUser) {
    console.error(`User with email "${ownerEmail}" already exists. Use a different email or link existing user.`)
    process.exit(1)
  }

  const storeRecord = {
    code: slug,
    name,
    city,
    type,
    plan,
    is_active: true,
  }
  if (args.address) storeRecord.address = args.address
  if (args.phone) storeRecord.phone = args.phone
  if (args['short-description']) storeRecord.short_description = args['short-description'].substring(0, 240)
  if (args.description) storeRecord.description = args.description.substring(0, 1200)
  if (args['whatsapp-number']) storeRecord.whatsapp_number = args['whatsapp-number']

  if (dryRun) {
    console.log('[DRY RUN] Would create:')
    console.log('  Auth user:', ownerEmail)
    console.log('  Store:', JSON.stringify(storeRecord, null, 2))
    if (maxProducts > 0) {
      console.log(`  Catalog: seed ${maxProducts} products`)
      if (args['category-weights']) console.log(`  Category weights: ${args['category-weights']}`)
    }
    console.log('\nRun without --dry-run to execute.')
    process.exit(0)
  }

  console.log('1. Creating owner auth account...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
  })

  if (authError) {
    console.error('Failed to create auth user:', authError.message)
    process.exit(1)
  }

  const ownerId = authData.user.id
  console.log(`   Created: ${ownerEmail} (id: ${ownerId})`)

  storeRecord.owner_id = ownerId

  console.log('\n2. Creating store record...')
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .insert(storeRecord)
    .select('id, code, name')
    .single()

  if (storeError) {
    console.error('Failed to create store:', storeError.message)
    console.error('Cleaning up auth user...')
    await supabase.auth.admin.deleteUser(ownerId)
    process.exit(1)
  }

  console.log(`   Created: ${storeData.name} (slug: ${storeData.code}, id: ${storeData.id})`)

  if (maxProducts > 0) {
    console.log(`\n3. Seeding catalog (${maxProducts} products)...`)
    try {
      const pkg = await import('./seed-store-catalog-lib.mjs')
      const { seedStoreCatalog } = pkg.default || pkg
      await seedStoreCatalog({
        supabase,
        storeId: storeData.id,
        maxProducts,
        categoryWeights: args['category-weights'] ? JSON.parse(args['category-weights']) : null,
      })
    } catch (e) {
      console.log(`   Catalog seed skipped or failed: ${e.message}`)
      console.log('   You can run seed-store-catalog.mjs manually later.')
    }
  }

  console.log('\n=== Store Created Successfully ===')
  console.log(`  Store ID:    ${storeData.id}`)
  console.log(`  Slug:        ${storeData.code}`)
  console.log(`  Name:        ${storeData.name}`)
  console.log(`  Type:        ${type}`)
  console.log(`  City:        ${city}`)
  console.log(`  Owner ID:    ${ownerId}`)
  console.log(`  Owner Email: ${ownerEmail}`)
  console.log(`  Consumer URL: /s/${slug}`)
  console.log(`  Retail URL:  /retail/${slug}/dashboard`)
  console.log('')
}
