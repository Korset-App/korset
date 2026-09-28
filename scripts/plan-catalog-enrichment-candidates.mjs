import fs from 'node:fs'
import crypto from 'node:crypto'
import readline from 'node:readline'
import { finished } from 'node:stream/promises'
import { buildCandidateIndex, findCandidates } from './utils/enrichmentCandidateSearch.mjs'

const sources = [
  { name: 'arbuz', path: 'data/arbuz_enriched_catalog.jsonl', jsonl: true, map: row => ({ source: 'arbuz', id: row.id, ean: row.ean, name: row.name, brand: row.brand, fields: ['ingredients_raw', 'nutriments_json', 'storage_conditions', 'producer_country', 'halal_status', 'price_kzt'].filter(key => row[key] != null && row[key] !== '') }) },
  { name: 'korzinavdom', path: 'data/korzinavdom_catalog_full.json', jsonl: false, map: row => ({ source: 'korzinavdom', id: row.quantumNumber, name: row.productName, brand: row.brand, fields: ['composition', 'storageConditions', 'shelfLife', 'country', 'options'].filter(key => row[key] != null && row[key] !== '') }) },
  { name: 'galmart', path: 'data/galmart_catalog.json', jsonl: false, map: row => ({ source: 'galmart', id: row.id, name: row.title, brand: row.brand, fields: ['composition', 'calories', 'protein', 'fat', 'carbs', 'country', 'price'].filter(key => row[key] != null && row[key] !== '') }) },
  { name: 'kdvonline', path: 'data/kdv_catalog.json', jsonl: false, map: row => ({ source: 'kdvonline', id: row.url || row.title, ean: /^\d{8,14}$/.test(String(row.barcode || '')) ? row.barcode : null, name: row.title, brand: row.brand, fields: ['composition', 'calories', 'protein', 'fat', 'carbs'].filter(key => row[key] != null && row[key] !== '') }) },
]
const masterPath = 'data/korset_master_catalog_v4_final.jsonl'
const outputPath = 'scratch/night-enrichment-candidates-20260927.jsonl'
const metaPath = 'scratch/night-enrichment-candidates-20260927-meta.json'
const summaryPath = 'scratch/night-enrichment-candidates-20260927-summary.json'
const version = 'candidate-retrieval-v1'

async function* jsonl(path) {
  const stream = fs.createReadStream(path, 'utf8')
  for await (const line of readline.createInterface({ input: stream, crlfDelay: Infinity })) {
    if (line.trim()) yield JSON.parse(line)
  }
}

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')
}

const inputHashes = Object.fromEntries([masterPath, ...sources.map(source => source.path)].map(path => [path, sha256(path)]))
const expectedMeta = { version, inputHashes, target: 'local V4 photo rows except household and personal_care; candidate search only' }
if (fs.existsSync(metaPath)) {
  const old = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  if (JSON.stringify(old) !== JSON.stringify(expectedMeta)) throw new Error('Input files or candidate rules changed; use a new output version')
} else {
  if (fs.existsSync(outputPath)) throw new Error('Candidate output exists without input manifest')
  fs.writeFileSync(metaPath, `${JSON.stringify(expectedMeta, null, 2)}\n`)
}

const donors = []
for (const source of sources) {
  if (source.jsonl) {
    for await (const row of jsonl(source.path)) donors.push(source.map(row))
  } else {
    for (const row of JSON.parse(fs.readFileSync(source.path, 'utf8'))) donors.push(source.map(row))
  }
}
const index = buildCandidateIndex(donors)
const completed = new Set()
if (fs.existsSync(outputPath)) {
  for await (const row of jsonl(outputPath)) completed.add(String(row.ean))
}
const output = fs.createWriteStream(outputPath, { flags: 'a', encoding: 'utf8' })
let added = 0
for await (const row of jsonl(masterPath)) {
  if (!row.image_url || /empty_photo\.svg/i.test(row.image_url) || ['household', 'personal_care'].includes(row.category)) continue
  const ean = String(row.ean)
  if (completed.has(ean)) continue
  const candidates = findCandidates(index, row, { limit: 5 }).map(({ donor, matchRoute, score, conflicts }) => ({ source: donor.source, id: donor.id, name: donor.name, ean: donor.ean || null, fields: donor.fields, route: matchRoute, score: Number(score.toFixed(3)), conflicts }))
  if (!output.write(`${JSON.stringify({ ean, candidates })}\n`)) await new Promise(resolve => output.once('drain', resolve))
  added++
}
output.end()
await finished(output)

const summary = { generatedAt: new Date().toISOString(), version, sourceRows: donors.length, indexedDonors: index.size, targets: 0, noCandidate: 0, withCandidate: 0, exactEanTop: 0, textTop: 0, topConflict: 0, resumedTargets: completed.size, addedTargets: added }
for await (const row of jsonl(outputPath)) {
  summary.targets++
  if (!row.candidates.length) summary.noCandidate++
  else {
    summary.withCandidate++
    if (row.candidates[0].route === 'ean') summary.exactEanTop++
    else summary.textTop++
    if (row.candidates[0].conflicts.length) summary.topConflict++
  }
}
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary))
