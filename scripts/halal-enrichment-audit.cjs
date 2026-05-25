const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const { pathToFileURL } = require('url')

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const APPLY = process.argv.includes('--apply')
const PAGE_SIZE = 1000
const REPORT_PATH = path.join(__dirname, '..', 'data', 'halal-enrichment-audit.json')

function loadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return []
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return []
  }
}

function normalizeForMatch(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[«»"“”'’]/g, ' ')
    .replace(/[^a-zа-яё0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildRegistryMatchers(sourceEntries) {
  const seen = new Set()
  const matchers = []
  for (const item of sourceEntries) {
    const candidates = [item?.name, item?.brand, item?.company, item?.title, item?.legal_name]
    for (const candidate of candidates) {
      const normalized = normalizeForMatch(candidate)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      matchers.push({
        raw: candidate,
        normalized,
        tokens: normalized.split(' ').filter(Boolean),
      })
    }
  }
  return matchers
}

function matchRegistry(brand, name, matchers) {
  const haystack = normalizeForMatch([brand, name].filter(Boolean).join(' '))
  if (!haystack) return []
  const hayTokens = new Set(haystack.split(' ').filter(Boolean))

  return matchers.filter((matcher) => {
    if (!matcher.normalized) return false
    if (haystack.includes(matcher.normalized)) return true
    if (matcher.normalized.includes(haystack) && haystack.length >= 4) return true
    const overlap = matcher.tokens.filter((token) => hayTokens.has(token)).length
    return overlap >= 2 || (overlap >= 1 && matcher.tokens.length === 1 && hayTokens.has(matcher.tokens[0]))
  })
}

async function fetchUnknownProducts() {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('ean, name, brand, ingredients_raw, halal_status, nutriments_json, source_primary, category, is_active')
      .or('halal_status.is.null,halal_status.eq.unknown')
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)
    from += PAGE_SIZE
    if (data.length < PAGE_SIZE) break
  }

  return rows
}

async function main() {
  const { classifyHalalEvidence } = await import(
    pathToFileURL(path.join(__dirname, '..', 'src', 'domain', 'product', 'halalEvidence.js')).href
  )

  const registryFiles = [
    path.join(__dirname, '..', 'data', 'halaldamu-registry-certified.json'),
    path.join(__dirname, '..', 'data', 'ahik-registry-enterprises.json'),
    path.join(__dirname, '..', 'data', 'halalinfo-registry.json'),
    path.join(__dirname, '..', 'data', 'halal-brand-matches-v3.json'),
  ]

  const registryEntries = registryFiles.flatMap((filePath) => loadJsonIfExists(filePath))
  const registryMatchers = buildRegistryMatchers(registryEntries)

  console.log('=== Halal Enrichment Audit ===')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Registry hints loaded: ${registryMatchers.length}\n`)

  const products = await fetchUnknownProducts()
  console.log(`Unknown/null halal products: ${products.length}\n`)

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    sourceFiles: registryFiles.filter((filePath) => fs.existsSync(filePath)).map((filePath) => path.basename(filePath)),
    totals: {
      scanned: products.length,
      yes: 0,
      no: 0,
      review: 0,
      unknown: 0,
      conflict: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
    },
    candidates: {
      yes: [],
      no: [],
      review: [],
      conflict: [],
    },
  }

  const yesUpdates = []
  const noUpdates = []

  for (const product of products) {
    const registryMatches = matchRegistry(product.brand, product.name, registryMatchers)
    const evidence = classifyHalalEvidence({
      halalStatus: product.halal_status,
      name: product.name,
      brand: product.brand,
      ingredients_raw: product.ingredients_raw,
      nutriments: product.nutriments_json,
      registryMatches,
    })

    report.totals[evidence.decision] = (report.totals[evidence.decision] || 0) + 1
    report.totals[`${evidence.confidence}Confidence`] += 1

    const entry = {
      ean: product.ean,
      name: product.name,
      brand: product.brand,
      sourcePrimary: product.source_primary,
      currentStatus: product.halal_status || 'unknown',
      decision: evidence.decision,
      confidence: evidence.confidence,
      signals: evidence.signals,
    }

    if (evidence.decision === 'yes' && evidence.confidence === 'high' && evidence.shouldPromote) {
      report.candidates.yes.push(entry)
      yesUpdates.push({ ean: product.ean, currentStatus: product.halal_status })
    } else if (evidence.decision === 'no' && evidence.confidence === 'high' && evidence.shouldPromote) {
      report.candidates.no.push(entry)
      noUpdates.push({ ean: product.ean, currentStatus: product.halal_status })
    } else if (evidence.decision === 'conflict') {
      report.candidates.conflict.push(entry)
    } else if (evidence.decision === 'review' || evidence.decision === 'unknown') {
      report.candidates.review.push(entry)
    }
  }

  const countSignal = (kind) =>
    report.candidates.yes.concat(report.candidates.no, report.candidates.review, report.candidates.conflict)
      .reduce((acc, item) => acc + (item.signals.some((s) => s.kind === kind) ? 1 : 0), 0)

  console.log(`Yes candidates: ${report.candidates.yes.length}`)
  console.log(`No candidates: ${report.candidates.no.length}`)
  console.log(`Review candidates: ${report.candidates.review.length}`)
  console.log(`Conflicts: ${report.candidates.conflict.length}`)
  console.log(`Registry-backed cases: ${countSignal('brand_registry')}`)
  console.log(`Text halal markers: ${countSignal('halal_text_marker')}`)
  console.log(`Clear no markers: ${countSignal('clear_no_marker')}`)
  console.log(`Ambiguous markers: ${countSignal('ambiguous_marker')}\n`)

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(`Report saved: ${REPORT_PATH}`)

  if (APPLY) {
    if (yesUpdates.length > 0) {
      console.log(`Applying yes updates: ${yesUpdates.length}`)
      const { error } = await sb
        .from('global_products')
        .update({ halal_status: 'yes' })
        .in('ean', yesUpdates.map((row) => row.ean))
        .or('halal_status.is.null,halal_status.eq.unknown')
      if (error) throw error
    }

    if (noUpdates.length > 0) {
      console.log(`Applying no updates: ${noUpdates.length}`)
      const { error } = await sb
        .from('global_products')
        .update({ halal_status: 'no' })
        .in('ean', noUpdates.map((row) => row.ean))
        .or('halal_status.is.null,halal_status.eq.unknown')
      if (error) throw error
    }

    console.log('\nApply complete.')
  } else {
    console.log('\nDry run complete. No DB changes made.')
  }
}

main().catch((error) => {
  console.error('Halal enrichment audit failed:', error)
  process.exitCode = 1
})
