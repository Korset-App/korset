import fs from 'node:fs'
import readline from 'node:readline'
import { extractFatPercent, extractNormalizedWeight } from './utils/retail-tokenizer.mjs'

async function* rows(file) {
  for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) if (line.trim()) yield JSON.parse(line)
}

function fullNutrition(value) {
  const groups = [
    ['energy_kcal', 'calories', 'calories_100g', 'kcal'],
    ['protein_100g', 'proteins_100g', 'proteins', 'protein'],
    ['fat_100g', 'fats_100g', 'fat'],
    ['carbohydrates_100g', 'carbohydrates', 'carbs_100g', 'carbs'],
  ]
  return groups.every(group => group.some(key => typeof value?.[key] === 'number' && Number.isFinite(value[key])))
}

function issues(value) {
  if (!fullNutrition(value)) return ['incomplete_nutrition']
  const { energy_kcal: energy, protein_100g: protein, fat_100g: fat, carbohydrates_100g: carbs } = value
  if (![energy, protein, fat, carbs].every(number => typeof number === 'number' && Number.isFinite(number))) return ['noncanonical_nutrition']
  const found = []
  if (energy < 0 || energy > 900 || [protein, fat, carbs].some(number => number < 0 || number > 100)) found.push('impossible_per_100g')
  if (energy === 0 && protein + fat + carbs > 0) found.push('zero_energy_with_macros')
  if (Math.abs(4 * protein + 9 * fat + 4 * carbs - energy) > Math.max(60, energy * 0.25)) found.push('macro_energy_discrepancy')
  return found
}

const donors = new Map()
for await (const row of rows('data/arbuz_enriched_catalog.jsonl')) {
  if (!/^\d{8,14}$/.test(String(row.ean || ''))) continue
  if (!donors.has(String(row.ean))) donors.set(String(row.ean), [])
  donors.get(String(row.ean)).push(row)
}
const staged = []
for await (const target of rows('data/korset_master_catalog_v4_final.jsonl')) {
  if (!target.image_url || /empty_photo\.svg/i.test(target.image_url) || ['household', 'personal_care'].includes(target.category)) continue
  const matches = donors.get(String(target.ean)) || []
  const missingIngredients = !target.ingredients_raw || !String(target.ingredients_raw).trim()
  const missingNutrition = !fullNutrition(target.nutriments_json)
  if (!missingIngredients && !missingNutrition) continue
  for (const donor of matches) {
    const ingredients = missingIngredients && typeof donor.ingredients_raw === 'string' && donor.ingredients_raw.trim() ? donor.ingredients_raw.trim() : null
    const nutrition = missingNutrition && fullNutrition(donor.nutriments_json) ? donor.nutriments_json : null
    if (!ingredients && !nutrition) continue
    const targetWeight = extractNormalizedWeight(target.name)
    const donorWeight = extractNormalizedWeight(`${donor.name || ''} ${donor.weight || ''}`)
    const quantityConflict = targetWeight?.grams != null && donorWeight?.grams != null && targetWeight.grams !== donorWeight.grams
      || targetWeight?.ml != null && donorWeight?.ml != null && targetWeight.ml !== donorWeight.ml
    const targetFat = extractFatPercent(target.name)
    const donorFat = extractFatPercent(donor.name)
    const fatConflict = targetFat != null && donorFat != null && Math.abs(targetFat - donorFat) > 0.1
    const nutritionIssues = nutrition ? issues(nutrition) : []
    staged.push({ ean: String(target.ean), targetName: target.name, donorId: donor.id, donorName: donor.name,
      sourceUrl: donor.uri ? `https://arbuz.kz${donor.uri}` : null,
      proposedIngredients: ingredients, proposedNutrition: nutritionIssues.length ? null : nutrition,
      quantityConflict: Boolean(quantityConflict), fatConflict: Boolean(fatConflict), nutritionIssues,
      status: quantityConflict || fatConflict || nutritionIssues.length || matches.length !== 1 ? 'hold' : 'exact_ean_review',
    })
  }
}
fs.writeFileSync('scratch/arbuz-exact-ean-review-batch.jsonl', `${staged.map(row => JSON.stringify(row)).join('\n')}\n`)
const summary = { rows: staged.length, uniqueEans: new Set(staged.map(row => row.ean)).size, exactEanReview: staged.filter(row => row.status === 'exact_ean_review').length, hold: staged.filter(row => row.status === 'hold').length, proposedIngredients: staged.filter(row => row.proposedIngredients).length, proposedNutrition: staged.filter(row => row.proposedNutrition).length }
fs.writeFileSync('scratch/arbuz-exact-ean-review-summary.json', `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary))
