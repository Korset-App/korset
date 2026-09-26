import fs from 'fs'
import readline from 'readline'

async function countAttributes(filePath) {
  const stats = {
    total: 0,
    active: 0,
    has_image: 0,
    has_ingredients: 0,
    has_nutrition: 0,
    has_calories: 0,
    has_protein: 0,
    has_fat: 0,
    has_carbs: 0,
    has_storage_conditions: 0,
    has_shelf_life: 0,
    has_country: 0,
    has_packaging_type: 0,
    has_halal: 0,
    has_brand: 0,
    has_weight_or_quantity: 0,
    has_category: 0,
    has_subcategory: 0,
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line.trim()) continue
    const item = JSON.parse(line)
    stats.total++
    if (item.is_active) stats.active++
    if (item.image_url) stats.has_image++
    if (item.ingredients_raw && item.ingredients_raw.trim().length > 3) stats.has_ingredients++
    if (item.nutriments_json && Object.keys(item.nutriments_json).length > 0) stats.has_nutrition++
    if (item.nutriments_json?.energy_kcal != null || item.nutriments_json?.calories != null || item.nutriments_json?.['energy-kcal_100g'] != null) stats.has_calories++
    if (item.nutriments_json?.protein_100g != null || item.nutriments_json?.protein != null || item.nutriments_json?.proteins_100g != null) stats.has_protein++
    if (item.nutriments_json?.fat_100g != null || item.nutriments_json?.fat != null) stats.has_fat++
    if (item.nutriments_json?.carbohydrates_100g != null || item.nutriments_json?.carbohydrates != null) stats.has_carbs++
    if (item.storage_conditions && item.storage_conditions.trim().length > 2) stats.has_storage_conditions++
    if (item.shelf_life && item.shelf_life.trim().length > 1) stats.has_shelf_life++
    if (item.country_of_origin && item.country_of_origin.trim().length > 1) stats.has_country++
    if (item.packaging_type && item.packaging_type.trim().length > 1) stats.has_packaging_type++
    if (item.halal_status === 'yes' || item.halal_status === 'halal') stats.has_halal++
    if (item.brand && item.brand.trim().length > 0) stats.has_brand++
    if (item.quantity && item.quantity.trim().length > 0) stats.has_weight_or_quantity++
    if (item.category && item.category.trim().length > 0) stats.has_category++
    if (item.subcategory && item.subcategory.trim().length > 0) stats.has_subcategory++
  }

  return stats
}

async function run() {
  console.log('Auditing backup file...')
  const before = await countAttributes('data/korset_master_catalog_v4_final.backup.jsonl')
  console.log('Auditing enriched catalog...')
  const after = await countAttributes('data/korset_master_catalog_v4_final.jsonl')

  console.log('\n================ ENRICHMENT AUDIT COMPARISON ================')
  console.table(
    Object.keys(after).map((key) => ({
      Attribute: key,
      'Before (Backup)': before[key],
      'After (Enriched)': after[key],
      Delta: `+${after[key] - before[key]}`,
    }))
  )
}

run()
