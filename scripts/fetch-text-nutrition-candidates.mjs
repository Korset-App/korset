import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local', quiet: true })
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

console.log('Fetching candidate rows with text nutrition markers...')

// We can query with limit and offset
let allRows = []
let offset = 0
const limit = 500

while (true) {
  // Use RPC or raw query if available, or fetch rows with ingredients_raw not null
  const { data, error } = await client.from('global_products')
    .select('ean, name, category, ingredients_raw, description, nutriments_json')
    .eq('is_active', true)
    .not('image_url', 'is', null)
    .not('ingredients_raw', 'is', null)
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching batch:', error)
    break
  }
  if (!data || data.length === 0) break

  for (const row of data) {
    const hasFull = row.nutriments_json && ['energy_kcal', 'protein_100g', 'fat_100g', 'carbohydrates_100g'].every(
      k => typeof row.nutriments_json[k] === 'number' && Number.isFinite(row.nutriments_json[k])
    )
    if (!hasFull) {
      allRows.push(row)
    }
  }

  offset += limit
  process.stdout.write(`Scanned ${offset} products (candidates so far: ${allRows.length})...\r`)
  if (data.length < limit) break
}

console.log(`\nTotal products scanned without complete KBJU: ${allRows.length}`)
fs.writeFileSync('scratch/unfilled-candidates.jsonl', allRows.map(JSON.stringify).join('\n') + '\n')
console.log('Saved to scratch/unfilled-candidates.jsonl')
