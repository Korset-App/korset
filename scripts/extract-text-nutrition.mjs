import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local', quiet: true })
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

console.log('Querying active food products lacking complete KBJU...')

// Query products in chunks of 1000
const products = []
let page = 0
const pageSize = 1000

while (true) {
  const { data, error } = await client.from('global_products')
    .select('ean, name, category, ingredients_raw, description, specs_json, nutriments_json')
    .eq('is_active', true)
    .not('image_url', 'is', null)
    .not('category', 'in', '("household","personal_care")')
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) {
    console.error('Fetch error:', error)
    process.exit(1)
  }

  if (!data || data.length === 0) break
  for (const row of data) {
    const n = row.nutriments_json
    const hasFull = n && ['energy_kcal', 'protein_100g', 'fat_100g', 'carbohydrates_100g'].every(
      k => typeof n[k] === 'number' && Number.isFinite(n[k])
    )
    if (!hasFull) {
      products.push(row)
    }
  }
  page++
  if (data.length < pageSize) break
}

console.log(`Loaded ${products.length} products lacking complete KBJU.`)

// Regex extractor functions
function parseNum(str) {
  if (!str) return null
  const clean = str.replace(',', '.').trim()
  const num = parseFloat(clean)
  return Number.isFinite(num) ? num : null
}

function extractNutrition(text) {
  if (!text || typeof text !== 'string') return null

  // Check if text contains nutrition markers
  const lower = text.toLowerCase()
  if (!lower.includes('пищевая ценность') && !lower.includes('белк') && !lower.includes('жир') && !lower.includes('углевод') && !lower.includes('ккал') && !lower.includes('кдж')) {
    return null
  }

  // Energy
  let energy_kcal = null
  const kcalMatch = lower.match(/(?:энергетическая\s+ценность|калорийность|энергия)?[^\d]{0,25}(\d+(?:[.,]\d+)?)\s*(?:ккал|kcal)/)
  if (kcalMatch) {
    energy_kcal = parseNum(kcalMatch[1])
  } else {
    // Try kJ
    const kjMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:кдж|kj)/)
    if (kjMatch) {
      const kj = parseNum(kjMatch[1])
      if (kj) energy_kcal = Math.round(kj / 4.184)
    }
  }

  // Protein
  let protein_100g = null
  const pMatch = lower.match(/белк(?:и|ов|а)?(?:\s*\(?[^)]*\)?)?[^\d]{0,15}(\d+(?:[.,]\d+)?)\s*г/)
  if (pMatch) protein_100g = parseNum(pMatch[1])

  // Fat
  let fat_100g = null
  const fMatch = lower.match(/жир(?:ы|ов|а)?(?:\s*\(?[^)]*\)?)?[^\d]{0,15}(\d+(?:[.,]\d+)?)\s*г/)
  if (fMatch) fat_100g = parseNum(fMatch[1])

  // Carbs
  let carbohydrates_100g = null
  const cMatch = lower.match(/углевод(?:ы|ов|а)?(?:\s*\(?[^)]*\)?)?[^\d]{0,15}(\d+(?:[.,]\d+)?)\s*г/)
  if (cMatch) carbohydrates_100g = parseNum(cMatch[1])

  if (protein_100g == null || fat_100g == null || carbohydrates_100g == null) return null

  // If energy was missing, estimate it
  if (energy_kcal == null) {
    energy_kcal = Math.round(protein_100g * 4 + fat_100g * 9 + carbohydrates_100g * 4)
  }

  // Plausibility validation
  if (protein_100g < 0 || protein_100g > 100) return null
  if (fat_100g < 0 || fat_100g > 100) return null
  if (carbohydrates_100g < 0 || carbohydrates_100g > 100) return null
  if (protein_100g + fat_100g + carbohydrates_100g > 106) return null
  if (energy_kcal < 0 || energy_kcal > 950) return null

  // Macro-energy consistency check
  const macroEnergy = protein_100g * 4 + fat_100g * 9 + carbohydrates_100g * 4
  if (Math.abs(macroEnergy - energy_kcal) > Math.max(80, energy_kcal * 0.35)) return null

  return {
    energy_kcal: Math.round(energy_kcal),
    protein_100g: Number(protein_100g.toFixed(1)),
    fat_100g: Number(fat_100g.toFixed(1)),
    carbohydrates_100g: Number(carbohydrates_100g.toFixed(1))
  }
}

// Separate clean ingredients from nutrition block if needed
function cleanIngredients(text) {
  if (!text) return null
  const markers = [
    /пищевая\s+ценность/i,
    /энергетическая\s+ценность/i,
    /хранить\s+при/i,
    /условия\s+хранения/i,
    /срок\s+годности/i
  ]
  let cutIdx = text.length
  for (const m of markers) {
    const idx = text.search(m)
    if (idx !== -1 && idx < cutIdx && idx > 20) {
      cutIdx = idx
    }
  }
  const cleaned = text.slice(0, cutIdx).trim().replace(/[,.:;]+$/, '')
  return cleaned.length >= 10 ? cleaned : text
}

let extractedCount = 0
const results = []

for (const p of products) {
  // Try ingredients_raw first, then description
  let nutr = extractNutrition(p.ingredients_raw)
  let sourceField = 'ingredients_raw'

  if (!nutr) {
    nutr = extractNutrition(p.description)
    sourceField = 'description'
  }

  if (nutr) {
    extractedCount++
    const cleanedIng = (sourceField === 'ingredients_raw') ? cleanIngredients(p.ingredients_raw) : null
    results.push({
      ean: p.ean,
      name: p.name,
      category: p.category,
      sourceField,
      nutrition: nutr,
      cleanedIngredients: (cleanedIng && cleanedIng !== p.ingredients_raw) ? cleanedIng : null,
      rawSnippet: (sourceField === 'ingredients_raw' ? p.ingredients_raw : p.description)?.slice(0, 150)
    })
  }
}

console.log(`\n=== EXTRACTION RESULTS ===`)
console.log(`Total candidates tested: ${products.length}`)
console.log(`Plausible 4-number KBJU successfully extracted: ${results.length}`)

// Show samples
console.log('\nSample 10 extractions:')
results.slice(0, 10).forEach((r, idx) => {
  console.log(`\n${idx + 1}. [${r.ean}] ${r.name}`);
  console.log(`   Source: ${r.sourceField} | KBJU: ${JSON.stringify(r.nutrition)}`);
  console.log(`   Raw text: "${r.rawSnippet}"`);
})

fs.writeFileSync('scratch/extracted-nutrition-proposal.jsonl', results.map(JSON.stringify).join('\n') + '\n')
console.log(`\nSaved proposal to scratch/extracted-nutrition-proposal.jsonl`)
