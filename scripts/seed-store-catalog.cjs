/**
 * KORSET — Seed store_products for DARA store
 * Links global_products → store_products with realistic prices & shelves
 * Usage (PowerShell):
 *   $env:SUPABASE_SERVICE_KEY="key"; node scripts/seed-store-catalog.cjs
 */

const SURL = 'https://tcvuffoxwavqdexrzwjj.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_KEY
const STORE_ID = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4'

const SHELF_BY_CATEGORY = {
  beverages: { zone: 'A', position: '1-2' },
  'en:beverages': { zone: 'A', position: '1-2' },
  snacks: { zone: 'B', position: '1-2' },
  'en:snacks': { zone: 'B', position: '1-2' },
  sweets: { zone: 'B', position: '3-4' },
  'en:confectioneries': { zone: 'B', position: '3-4' },
  dairy: { zone: 'C', position: '1-2' },
  'en:dairies': { zone: 'C', position: '1-2' },
  'en:cheeses': { zone: 'C', position: '3' },
  grocery: { zone: 'D', position: '1-2' },
  'en:groceries': { zone: 'D', position: '1-2' },
  sauces: { zone: 'D', position: '3-4' },
  'en:sauces': { zone: 'D', position: '3-4' },
  'en:condiments': { zone: 'D', position: '3-4' },
  breakfast: { zone: 'E', position: '1' },
  'en:breakfasts': { zone: 'E', position: '1' },
  'en:cereals-and-their-products': { zone: 'E', position: '1' },
  tea: { zone: 'E', position: '2-3' },
  coffee: { zone: 'E', position: '2-3' },
  'en:hot-beverages': { zone: 'E', position: '2-3' },
  'en:teas': { zone: 'E', position: '2-3' },
  'en:coffees': { zone: 'E', position: '2-3' },
  'en:chocolates': { zone: 'B', position: '3-4' },
  'en:biscuits': { zone: 'B', position: '5' },
  'en:spreads': { zone: 'B', position: '5' },
  'en:candies': { zone: 'B', position: '5-6' },
  'en:chewing-gums': { zone: 'B', position: '6' },
  'en:crisps': { zone: 'B', position: '1-2' },
  'en:chips': { zone: 'B', position: '1-2' },
  'en:waters': { zone: 'A', position: '3' },
  'en:sodas': { zone: 'A', position: '1' },
  'en:energy-drinks': { zone: 'A', position: '2' },
  'en:fruit-beverages': { zone: 'A', position: '4' },
  'en:milks': { zone: 'C', position: '1' },
  'en:yogurts': { zone: 'C', position: '2' },
  'en:plant-based-foods': { zone: 'C', position: '4' },
  'en:meals': { zone: 'D', position: '5' },
  'en:soups': { zone: 'D', position: '5' },
  'en:frozen-foods': { zone: 'F', position: '1-2' },
  'en:ice-creams': { zone: 'F', position: '3' },
}

const PRICE_BY_CATEGORY = {
  beverages: [300, 800],
  'en:beverages': [300, 800],
  snacks: [400, 1200],
  'en:snacks': [400, 1200],
  sweets: [500, 2000],
  'en:confectioneries': [500, 2000],
  dairy: [300, 1000],
  'en:dairies': [300, 1000],
  grocery: [200, 800],
  'en:groceries': [200, 800],
  sauces: [400, 1500],
  'en:sauces': [400, 1500],
  breakfast: [800, 2500],
  'en:breakfasts': [800, 2500],
  tea: [500, 3000],
  coffee: [1000, 4000],
  'en:hot-beverages': [500, 4000],
  'en:chocolates': [500, 2500],
  'en:biscuits': [300, 1200],
  'en:spreads': [800, 2500],
  'en:candies': [200, 800],
  'en:crisps': [500, 1200],
  'en:chips': [500, 1200],
  'en:waters': [150, 400],
  'en:sodas': [250, 600],
  'en:energy-drinks': [500, 1200],
  'en:milks': [250, 600],
  'en:yogurts': [200, 500],
  'en:cheeses': [800, 3000],
}

