import fs from 'node:fs'
import crypto from 'node:crypto'
import readline from 'node:readline'
import { finished } from 'node:stream/promises'
import { buildCandidateIndex, findCandidates } from './utils/enrichmentCandidateSearch.mjs'

const masterPath = 'data/korset_master_catalog_v4_final.jsonl'
const sources = [
  ['kdv_group', 'scratch/kdv-group-night/food-products-derived.jsonl'],
  ['foodmaster_official', 'scratch/foodmaster-night/products-derived.jsonl'],
  ['rakhat_official', 'scratch/rakhat-night/products-derived.jsonl'],
]
const outputPath = 'scratch/official-manufacturer-review-candidates.jsonl'

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

const flags = new Set()
for (const [name] of sources) {
  const prefix = name === 'kdv_group' ? 'kdv' : name === 'foodmaster_official' ? 'foodmaster' : 'rakhat'
  for await (const row of rows(`scratch/${prefix}-manufacturer-quality-flags.jsonl`)) flags.add(`${name}:${row.sourceId}`)
}
const donors = []
for (const [source, file] of sources) {
  for await (const row of rows(file)) {
    const name = source === 'rakhat_official' ? `Рахат ${row.name}`
      : `${row.name} ${row.package_quantity_suspect ? '' : row.package_quantity_raw || ''}`.trim()
    donors.push({ source, id: row.sourceId, name, brand: source === 'rakhat_official' ? 'Рахат' : null,
      sourceUrl: row.sourceUrl, ingredients: Boolean(row.ingredients_raw), nutrition: fullNutrition(row.nutriments_json), nutritionFlagged: flags.has(`${source}:${row.sourceId}`) })
  }
}
const index = buildCandidateIndex(donors)
const output = fs.createWriteStream(outputPath, 'utf8')
const summary = { targetFoodWithPhoto: 0, targetsWithCoreGap: 0, targetsWithCandidate: 0, targetsWithoutCandidate: 0, targetsWithConflictFreeCandidate: 0, candidatePairs: 0, byTopSource: {}, sources: Object.fromEntries(sources.map(([name, file]) => [name, { rows: donors.filter(donor => donor.source === name).length, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }])) }
for await (const target of rows(masterPath)) {
  if (!target.image_url || /empty_photo\.svg/i.test(target.image_url) || ['household', 'personal_care'].includes(target.category)) continue
  summary.targetFoodWithPhoto++
  const missingIngredients = !target.ingredients_raw || !String(target.ingredients_raw).trim()
  const missingFullNutrition = !fullNutrition(target.nutriments_json)
  if (!missingIngredients && !missingFullNutrition) continue
  summary.targetsWithCoreGap++
  const candidates = findCandidates(index, target, { limit: 5 })
    .filter(candidate => candidate.score >= 0.2 && (missingIngredients && candidate.donor.ingredients || missingFullNutrition && candidate.donor.nutrition))
    .map(candidate => ({ source: candidate.donor.source, sourceId: candidate.donor.id, sourceName: candidate.donor.name, sourceUrl: candidate.donor.sourceUrl, score: Number(candidate.score.toFixed(3)), conflicts: candidate.conflicts, hasIngredients: candidate.donor.ingredients, hasFullNumericNutrition: candidate.donor.nutrition, nutritionFlagged: candidate.donor.nutritionFlagged, identityVerified: false }))
  if (candidates.length) {
    summary.targetsWithCandidate++
    summary.candidatePairs += candidates.length
    if (candidates.some(candidate => !candidate.conflicts.length)) summary.targetsWithConflictFreeCandidate++
    summary.byTopSource[candidates[0].source] = (summary.byTopSource[candidates[0].source] || 0) + 1
  } else summary.targetsWithoutCandidate++
  output.write(`${JSON.stringify({ ean: String(target.ean), targetName: target.name, missingIngredients, missingFullNutrition, candidates })}\n`)
}
output.end()
await finished(output)
fs.writeFileSync('scratch/official-manufacturer-review-summary.json', `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary))
