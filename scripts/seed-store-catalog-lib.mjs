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
  dairy_eggs: { zone: 'C', position: '1-2' },
  water_beverages: { zone: 'A', position: '1-3' },
  tea_coffee: { zone: 'E', position: '1-3' },
  meat: { zone: 'D', position: '5' },
  bread_bakery: { zone: 'E', position: '4' },
  frozen: { zone: 'F', position: '1-3' },
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
  dairy_eggs: [300, 1000],
  water_beverages: [200, 800],
  tea_coffee: [500, 4000],
  meat: [600, 3500],
  bread_bakery: [150, 600],
  frozen: [300, 2000],
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

const CATEGORY_KEY_MAP = {
  dairy_eggs: ['dairy', 'dairy_eggs', 'en:dairies', 'en:milks', 'en:yogurts', 'en:cheeses', 'en:eggs'],
  water_beverages: ['beverages', 'water_beverages', 'en:beverages', 'en:waters', 'en:sodas', 'en:energy-drinks', 'en:fruit-beverages'],
  sweets: ['sweets', 'en:confectioneries', 'en:chocolates', 'en:candies', 'en:biscuits', 'en:spreads', 'en:chewing-gums'],
  snacks: ['snacks', 'en:snacks', 'en:crisps', 'en:chips'],
  tea_coffee: ['tea', 'coffee', 'tea_coffee', 'en:hot-beverages', 'en:teas', 'en:coffees'],
  grocery: ['grocery', 'en:groceries', 'sauces', 'en:sauces', 'en:condiments'],
  meat: ['meat', 'en:meats'],
  bread_bakery: ['bread_bakery', 'breakfast', 'en:breakfasts', 'en:cereals-and-their-products'],
  frozen: ['frozen', 'en:frozen-foods', 'en:ice-creams', 'en:meals'],
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

function getCategoryGroup(category) {
  if (!category) return 'other'
  for (const [group, keys] of Object.entries(CATEGORY_KEY_MAP)) {
    if (keys.some(k => category.includes(k))) return group
  }
  return 'other'
}

function selectProductsByWeights(products, maxProducts, categoryWeights) {
  if (!categoryWeights || Object.keys(categoryWeights).length === 0) {
    const shuffled = [...products].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, maxProducts)
  }

  const grouped = {}
  const others = []
  for (const p of products) {
    const group = getCategoryGroup(p.category)
    if (categoryWeights[group]) {
      if (!grouped[group]) grouped[group] = []
      grouped[group].push(p)
    } else {
      others.push(p)
    }
  }

  const selected = []
  const remainingWeight = Math.max(0, 1 - Object.values(categoryWeights).reduce((a, b) => a + b, 0))

  for (const [group, weight] of Object.entries(categoryWeights)) {
    const count = Math.round(maxProducts * weight)
    const pool = grouped[group] || []
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    selected.push(...shuffled.slice(0, count))
  }

  if (remainingWeight > 0 && others.length > 0) {
    const otherCount = maxProducts - selected.length
    const shuffled = [...others].sort(() => Math.random() - 0.5)
    selected.push(...shuffled.slice(0, otherCount))
  }

  while (selected.length < maxProducts && others.length > 0) {
    const idx = Math.floor(Math.random() * others.length)
    selected.push(others.splice(idx, 1)[0])
  }

  return selected.slice(0, maxProducts)
}

async function seedStoreCatalog({ supabase, storeId, maxProducts = 0, categoryWeights = null }) {
  const isFullCatalog = maxProducts === 0

  console.log(`   Deleting old store_products for store ${storeId}...`)
  await supabase.from('store_products').delete().eq('store_id', storeId)

  console.log('   Loading active global_products (quality >= 30)...')
  const allProducts = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('global_products')
      .select('id,ean,name,brand,category,data_quality_score')
      .gte('data_quality_score', 30)
      .eq('is_active', true)
      .order('data_quality_score', { ascending: false })
      .range(offset, offset + 499)
    if (error || !data || data.length === 0) break
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

  const products = isFullCatalog
    ? uniqueProducts
    : selectProductsByWeights(uniqueProducts, maxProducts, categoryWeights)
  console.log(`   Selected: ${products.length} products for catalog`)

  if (categoryWeights && !isFullCatalog) {
    const counts = {}
    for (const p of products) {
      const g = getCategoryGroup(p.category)
      counts[g] = (counts[g] || 0) + 1
    }
    console.log('   Category distribution:', JSON.stringify(counts))
  }

  console.log('   Creating store_products...')
  const BATCH = 50
  let inserted = 0
  let errors = 0
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH).map(p => {
      const price = getPrice(p.brand, p.category)
      const shelf = getShelf(p.category)
      return {
        store_id: storeId,
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
      await supabase.from('store_products').upsert(batch, {
        onConflict: 'store_id,ean',
      })
      inserted += batch.length
    } catch (e) {
      errors += batch.length
      if (errors <= 50) console.log(`   Batch ERR: ${e.message?.substring(0, 120) || e}`)
    }
    if (inserted % 500 === 0 || i + BATCH >= products.length) {
      console.log(`   OK: ${inserted}, Err: ${errors}, Progress: ${Math.min(i + BATCH, products.length)}/${products.length}`)
    }
  }

  console.log(`   Catalog seed complete: ${inserted} products, ${errors} errors`)
  return { inserted, errors }
}


export default { seedStoreCatalog }
