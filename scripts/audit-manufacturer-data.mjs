import fs from 'node:fs'
import readline from 'node:readline'
import { finished } from 'node:stream/promises'

const datasets = [
  ['kdv', 'scratch/kdv-group-night/food-products-derived.jsonl'],
  ['foodmaster', 'scratch/foodmaster-night/products-derived.jsonl'],
  ['rakhat', 'scratch/rakhat-night/products-derived.jsonl'],
]

async function* rows(file) {
  for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) if (line.trim()) yield JSON.parse(line)
}

function issues(value) {
  if (!value) return ['missing_full_nutrition']
  const { energy_kcal: energy, protein_100g: protein, fat_100g: fat, carbohydrates_100g: carbs } = value
  const numbers = [energy, protein, fat, carbs]
  if (numbers.some(number => typeof number !== 'number' || !Number.isFinite(number) || number < 0)) return ['invalid_number']
  const found = []
  if (energy > 900 || [protein, fat, carbs].some(number => number > 100)) found.push('impossible_per_100g')
  if (energy === 0 && protein + fat + carbs > 0) found.push('zero_energy_with_macros')
  const calculated = 4 * protein + 9 * fat + 4 * carbs
  if (Math.abs(calculated - energy) > Math.max(60, energy * 0.25)) found.push('macro_energy_discrepancy')
  return found
}

for (const [name, file] of datasets) {
  if (!fs.existsSync(file)) continue
  const outputPath = `scratch/${name}-manufacturer-quality-flags.jsonl`
  const output = fs.createWriteStream(outputPath, 'utf8')
  const summary = { source: name, products: 0, ingredients: 0, fullNumericNutrition: 0, flags: {}, flaggedProducts: 0 }
  for await (const row of rows(file)) {
    summary.products++
    if (row.ingredients_raw) summary.ingredients++
    if (row.nutriments_json) summary.fullNumericNutrition++
    const found = issues(row.nutriments_json).filter(issue => issue !== 'missing_full_nutrition')
    if (!found.length) continue
    summary.flaggedProducts++
    for (const issue of found) summary.flags[issue] = (summary.flags[issue] || 0) + 1
    output.write(`${JSON.stringify({ sourceId: row.sourceId, sourceUrl: row.sourceUrl, name: row.name, nutrition: row.nutriments_json, issues: found })}\n`)
  }
  output.end()
  await finished(output)
  fs.writeFileSync(`scratch/${name}-manufacturer-quality-summary.json`, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(JSON.stringify(summary))
}
