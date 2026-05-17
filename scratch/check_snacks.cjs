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

  const { data, error } = await sb
    .from('global_products')
    .select('ean, name, category, subcategory, brand')
    .eq('category', 'snacks')
    .in('brand', ['Хрусteam', 'ХрусTeam', 'Хрустим', 'Кириешки', 'Трапеза', 'Ermak', 'Samurai', 'Deli'])
    .order('name')

  if (error) {
    console.error('Error fetching snacks:', error)
    return
  }

  console.log(`\n=== FOUND ${data.length} SNACKS PRODUCTS IN DATABASE ===`)
  
  const subcategoryCounts = {}
  for (const p of data) {
    subcategoryCounts[p.subcategory] = (subcategoryCounts[p.subcategory] || 0) + 1
  }

  console.log('\nSubcategory distribution:')
  for (const [sub, count] of Object.entries(subcategoryCounts)) {
    console.log(`  - ${sub}: ${count}`)
  }

  console.log('\nFirst 20 snack products:')
  data.slice(0, 20).forEach((p, i) => {
    console.log(`  [${i + 1}] EAN: ${p.ean} | ${p.name} (Brand: ${p.brand || 'N/A'}, Subcategory: ${p.subcategory})`)
  })
}

main()
