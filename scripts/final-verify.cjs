const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l => { if(l&&!l.startsWith('#')){const[k,...v]=l.split('=');env[k.trim()]=v.join('=').trim()}})
const sb = createClient(env.SUPABASE_URL||env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const MARS = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4'

async function main() {
  console.log('=== 1. DATA INTEGRITY ===')
  const { data: aliases } = await sb.from('search_brand_aliases').select('*', {count:'exact',head:true})
  console.log('brand_aliases:', aliases)
  const { data: kw } = await sb.from('search_category_keywords').select('*', {count:'exact',head:true})
  console.log('keywords:', kw)

  console.log('\n=== 2. RPC HEALTH ===')
  const tests = [
    { q: 'сникерс', expect: 'brand_alias' },
    { q: 'кока кола', expect: 'brand_alias' },
    { q: 'тофифи', expect: 'brand_alias' },
    { q: 'яйцо', expect: 'intent_subcategory' },
    { q: 'молоко', expect: 'intent_subcategory' },
    { q: 'без сахара', expect: 'intent_subcategory' },
    { q: 'сникерс батончик', expect: 'brand_alias' },
    { q: 'топленое молоко', expect: 'intent_subcategory' },
    { q: 'asdfgh', expect: 'no_results' },
    { q: '46070253', expect: 'ean_prefix' },
  ]
  for (const t of tests) {
    const { data, error } = await sb.rpc('fn_search_store_products', {p_store_id:MARS,p_query:t.q,p_limit:3})
    if (error) { console.log(`  ${t.q}: ERR ${error.message}`); continue }
    if (!data?.length) {
      console.log(`  ${t.q}: no results ${t.expect==='no_results'?'✓':'✗ expected '+t.expect}`)
      continue
    }
    const top = data[0]
    const ok = top.match_type === t.expect
    console.log(`  ${ok?'✓':'✗'} ${t.q}: ${top.match_type} r=${Math.round(top.search_rank)}`)
  }

  console.log('\n=== 3. LOCAL_NAME CHECK ===')
  const { data: sn } = await sb.rpc('fn_search_store_products', {p_store_id:MARS,p_query:'сникерс',p_limit:5})
  if (sn?.length) {
    const nullLocal = sn.filter(r => !r.local_name)
    if (nullLocal.length) console.log(`  WARN: ${nullLocal.length}/${sn.length} products have null local_name`)
    else console.log('  OK: all products have local_name')
  }

  console.log('\n=== 4. DUPLICATE CHECK ===')
  for (const q of ['молоко','сникерс','вода']) {
    const { data } = await sb.rpc('fn_search_store_products', {p_store_id:MARS,p_query:q,p_limit:15})
    if (data) {
      const ids = data.map(r => r.id)
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
      if (dupes.length) console.log(`  DUPLICATES in "${q}": ${dupes.length} dupes`)
      else console.log(`  "${q}": no duplicates`)
    }
  }

  console.log('\n=== 5. FUNCTION VERSION CHECK ===')
  const { data: v } = await sb.rpc('fn_search_store_products', {p_store_id:MARS,p_query:'тест',p_limit:1})
  console.log('  RPC returns columns:', v?.length ? Object.keys(v[0]) : 'no results')

  console.log('\n=== 6. EDGE CASES ===')
  for (const q of ['', 'а', '123', '!!!', '   ', 'молоко 0.5л', 'сүт', 'құрт']) {
    const { data, error } = await sb.rpc('fn_search_store_products', {p_store_id:MARS,p_query:q,p_limit:3})
    if (error) { console.log(`  "${q}": ERR`); continue }
    console.log(`  "${q}": ${data?.length||0} results`)
  }

  console.log('\n=== 7. CATEGORY COVERAGE ===')
  const cats = ['dairy_eggs','sweets','snacks','grocery','water_beverages','tea_coffee','bread','frozen','deli','meat','fish','fruits_veg','baby_food','household']
  for (const cat of cats) {
    const { data: kwCount } = await sb.from('search_category_keywords').select('*',{count:'exact',head:true}).eq('category',cat)
    const count = kwCount || 0
    if (count === 0) console.log(`  MISSING: ${cat} has 0 keywords`)
    else console.log(`  ${cat}: ${count} keywords`)
  }

  console.log('\n=== 8. PERFORMANCE CHECK ===')
  const start = Date.now()
  const { data: perf } = await sb.rpc('fn_search_store_products', {p_store_id:MARS,p_query:'молоко',p_limit:15})
  const ms = Date.now() - start
  console.log(`  RPC "молоко" response time: ${ms}ms`)
  if (ms > 1000) console.log('  WARN: RPC too slow!')

  console.log('\n=== DONE ===')
}
main().catch(e => console.error(e))
