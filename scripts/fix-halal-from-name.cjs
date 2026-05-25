const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const HALAL_PATTERNS_SQL = [
  'name.ilike.%халал%',
  'name.ilike.%халяль%',
  'name.ilike.%halal%',
]

async function main() {
  console.log('=== FIX: Mark products with halal keywords in name ===\n')

  const { data: affected, error: fetchErr, count } = await sb
    .from('global_products')
    .select('ean, name, halal_status', { count: 'exact', head: false })
    .or(HALAL_PATTERNS_SQL.join(','))
    .neq('halal_status', 'yes')

  if (fetchErr) {
    console.error('Fetch error:', fetchErr)
    process.exit(1)
  }

  console.log(`Найдено товаров: ${count}`)
  console.log(`(получено записей: ${affected?.length || 0})`)

  if (!affected || affected.length === 0) {
    console.log('\nНет товаров для исправления.')
    return
  }

  console.log('\nТовары для исправления:')
  for (const p of affected) {
    console.log(`  ${p.halal_status} -> yes  | ${p.name}  (${p.ean})`)
  }

  // Perform the update
  const affectedEans = affected.map(p => p.ean)

  console.log(`\nОбновляю ${affectedEans.length} товаров...`)

  const { error: updateErr } = await sb
    .from('global_products')
    .update({ halal_status: 'yes' })
    .or(HALAL_PATTERNS_SQL.join(','))
    .neq('halal_status', 'yes')

  if (updateErr) {
    console.error('Update error:', updateErr)
    process.exit(1)
  }

  console.log('✅ Готово! Все товары с "халал/халяль/halal" в названии отмечены halal_status = yes.')

  // Show updated stats
  console.log('\n=== НОВАЯ СТАТИСТИКА ===')
  const { count: total } = await sb.from('global_products').select('*', { count: 'exact', head: true })
  const { count: yes } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'yes')
  const { count: unknown } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'unknown')
  const { count: no } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'no')
  console.log(`Всего: ${total}`)
  console.log(`yes:     ${yes} (${(yes/total*100).toFixed(1)}%)`)
  console.log(`unknown: ${unknown} (${(unknown/total*100).toFixed(1)}%)`)
  console.log(`no:      ${no} (${(no/total*100).toFixed(1)}%)`)
}

main().catch(console.error)
