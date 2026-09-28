import fs from 'node:fs'
import readline from 'node:readline'
import { finished } from 'node:stream/promises'
import { buildCandidateIndex, findCandidates } from './utils/enrichmentCandidateSearch.mjs'

const masterPath = 'data/korset_master_catalog_v4_final.jsonl'
const sourcePath = 'scratch/kdv-group-night/food-products-derived.jsonl'
const outputPath = 'scratch/kdv-group-night/local-v4-review-candidates.jsonl'
const summaryPath = 'scratch/kdv-group-night/local-v4-review-summary.json'

async function* jsonl(file) {
  const stream = fs.createReadStream(file, 'utf8')
  for await (const line of readline.createInterface({ input: stream, crlfDelay: Infinity })) if (line.trim()) yield JSON.parse(line)
}

function fullNutrition(value) {
  const keys = [
    ['energy_kcal', 'calories', 'calories_100g', 'kcal'],
    ['protein_100g', 'proteins_100g', 'proteins', 'protein'],
    ['fat_100g', 'fats_100g', 'fat'],
    ['carbohydrates_100g', 'carbohydrates', 'carbs_100g', 'carbs'],
  ]
  return keys.every(group => group.some(key => typeof value?.[key] === 'number' && Number.isFinite(value[key])))
}

const donors = []
for await (const row of jsonl(sourcePath)) {
  if (!row.ingredients_raw && !row.nutriments_json) continue
  donors.push({ source: 'kdv_group', id: row.sourceId, name: `${row.name} ${row.package_quantity_raw || ''}`.trim(), ean: null, fields: {
    ingredients: Boolean(row.ingredients_raw), fullNutrition: fullNutrition(row.nutriments_json),
  }, sourceUrl: row.sourceUrl })
}
const index = buildCandidateIndex(donors)
const output = fs.createWriteStream(outputPath, 'utf8')
const summary = { targetsWithGaps: 0, targetsWithCandidate: 0, targetsWithConflictFreeCandidate: 0, candidatePairs: 0, manufacturerProducts: donors.length }
for await (const target of jsonl(masterPath)) {
  if (!target.image_url || /empty_photo\.svg/i.test(target.image_url) || ['household', 'personal_care'].includes(target.category)) continue
  const missingIngredients = !target.ingredients_raw || !String(target.ingredients_raw).trim()
  const missingFullNutrition = !fullNutrition(target.nutriments_json)
  if (!missingIngredients && !missingFullNutrition) continue
  summary.targetsWithGaps++
  const matches = findCandidates(index, target, { limit: 5 })
    .filter(match => match.score >= 0.2 && ((missingIngredients && match.donor.fields.ingredients) || (missingFullNutrition && match.donor.fields.fullNutrition)))
    .map(match => ({ sourceId: match.donor.id, sourceUrl: match.donor.sourceUrl, sourceName: match.donor.name, score: Number(match.score.toFixed(3)), conflicts: match.conflicts, fields: match.donor.fields, verified: false }))
  if (!matches.length) continue
  summary.targetsWithCandidate++
  if (matches.some(match => !match.conflicts.length)) summary.targetsWithConflictFreeCandidate++
  summary.candidatePairs += matches.length
  output.write(`${JSON.stringify({ ean: String(target.ean), targetName: target.name, missingIngredients, missingFullNutrition, candidates: matches })}\n`)
}
output.end()
await finished(output)
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary))
