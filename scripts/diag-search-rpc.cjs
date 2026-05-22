const fs = require('fs')

const envContent = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [k, ...v] = line.split('=')
    envVars[k.trim()] = v.join('=').trim()
  }
})

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const MARS_ID = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4'

async function rpc(query, limit = 15) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/fn_search_store_products`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      p_store_id: MARS_ID,
      p_query: query,
      p_limit: limit,
      p_offset: 0,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    return { error: res.status, detail: text }
  }
  return res.json()
}

async function sql(query) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    return null
  }
  return res.json()
}

function formatResult(data, query) {
  if (!data || data.error) {
    console.log(`  ERROR: ${JSON.stringify(data)}`)
    return
  }
  if (!Array.isArray(data) || data.length === 0) {
    console.log(`  No results`)
    return
  }
  data.forEach((row, i) => {
    const gp = typeof row.global_products === 'string'
      ? JSON.parse(row.global_products)
      : row.global_products || {}
    const name = row.local_name || gp.name || '?'
    const brand = gp.brand || ''
    const cat = `${gp.category || ''}/${gp.subcategory || ''}`
    console.log(`  ${i + 1}. rank=${row.search_rank} type=${row.match_type} [${cat}] ${brand} ${name}`)
  })
}

async function main() {
  const queries = [
    'сникерс',
    'snickers',
    'яйцо',
    'молоко',
    'тофифи',
    'toffifee',
    'шоколад',
    'кефир',
    'вода',
    'чай',
    'кофе',
    'печенье',
    'хлеб',
    'гречка',
    'рис',
    'макароны',
    'колбаса',
    'пельмени',
    'мороженое',
    'сок',
    'без сахара',
    'халал',
    'молоко 1л',
    'топленое молоко',
    'сыр моцарелла',
    'кока кола',
    'coca cola',
    'чипсы',
    'сахар',
    'мука',
    'масло сливочное',
    'подсолнечное масло',
    'молокы',
    'сникерс батончик',
    'asdfgh',
    'ыфвлодж',
  ]

  console.log('═══════════════════════════════════════════════════════')
  console.log('KÖRSET SEARCH RPC DIAGNOSTICS — ETAP 0')
  console.log('Store: MARS (' + MARS_ID + ')')
  console.log('═══════════════════════════════════════════════════════\n')

  for (const q of queries) {
    console.log(`>>> "${q}"`)
    const data = await rpc(q)
    formatResult(data, q)
    console.log('')
  }
}

main().catch(e => console.error(e))
