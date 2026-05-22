const fs = require('fs')
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l => {
  if (l && !l.startsWith('#')) { const [k,...v] = l.split('='); env[k.trim()] = v.join('=').trim() }
})
const BASE = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY
const hdrs = { apikey: KEY, Authorization: 'Bearer ' + KEY }

async function go() {
  let r
  r = await fetch(BASE + '/rest/v1/search_brand_aliases?select=alias,brand&limit=5', { headers: hdrs })
  console.log('aliases sample:', JSON.stringify(await r.json()))

  r = await fetch(BASE + "/rest/v1/search_brand_aliases?select=alias,brand,category&alias=ilike.*%D1%81%D0%BD%D0%B8%D0%BA%D0%B5%D1%80%D1%81*", { headers: hdrs })
  console.log('сникерс:', JSON.stringify(await r.json()))

  r = await fetch(BASE + "/rest/v1/search_brand_aliases?select=alias,brand,category&alias=ilike.*%D1%82%D0%BE%D1%84%D0%B8%D1%84%D0%B8*", { headers: hdrs })
  console.log('тофифи:', JSON.stringify(await r.json()))

  r = await fetch(BASE + '/rest/v1/search_category_keywords?select=keyword&limit=5', { headers: hdrs })
  console.log('keywords sample:', JSON.stringify(await r.json()))

  r = await fetch(BASE + "/rest/v1/search_category_keywords?select=keyword,category,subcategory&keyword=ilike.*%D0%BC%D0%BE%D0%BB%D0%BE%D0%BA*", { headers: hdrs })
  console.log('молок:', JSON.stringify(await r.json()))
}
go().catch(e => console.error(e))
