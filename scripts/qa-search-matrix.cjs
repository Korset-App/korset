const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l => { if(l&&!l.startsWith('#')){const[k,...v]=l.split('=');env[k.trim()]=v.join('=').trim()}})
const sb = createClient(env.SUPABASE_URL||env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const MARS = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4'

const QUERIES = [
  // DAIRY
  'молоко','молоко 1л','топленое молоко','молокы','молока','сүт','кефир','айран','ряженка','сметана','творог','сыр','сыр моцарелла','сливочное масло','яйцо','сгущенка','йогурт',
  // SWEETS & SNACKS
  'сникерс','snickers','сникерс батончик','тофифи','toffifee','шоколад','молочный шоколад','печенье','печенье шоколадное','чипсы','доритос','сухарики','орехи','арахис','конфеты','халва','мармелад','зефир',
  // GROCERY
  'гречка','рис','макароны','мука','сахар','соль','подсолнечное масло','масло сливочное','хлеб','батон','лаваш','крупа',
  // DRINKS
  'вода','сок','газировка','кока кола','coca cola','чай','чай зеленый','кофе','энергетик','компот','лимонад',
  // FROZEN / READY MEALS
  'пельмени','вареники','мороженое','пломбир','пицца','котлеты','наггетсы',
  // MEAT / FISH / DELI
  'колбаса','сосиски','халал','курица','говядина','фарш','рыба','тунец','креветки','крабовые палочки',
  // ATTRIBUTES
  'без сахара','без глютена','без лактозы','протеин','халал сосиски',
  // EAN / TYPOS / EDGE
  'asdfgh','ыфвлодж','молокы',
]

const UNWANTED_CAT = new Set(['__deactivate__'])
const OK_CATS = { 'молоко': 'dairy_eggs', 'кефир': 'dairy_eggs', 'сыр': 'dairy_eggs', 'яйцо': 'dairy_eggs', 'сникерс': 'sweets', 'шоколад': 'sweets', 'печенье': 'sweets', 'чипсы': 'snacks', 'гречка': 'grocery', 'рис': 'grocery', 'хлеб': 'bread', 'колбаса': 'deli', 'рыба': 'fish', 'вода': 'water_beverages', 'чай': 'tea_coffee', 'кофе': 'tea_coffee' }

async function test(q) {
  const { data, error } = await sb.rpc('fn_search_store_products', {p_store_id:MARS,p_query:q,p_limit:5})
  if (error) return { q, status: 'ERROR', detail: error.message }
  if (!data?.length) return { q, status: 'NO_RESULTS' }
  const r = data.map((row, i) => {
    const g = typeof row.global_products==='string'?JSON.parse(row.global_products):row.global_products||{}
    return { i: i+1, cat: g.category||'?', sub: g.subcategory||'?', brand: g.brand||'', name: (row.local_name||g.name||'?').substring(0,60), rank: Math.round(row.search_rank), type: row.match_type }
  })
  return { q, status: 'OK', results: r }
}

async function main() {
  const results = []
  for (const q of QUERIES) { const r = await test(q); results.push(r) }

  let pass=0, warn=0, fail=0
  for (const r of results) {
    const exp = OK_CATS[r.q]
    const cat = r.results?.[0]?.cat || 'none'

    if (r.q === 'asdfgh' || r.q === 'ыфвлодж') {
      const ok = r.status === 'NO_RESULTS' || (r.results?.length||0) === 0
      if (ok) { pass++; continue }
    }

    if (r.status === 'ERROR') { console.log(`  FAIL  ${r.q}: ${r.detail}`); fail++; continue }
    if (r.status === 'NO_RESULTS') {
      if (exp) { console.log(`  FAIL  ${r.q}: no results (expected ${exp})`); fail++ }
      else { console.log(`  WARN  ${r.q}: no results`); warn++ }
      continue
    }

    const top = r.results[0]
    const ok = !exp || cat === exp || top.type === 'brand_alias'
    const icon = ok ? 'OK' : (top.i < 4 ? 'WARN' : 'FAIL')
    if (ok) pass++; else if (icon === 'WARN') warn++; else fail++
    if (!ok) console.log(`  ${icon.padEnd(5)} ${r.q.padEnd(22)} #1 [${cat}/${top.sub}] ${top.brand} ${top.name} (${top.rank} ${top.type})`)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`QA SUMMARY: ${QUERIES.length} queries | ${pass} PASS | ${warn} WARN | ${fail} FAIL`)
  console.log(`${'='.repeat(60)}`)
}
main().catch(e => console.error(e))
