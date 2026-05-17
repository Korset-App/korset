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

  // Fetch all global products under tea_coffee/tea
  const { data, error } = await sb
    .from('global_products')
    .select('ean, name, category, subcategory, brand, image_url')
    .eq('category', 'tea_coffee')
    .eq('subcategory', 'tea')
    .order('name')

  if (error) {
    console.error('Error fetching tea:', error)
    return
  }

  console.log(`\n=== FOUND ${data.length} TEA PRODUCTS IN DATABASE ===`)

  console.log('\nFirst 30 products:')
  data.slice(0, 30).forEach((p, i) => {
    console.log(`  [${i + 1}] EAN: ${p.ean} | ${p.name} (Brand: ${p.brand || 'N/A'}, Cat: ${p.category}/${p.subcategory})`)
  })
}

main()
