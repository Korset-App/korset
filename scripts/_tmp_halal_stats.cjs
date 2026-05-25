const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function main() {
  console.log('=== ГЛОБАЛЬНАЯ СТАТИСТИКА ХАЛАЛ-СТАТУСА ===\n')

  // Total in DB
  const { count: total } = await sb.from('global_products').select('*', { count: 'exact', head: true })
  
  const { count: yes } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'yes')
  const { count: no } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'no')
  const { count: unknown } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'unknown')
  const { count: no_halal_data } = await sb.from('global_products').select('*', { count: 'exact', head: true }).is('halal_status', null)
  
  console.log(`Всего продуктов: ${total}`)
  console.log(`halal_status = yes:        ${yes}  (${(yes/total*100).toFixed(1)}%)`)
  console.log(`halal_status = no:         ${no}  (${(no/total*100).toFixed(1)}%)`)
  console.log(`halal_status = unknown:    ${unknown}  (${(unknown/total*100).toFixed(1)}%)`)
  console.log(`halal_status = null:       ${no_halal_data}  (${(no_halal_data/total*100).toFixed(1)}%)`)
  console.log(`Сумма: ${yes + no + unknown + no_halal_data} (должно быть ${total})`)
  
  // Stats by source
  console.log('\n--- ПО ИСТОЧНИКАМ ---')
  for (const source of ['arbuz', 'korzinavdom', 'ean-db', 'manual']) {
    const { count: sYes } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('source_primary', source).eq('halal_status', 'yes')
    const { count: sUnknown } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('source_primary', source).eq('halal_status', 'unknown')
    const { count: sNo } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('source_primary', source).eq('halal_status', 'no')
    const sTotal = sYes + sUnknown + sNo
    if (sTotal > 0) {
      console.log(`\n${source}: всего ${sTotal}`)
      console.log(`  yes: ${sYes} (${(sYes/sTotal*100).toFixed(1)}%)`)
      console.log(`  unknown: ${sUnknown} (${(sUnknown/sTotal*100).toFixed(1)}%)`)
      console.log(`  no: ${sNo} (${(sNo/sTotal*100).toFixed(1)}%)`)
    }
  }
  
  // Stats by category
  console.log('\n--- ПО ТОП-10 КАТЕГОРИЯМ ---')
  const { data: cats } = await sb.from('global_products').select('category, halal_status')
  const catStats = {}
  for (const r of cats || []) {
    if (!catStats[r.category]) catStats[r.category] = { total: 0, yes: 0, no: 0, unknown: 0 }
    catStats[r.category].total++
    catStats[r.category][r.halal_status || 'unknown']++
  }
  const sortedCats = Object.entries(catStats).sort((a, b) => b[1].total - a[1].total).slice(0, 10)
  for (const [cat, st] of sortedCats) {
    const pct = ((st.yes / st.total) * 100).toFixed(1)
    const pctUnknown = ((st.unknown / st.total) * 100).toFixed(1)
    console.log(`${cat}: ${st.total} товаров | yes=${st.yes}(${pct}%) unknown=${st.unknown}(${pctUnknown}%) no=${st.no}`)
  }
  
  // Products with halal in name but not marked
  console.log('\n--- ТОВАРЫ С "ХАЛАЛ/ХАЛЯЛЬ" В НАЗВАНИИ, НО НЕ ОТМЕЧЕНЫ ---')
  const { data: withHalalName } = await sb.from('global_products')
    .select('ean, name, halal_status')
    .or('name.ilike.%халал%,name.ilike.%халяль%')
    .neq('halal_status', 'yes')
    .limit(10)
  if (withHalalName?.length > 0) {
    for (const p of withHalalName) {
      console.log(`  ${p.name} → status=${p.halal_status} ean=${p.ean}`)
    }
  } else {
    console.log('  (нет таких — все корректно отмечены)')
  }
}

main().catch(console.error)
