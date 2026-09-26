import fs from 'node:fs'
import readline from 'node:readline'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

async function* readJsonl(path) {
  const lines = readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity })
  for await (const line of lines) if (line.trim()) yield JSON.parse(line)
}

const rawByEan = new Map()
for await (const row of readJsonl('data/semeiniy_raw_products.jsonl')) rawByEan.set(row.ean, row)

const corrections = []
const counts = {}
for await (const row of readJsonl('data/korset_master_catalog_v4_final.jsonl')) {
  const raw = rawByEan.get(row.ean)
  if (!raw || row.name !== raw.name) continue
  const crumbs = raw.category_breadcrumbs || []
  let target = null
  let rule = null

  if (row.category === 'grocery' && crumbs[0] === 'Колготки, носки' && crumbs[1] === 'Колготки') {
    target = { new_category: null, new_subcategory: null, deactivate: true }
    rule = 'non_grocery_tights'
  } else if (row.category === 'dairy_eggs' && row.name.startsWith('Вода кокосовая ')) {
    target = { new_category: 'water_beverages', new_subcategory: 'water', deactivate: false }
    rule = 'coconut_water'
  } else if (row.category === 'dairy_eggs' && crumbs.includes('Паштеты')) {
    target = { new_category: 'deli', new_subcategory: 'pate', deactivate: false }
    rule = 'pate'
  } else if (row.category === 'dairy_eggs' && (crumbs.includes('Колбасы') || crumbs.includes('Сосиски'))) {
    target = { new_category: 'deli', new_subcategory: 'sausage', deactivate: false }
    rule = 'sausage'
  } else if (row.category === 'water_beverages' && crumbs.includes('Чипсы мясные шт')) {
    target = { new_category: 'snacks', new_subcategory: 'chips', deactivate: false }
    rule = 'meat_chips'
  } else if (row.category === 'grocery' && crumbs.includes('Бульоны')) {
    target = { new_category: 'sauces_spices', new_subcategory: 'condiments', deactivate: false }
    rule = 'broth'
  } else if (row.category === 'grocery' && (crumbs.includes('Приправы, специи') || crumbs.includes('Специи и приправы'))) {
    target = { new_category: 'sauces_spices', new_subcategory: 'spices', deactivate: false }
    rule = 'spices'
  } else if (row.category === 'grocery' && crumbs.includes('Консервы рыбные')) {
    target = { new_category: 'fish', new_subcategory: 'canned_fish', deactivate: false }
    rule = 'canned_fish'
  }

  if (!target) continue
  counts[rule] = (counts[rule] || 0) + 1
  corrections.push({ ean: row.ean, name: row.name, old_category: row.category, ...target })
}

fs.mkdirSync('scratch', { recursive: true })
fs.writeFileSync('scratch/catalog-category-corrections.jsonl', corrections.map((row) => JSON.stringify(row)).join('\n') + '\n')
console.log(JSON.stringify({ total: corrections.length, counts, apply: process.argv.includes('--apply') }))
if (!process.argv.includes('--apply')) process.exit(0)

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
let updated = 0
for (let offset = 0; offset < corrections.length; offset += 100) {
  const batch = corrections.slice(offset, offset + 100)
  const { data: count, error } = await client.rpc('fn_apply_strict_catalog_categories', { p_items: batch })
  if (error) throw new Error(`Batch ${offset}: ${error.message}`)
  updated += count
  console.log(JSON.stringify({ offset, count, updated }))
}
console.log(JSON.stringify({ total: corrections.length, updated }))
