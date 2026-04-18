/**
 * KORSET — Kaspi EAN Enrichment
 * Matches Kaspi products to EAN codes using cascade:
 *   1. Our global_products DB (Supabase) — brand + name fuzzy match
 *   2. Mark as needs_ean=true if no match found
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

const DATA_DIR = path.join(__dirname, '..', 'data', 'kaspi')
const MIN_MATCH_SCORE = 0.4

const BRAND_ALIASES = {
  'KINDER': ['Kinder', 'Kinder Inc'],
  'Milka': ['Milka'],
  'Ritter Sport': ['Ritter Sport', 'Ritter'],
  'Bucheron': ['Bucheron'],
  'Schogetten': ['Schogetten'],
  'Nestlé': ['Nestle', 'Nestlé', 'Nestle nesquick'],
  'TOBLERONE': ['Toblerone'],
  'Alpen Gold': ['Alpen Gold', 'Alpengold'],
  'Спартак': ['Spartak', 'Спартак'],
  'Победа': ['Pobeda', 'Победа'],
  'Cadbury': ['Cadbury', 'cadbury'],
  'KitKat': ['KitKat', 'Kitkat'],
  'KDV': ['KDV'],
  'O`Zera': ['OZera', 'O`Zera'],
  'LION': ['Lion', 'LION'],
  'Hershey': ['Hershey', 'Hersheys'],
  'Feastables': ['Feastables'],
  'Babyfox': ['Babyfox'],
  'Chokodelika': ['Chokodelika'],
  'Nestlé': ['Nestle', 'Nestlé'],
  'Lotte': ['Lotte', 'LOTTE E&M'],
  "Reese's": ["Reese", "Reese's"],
  'CALLEBAUT': ['Callebaut', 'CALLEBAUT'],
}

const BRAND_TO_DB = {}
for (const [k, v] of Object.entries(BRAND_ALIASES)) {
  BRAND_TO_DB[k.toLowerCase()] = v.map(b => b.toLowerCase())
}

function normalize(text) {
  if (!text) return ''
  return String(text).toLowerCase()
    .replace(/[''`´]/g, '')
    .replace(/[^a-zа-яё0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function tokens(text) {
  const stop = new Set(['the','a','an','and','or','with','in','of','for','from','на','в','с','из','для','и','г','мл','шт','шоколадная','шоколадный','шоколад','плитка','батончик','порционный'])
  return normalize(text).split(/\s+/).filter(t => t.length > 1 && !stop.has(t))
}

function similarity(t1, t2) {
  if (!t1.length || !t2.length) return 0
  const s2 = new Set(t2)
  return t1.filter(t => s2.has(t)).length / Math.max(t1.length, t2.length)
}

function findBestMatch(product, dbProducts) {
  const brand = (product.brand || '').toLowerCase()
  const dbBrands = BRAND_TO_DB[brand] || [brand]
  const nameTokens = tokens(product.name)
  const weight = parseFloat(product.weight) || null

  let best = null, bestScore = 0

  for (const db of dbProducts) {
    const dbBrand = (db.brand || '').toLowerCase()
    if (!dbBrands.some(b => dbBrand.includes(b) || b.includes(dbBrand))) continue

    let score = Math.max(
      similarity(nameTokens, tokens(db.name)),
      similarity(nameTokens, tokens(db.name_kz)),
    )

    if (weight && db.quantity) {
      const dbW = parseFloat(db.quantity)
      if (dbW && Math.abs(dbW - weight) < 5) score = Math.min(1, score + 0.15)
    }

    if (score > bestScore) { bestScore = score; best = db }
  }

  return bestScore >= MIN_MATCH_SCORE
    ? { ean: best.ean, score: bestScore, dbName: best.name, source: 'our_db' }
    : null
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { category: null, resume: false }
  for (const arg of args) {
    if (arg.startsWith('--category=')) result.category = arg.split('=')[1]
    else if (arg === '--resume') result.resume = true
  }
  return result
}

async function main() {
  const opts = parseArgs()
  if (!opts.category) { console.error('Usage: node kaspi-enrich-eans.cjs --category="Chocolate bars"'); process.exit(1) }

  const catMap = { 'Chocolate bars': '01_chocolate-bars' }
  const catFile = catMap[opts.category] || opts.category.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const rawFile = path.join(DATA_DIR, `${catFile}_raw.json`)
  const outFile = path.join(DATA_DIR, `${catFile}_enriched.json`)

  if (!fs.existsSync(rawFile)) { console.error('Run kaspi-download.cjs first'); process.exit(1) }

  const rawData = JSON.parse(fs.readFileSync(rawFile, 'utf8'))
  const products = rawData.products || []

  let existing = [], enrichedCodes = new Set()
  if (opts.resume && fs.existsSync(outFile)) {
    existing = JSON.parse(fs.readFileSync(outFile, 'utf8')).products || []
    enrichedCodes = new Set(existing.map(p => p.kaspiCode))
  }

  console.log(`\n=== Kaspi EAN Enrichment: ${opts.category} ===`)
  console.log(`Total: ${products.length}, Already: ${existing.length}`)

  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const dbProducts = []
  let offset = 0
  while (true) {
    const { data } = await sb.from('global_products').select('ean,brand,name,name_kz,quantity,image_url').eq('is_active', true).range(offset, offset + 499)
    if (!data?.length) break
    dbProducts.push(...data)
    offset += 500
  }
  console.log(`DB products loaded: ${dbProducts.length}`)

  const toEnrich = products.filter(p => !enrichedCodes.has(p.kaspiCode) && !p.error)
  const allEnriched = [...existing]
  let matched = 0, notMatched = 0

  for (const product of toEnrich) {
    const match = findBestMatch(product, dbProducts)
    if (match) {
      matched++
    } else {
      notMatched++
    }
    allEnriched.push({
      ...product,
      ean: match?.ean || null,
      eanMatchScore: match?.score || null,
      eanMatchSource: match?.source || null,
      needsEan: !match,
    })
  }

  const result = { category: opts.category, enrichedAt: new Date().toISOString(), total: products.length, enriched: allEnriched.length, matched, notMatched, products: allEnriched }
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2))

  console.log(`\n=== Done! ===`)
  console.log(`Total: ${allEnriched.length}`)
  console.log(`DB matches: ${matched} (${(matched / allEnriched.length * 100).toFixed(1)}%)`)
  console.log(`No match: ${notMatched} (${(notMatched / allEnriched.length * 100).toFixed(1)}%)`)
  console.log(`Saved: ${outFile}`)
}

main()