const BRAND_PRICE_OVERRIDE = {
  'nutella': [1800, 2500],
  'kinder': [600, 1500],
  'ferrero rocher': [2500, 4000],
  'raffaello': [2500, 3500],
  'milka': [600, 1800],
  'cadbury': [500, 1500],
  'toblerone': [1000, 2500],
  'oreo': [500, 800],
  'coca-cola': [300, 500],
  'pepsi': [250, 450],
  'red bull': [900, 1200],
  'monster': [800, 1100],
  'lays': [500, 900],
  'pringles': [800, 1500],
  'doritos': [700, 1200],
  'cheetos': [400, 800],
  'nescafe': [1200, 3500],
  'lipton': [400, 1200],
  'heinz': [800, 2000],
  'hellmanns': [700, 1500],
  'kelloggs': [1000, 2500],
  'danone': [300, 700],
  'valio': [400, 900],
  'hochland': [500, 1200],
  'president': [600, 2000],
  'kitkat': [300, 600],
  'snickers': [300, 600],
  'twix': [300, 600],
  'mars': [300, 600],
  'bounty': [300, 600],
  'm&ms': [500, 1000],
  'm&m': [500, 1000],
  'maggi': [200, 600],
  'calve': [400, 800],
  'barna': [300, 600],
  'greenfield': [500, 1500],
  'jacobs': [800, 2500],
  'ahmad': [600, 2000],
  'tess': [400, 1000],
  'activia': [350, 600],
  'viola': [300, 600],
}

function randInt(min, max) {
  return Math.round((min + Math.random() * (max - min)) / 50) * 50
}

function getPrice(brand, category) {
  const brandLower = (brand || '').toLowerCase()
  for (const [key, range] of Object.entries(BRAND_PRICE_OVERRIDE)) {
    if (brandLower.includes(key)) return randInt(range[0], range[1])
  }
  for (const [key, range] of Object.entries(PRICE_BY_CATEGORY)) {
    if (category && category.includes(key)) return randInt(range[0], range[1])
  }
  return randInt(300, 1500)
}

function getShelf(category) {
  for (const [key, shelf] of Object.entries(SHELF_BY_CATEGORY)) {
    if (category && category.includes(key)) return shelf
  }
  return { zone: 'D', position: '1-2' }
}

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${SURL}/rest/v1/${path}`, {
    ...opts,
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', ...opts.headers },
  })
  if (!r.ok && r.status !== 206) {
    const err = await r.text()
    throw new Error(`API ${r.status}: ${err.substring(0, 200)}`)
  }
  return r
}

async function main() {
  if (!KEY) { console.error('Missing SUPABASE_SERVICE_KEY'); process.exit(1) }

  console.log('1. Deleting old store_products...')
  await apiFetch(`store_products?store_id=eq.${STORE_ID}`, { method: 'DELETE' }).catch(e => console.log('   Delete note:', e.message.substring(0, 80)))

  console.log('2. Loading active global_products (quality >= 30)...')
  const allProducts = []
  let offset = 0
  while (true) {
    const r = await apiFetch(`global_products?select=id,ean,name,brand,category,data_quality_score&data_quality_score=gte.30&is_active=eq.true&order=data_quality_score.desc&offset=${offset}&limit=500`)
    const data = await r.json()
    if (!data || data.length === 0) break
    allProducts.push(...data)
    offset += 500
    if (data.length < 500) break
  }
  console.log(`   Loaded: ${allProducts.length} products`)

  const seenEans = new Set()
  const uniqueProducts = allProducts.filter(p => {
    if (seenEans.has(p.ean)) return false
    seenEans.add(p.ean)
    return true
  })
  console.log(`   Unique EANs: ${uniqueProducts.length}`)

  console.log('3. Creating store_products with prices & shelves...')
  const BATCH = 50
  let inserted = 0, errors = 0
  for (let i = 0; i < uniqueProducts.length; i += BATCH) {
    const batch = uniqueProducts.slice(i, i + BATCH).map(p => {
      const price = getPrice(p.brand, p.category)
      const shelf = getShelf(p.category)
      return {
        store_id: STORE_ID,
        global_product_id: p.id,
        ean: p.ean,
        is_active: true,
        stock_status: 'in_stock',
        price_kzt: price,
        shelf_zone: shelf.zone,
        shelf_position: shelf.position,
      }
    })
    try {
      await apiFetch('store_products?on_conflict=store_id,ean', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(batch),
      })
      inserted += batch.length
    } catch (e) {
      errors += batch.length
      if (errors <= 50) console.log(`   Batch ERR: ${e.message.substring(0, 120)}`)
    }
    if (inserted % 500 === 0 || i + BATCH >= uniqueProducts.length) {
      console.log(`   OK: ${inserted}, Err: ${errors}, Total: ${i + BATCH}/${uniqueProducts.length}`)
    }
  }

  console.log(`\nDone! ${inserted} products linked to MARS store with prices & shelves.`)
}

main()
