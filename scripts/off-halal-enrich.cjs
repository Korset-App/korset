const https = require('https')
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const DRY_RUN = process.argv.includes('--dry-run')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function httpGet(urlStr) {
  return new Promise((resolve) => {
    https.get(urlStr, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      timeout: 15000,
    }, (res) => {
      let b = ''
      res.on('data', c => b += c)
      res.on('end', () => {
        if (res.statusCode === 503) return resolve(null) // rate limit
        try { resolve(JSON.parse(b)) } catch { resolve(null) }
      })
    }).on('error', () => resolve(null))
      .on('timeout', function () { this.destroy(); resolve(null) })
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function searchOFF(params, retries = 3) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const url = `https://world.openfoodfacts.org/api/v2/search?${qs}`
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await httpGet(url)
    if (result !== null) return result
    await sleep(2000 * attempt) // backoff: 2s, 4s, 6s
  }
  return null
}

async function fetchAllPages(params) {
  const all = []
  const seen = new Set()
  let page = 1
  while (true) {
    const result = await searchOFF({ ...params, page: page })
    if (!result || !result.products || result.products.length === 0) break
    for (const p of result.products) {
      if (!seen.has(p.code)) {
        seen.add(p.code)
        all.push(p)
      }
    }
    if (all.length >= (result.count || 0)) break
    page++
    await sleep(800)
  }
  return all
}

async function main() {
  console.log('=== Open Food Facts Halal Enrichment ===\n')

  // Step 1: Fetch halal products from OFF
  let allHalalProducts = []

  // Method A: by country (KZ and RU)
  for (const country of ['en:kazakhstan', 'en:russia']) {
    console.log(`Searching halal in ${country}...`)
    const products = await fetchAllPages({
      labels_tags: 'en:halal',
      countries_tags: country,
      fields: 'code,product_name,brands,labels_tags',
      page_size: 100,
    })
    console.log(`  Found ${products.length} products`)
    allHalalProducts.push(...products)
    await sleep(1000)
  }

  // Method B: by barcode prefix (487=KZ, 460=RU, 461=RU)
  for (const prefix of ['487', '460', '461']) {
    console.log(`Searching prefix ${prefix}...`)
    const products = await fetchAllPages({
      code: `${prefix}*`,
      labels_tags: 'en:halal',
      fields: 'code,product_name,brands,labels_tags',
      page_size: 100,
    })
    console.log(`  Found ${products.length} products`)
    allHalalProducts.push(...products)
    await sleep(1000)
  }

  // Deduplicate
  const seen = new Set()
  const unique = allHalalProducts.filter(p => {
    if (seen.has(p.code)) return false
    seen.add(p.code)
    return true
  })
  console.log(`\nTotal unique halal products from OFF: ${unique.length}`)

  const offPath = path.join(__dirname, '..', 'data', 'off-halal-products-kz.json')
  fs.writeFileSync(offPath, JSON.stringify(unique, null, 2))
  console.log(`Saved to ${offPath}`)

  // Step 2: Match against DB
  console.log('\nMatching against DB products...')
  const { data: dbProducts } = await sb
    .from('global_products')
    .select('ean, name, brand, halal_status')
    .neq('halal_status', 'yes')
    .limit(12000)

  if (!dbProducts || dbProducts.length === 0) { console.log('No products to check'); return }
  console.log(`DB products to check: ${dbProducts.length}`)

  const dbByEan = new Map()
  for (const p of dbProducts) dbByEan.set(p.ean, p)

  const matches = []
  for (const offp of unique) {
    const dbp = dbByEan.get(offp.code)
    if (dbp) {
      matches.push({
        ean: offp.code,
        dbName: dbp.name,
        dbBrand: dbp.brand,
        offName: offp.product_name,
        offBrands: offp.brands,
      })
    }
  }

  console.log(`Batch search matches: ${matches.length}`)
  for (const m of matches) console.log(`  ${m.ean} | ${m.dbName}`)

  // Step 3: Individual lookups (limited sample)
  const checked = new Set(matches.map(m => m.ean))
  const unchecked = dbProducts.filter(p => !checked.has(p.ean))
  const MAX = parseInt(process.env.OFF_MAX_LOOKUPS || '500', 10)
  const toCheck = unchecked.slice(0, MAX)

  console.log(`\nIndividual lookups: ${toCheck.length}/${unchecked.length} remaining...`)
  const individual = []
  for (let i = 0; i < toCheck.length; i++) {
    const p = toCheck[i]
    const result = await httpGet(`https://world.openfoodfacts.org/api/v2/product/${p.ean}.json`)
    if (result && result.product && result.product.labels_tags && result.product.labels_tags.includes('en:halal')) {
      individual.push({ ean: p.ean, dbName: p.name, dbBrand: p.brand, offName: result.product.product_name, offBrands: result.product.brands })
    }
    if ((i + 1) % 100 === 0) process.stdout.write(`  ${i + 1}/${toCheck.length} (${individual.length} matches)\n`)
    await sleep(200)
  }

  console.log(`Individual matches: ${individual.length}`)
  const allMatches = [...matches, ...individual]

  // Step 4: Update DB
  if (allMatches.length > 0 && !DRY_RUN) {
    console.log(`\nUpdating ${allMatches.length} products...`)
    const { error } = await sb.from('global_products').update({ halal_status: 'yes' }).in('ean', allMatches.map(m => m.ean))
    if (error) console.error('Update error:', error)
    else console.log('✅ Updated')
  } else if (DRY_RUN) {
    console.log('\nDRY RUN — no updates')
  }

  // Stats
  const { count: total } = await sb.from('global_products').select('*', { count: 'exact', head: true })
  const { count: yes } = await sb.from('global_products').select('*', { count: 'exact', head: true }).eq('halal_status', 'yes')
  console.log(`\nTotal: ${total} | yes: ${yes} (${(yes/total*100).toFixed(1)}%) | matched now: ${allMatches.length}`)

  const reportPath = path.join(__dirname, '..', 'data', 'off-halal-matches.json')
  fs.writeFileSync(reportPath, JSON.stringify(allMatches, null, 2))
  console.log(`Report: ${reportPath}`)
}

main().catch(console.error)
