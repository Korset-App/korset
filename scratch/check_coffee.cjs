const path = require('path')
const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase keys not found')
    return
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Fetch all global products under tea_coffee/coffee or water_beverages/lemonade (for kisel)
  const { data, error } = await sb
    .from('global_products')
    .select('ean, name, category, subcategory, brand, image_url')
    .or('category.eq.tea_coffee,and(category.eq.water_beverages,subcategory.eq.lemonade)')
    .order('name')

  if (error) {
    console.error('Error fetching coffee/cocoa/kisel:', error)
    return
  }

  // Filter products by brand or names containing coffee/cocoa/kisel/3 в 1/etc to inspect our import
  const keywords = ['кофе', 'какао', 'кисель', 'coffee', 'cocoa', 'kisel', '3 в 1', 'nescafe', 'jacobs', 'carte noire', 'jardin', 'lavazza', 'tchibo', 'starbucks', 'bushido']
  const matched = data.filter(p => {
    const nameLower = (p.name || '').toLowerCase()
    const brandLower = (p.brand || '').toLowerCase()
    return keywords.some(kw => nameLower.includes(kw) || brandLower.includes(kw))
  })

  console.log(`\n=== FOUND ${matched.length} COFFEE, COCOA & KISEL PRODUCTS IN DATABASE ===`)

  const categorySubcategoryCounts = {}
  for (const p of matched) {
    const key = `${p.category} / ${p.subcategory}`
    categorySubcategoryCounts[key] = (categorySubcategoryCounts[key] || 0) + 1
  }

  console.log('\nDistribution by Category / Subcategory:')
  for (const [key, count] of Object.entries(categorySubcategoryCounts)) {
    console.log(`  - ${key}: ${count}`)
  }

  console.log('\nFirst 30 products:')
  matched.slice(0, 30).forEach((p, i) => {
    console.log(`  [${i + 1}] EAN: ${p.ean} | ${p.name} (Brand: ${p.brand || 'N/A'}, Cat: ${p.category}/${p.subcategory})`)
  })
}

main()
