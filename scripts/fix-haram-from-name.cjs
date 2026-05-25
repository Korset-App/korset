const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const DRY_RUN = process.argv.includes('--dry-run')

const HARAM_PATTERNS = [
  { ilike: 'name.ilike.%со свининой%', label: 'со свининой' },
  { ilike: 'name.ilike.%свинина%', label: 'свинина' },
  { ilike: 'name.ilike.%свиная%', label: 'свиная' },
  { ilike: 'name.ilike.%свиной%', label: 'свиной' },
  { ilike: 'name.ilike.%свиное%', label: 'свиное' },
  { ilike: 'name.ilike.%шпик%', label: 'шпик' },
  { ilike: 'name.ilike.%сало%', label: 'сало' },
]

function isHaramName(name) {
  if (!name) return false
  const lower = name.toLowerCase()
  // Must not contain "без" (bez = without) before the keyword
  for (const p of HARAM_PATTERNS) {
    const kw = p.label.toLowerCase()
    if (lower.includes(kw)) {
      const idx = lower.indexOf(kw)
      const before = lower.slice(Math.max(0, idx - 15), idx)
      if (before.includes('без')) {
        continue
      }
      return p.label
    }
  }
  return false
}

async function main() {
  console.log('=== Mark products with haram keywords in name ===\n')

  const orClauses = HARAM_PATTERNS.map(p => p.ilike).join(',')

  const { data: allCandidates, error } = await sb
    .from('global_products')
    .select('ean, name, halal_status')
    .or(orClauses)
    .neq('halal_status', 'no')

  if (error) {
    console.error('Fetch error:', error)
    process.exit(1)
  }

  // Apply name-level filter
  const toUpdate = allCandidates
    .filter(p => isHaramName(p.name))
    .filter((p, i, arr) => arr.findIndex(x => x.ean === p.ean) === i) // dedupe

  console.log(`Candidates from SQL: ${allCandidates.length}`)
  console.log(`After name filter (excl "без свинины" etc): ${toUpdate.length}\n`)

  for (const p of toUpdate) {
    const keyword = isHaramName(p.name)
    console.log(`  ${p.halal_status} -> no  | [${keyword}] ${p.name.slice(0, 80)}  (${p.ean})`)
  }

  if (toUpdate.length === 0) {
    console.log('\nNo products to fix.')
    return
  }

  if (!DRY_RUN) {
    const eans = toUpdate.map(p => p.ean)
    console.log(`\nUpdating ${eans.length} products to halal_status = no...`)

    // Batch in groups of 100
    const BATCH = 100
    for (let i = 0; i < eans.length; i += BATCH) {
      const batch = eans.slice(i, i + BATCH)
      const { error: updateErr } = await sb
        .from('global_products')
        .update({ halal_status: 'no' })
        .in('ean', batch)
      if (updateErr) {
        console.error(`Batch ${i} error:`, updateErr)
      } else {
        console.log(`  Batch ${i / BATCH + 1}/${Math.ceil(eans.length / BATCH)} done`)
      }
    }

    console.log('✅ Done')
  } else {
    console.log('\nDRY RUN — no updates made')
  }

  // Stats
  const { count: total } = await sb.from('global_products').select('*', { count: 'exact', head: true })
  const { count: yes } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'yes')
  const { count: no } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'no')
  console.log(`\n=== STATS ===`)
  console.log(`Total:   ${total}`)
  console.log(`yes:     ${yes} (${(yes/total*100).toFixed(1)}%)`)
  console.log(`no:      ${no} (${(no/total*100).toFixed(1)}%)`)
  console.log(`unknown: ${total - yes - no} (${((total-yes-no)/total*100).toFixed(1)}%)`)
}

main().catch(console.error)
