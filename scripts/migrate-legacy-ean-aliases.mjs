#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { classifyLegacyEanAliasCandidate } from '../src/domain/product/eanAliasClassification.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PAGE_SIZE = 1000
const DEFAULT_REPORT_PATH = path.join('C:\\tmp', 'korset-ean-alias-migration-dry-run.json')
const DEFAULT_CANDIDATES_PATH = path.join('C:\\tmp', 'korset-ean-alias-candidates.jsonl')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    report: DEFAULT_REPORT_PATH,
    candidates: DEFAULT_CANDIDATES_PATH,
    sampleLimit: 30,
    limitProducts: 0,
    live: false,
  }
  for (const arg of args) {
    if (arg === '--live') options.live = true
    else if (arg.startsWith('--report=')) options.report = arg.slice('--report='.length)
    else if (arg.startsWith('--candidates=')) options.candidates = arg.slice('--candidates='.length)
    else if (arg.startsWith('--sample-limit=')) options.sampleLimit = Number(arg.slice('--sample-limit='.length)) || options.sampleLimit
    else if (arg.startsWith('--limit-products=')) options.limitProducts = Number(arg.slice('--limit-products='.length)) || 0
  }
  return options
}

function getAlternateEans(product) {
  if (!product?.alternate_eans) return []
  if (Array.isArray(product.alternate_eans)) return product.alternate_eans.filter(Boolean).map(String)
  if (typeof product.alternate_eans === 'string') {
    try {
      const parsed = JSON.parse(product.alternate_eans)
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []
    } catch {
      return []
    }
  }
  return []
}

function compactProduct(product) {
  return {
    id: product.id,
    ean: product.ean,
    name: product.name,
    brand: product.brand,
    category: product.category,
    subcategory: product.subcategory,
    quantity: product.quantity,
    sourcePrimary: product.source_primary || null,
    alternateEanCount: getAlternateEans(product).length,
  }
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount
}

function addSample(samples, key, item, limit) {
  if (!samples[key]) samples[key] = []
  if (samples[key].length < limit) samples[key].push(item)
}

function topEntries(map, limit = 25) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }))
}

async function fetchAllProducts(sb, limitProducts = 0) {
  const products = []
  let from = 0
  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await sb
      .from('global_products')
      .select('id,ean,name,brand,category,subcategory,quantity,source_primary,alternate_eans,is_active')
      .eq('is_active', true)
      .range(from, to)
    if (error) throw new Error(`global_products fetch failed: ${error.message}`)
    if (!data || data.length === 0) break
    products.push(...data)
    if (limitProducts > 0 && products.length >= limitProducts) return products.slice(0, limitProducts)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return products
}

function buildIndexes(products) {
  const primaryByEan = new Map()
  const ownersByAlias = new Map()
  for (const product of products) {
    if (product.ean) primaryByEan.set(String(product.ean), product)
    for (const alias of new Set(getAlternateEans(product))) {
      if (!ownersByAlias.has(alias)) ownersByAlias.set(alias, [])
      ownersByAlias.get(alias).push(product)
    }
  }
  return { primaryByEan, ownersByAlias }
}

function buildCandidateRow({ owner, alias, classification, primaryTarget, ownersForAlias }) {
  return {
    ean: classification.ean,
    global_product_id: owner.id,
    status: classification.status,
    source: classification.source,
    confidence: classification.confidence,
    evidence_json: {
      stage: 'stage3_legacy_alternate_eans_dry_run',
      flags: classification.flags,
      owner: compactProduct(owner),
      primaryTarget: primaryTarget ? compactProduct(primaryTarget) : null,
      duplicateOwnerCount: ownersForAlias.length,
      duplicateOwnerIds: ownersForAlias.map((product) => product.id),
    },
    is_active: true,
  }
}

function classifyProducts(products, options) {
  const indexes = buildIndexes(products)
  const stats = {
    products: products.length,
    productsWithAlternates: 0,
    aliasRelations: 0,
    uniqueAliasCodes: indexes.ownersByAlias.size,
    insertableRows: 0,
    skippedRows: 0,
    byStatus: {},
    byFlag: {},
    bySource: { legacy_alternate_eans: 0 },
    byCategory: {},
    byBrand: {},
  }
  const samples = {}
  const candidateLines = []

  for (const product of products) {
    const aliases = [...new Set(getAlternateEans(product))]
    if (aliases.length) stats.productsWithAlternates += 1
    for (const alias of aliases) {
      const ownersForAlias = indexes.ownersByAlias.get(alias) || []
      const primaryTarget = indexes.primaryByEan.get(String(alias)) || null
      const classification = classifyLegacyEanAliasCandidate({
        alias,
        owner: product,
        ownersForAlias,
        primaryTarget,
      })
      stats.aliasRelations += 1
      increment(stats.byStatus, classification.status)
      increment(stats.byCategory, product.category || 'unknown')
      increment(stats.byBrand, product.brand || 'unknown')
      for (const flag of classification.flags) increment(stats.byFlag, flag)

      const sample = {
        alias: String(alias),
        insertable: classification.insertable,
        status: classification.status,
        confidence: classification.confidence,
        flags: classification.flags,
        owner: compactProduct(product),
        primaryTarget: primaryTarget ? compactProduct(primaryTarget) : null,
        duplicateOwnerCount: ownersForAlias.length,
      }

      if (classification.insertable) {
        stats.insertableRows += 1
        increment(stats.bySource, classification.source)
        const candidate = buildCandidateRow({
          owner: product,
          alias,
          classification,
          primaryTarget,
          ownersForAlias,
        })
        candidateLines.push(JSON.stringify(candidate))
        addSample(samples, classification.status, sample, options.sampleLimit)
      } else {
        stats.skippedRows += 1
        addSample(samples, `skipped_${classification.status}`, sample, options.sampleLimit)
      }
    }
  }

  return {
    stats: {
      ...stats,
      topFlags: topEntries(stats.byFlag, 30),
      topCategories: topEntries(stats.byCategory, 20),
      topBrands: topEntries(stats.byBrand, 30),
    },
    samples,
    candidateLines,
  }
}

async function main() {
  const options = parseArgs()
  if (options.live) {
    throw new Error('Live writes are intentionally disabled in Stage 3 dry-run. Review the report first.')
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const { count, error: aliasCountError } = await sb
    .from('product_ean_aliases')
    .select('*', { count: 'exact', head: true })
  if (aliasCountError) throw new Error(`product_ean_aliases check failed: ${aliasCountError.message}`)

  const products = await fetchAllProducts(sb, options.limitProducts)
  const result = classifyProducts(products, options)

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'dry_run',
    liveWritesEnabled: false,
    currentProductEanAliasRows: count,
    reportPath: options.report,
    candidatesPath: options.candidates,
    summary: result.stats,
    samples: result.samples,
    notes: {
      trustedPolicy:
        'Legacy alternate_eans are never promoted directly to trusted in this dry-run because they lack per-alias source/evidence.',
      nextStep:
        'Review status counts and samples before implementing a separate --live writer or applying inserts.',
    },
  }

  fs.mkdirSync(path.dirname(options.report), { recursive: true })
  fs.mkdirSync(path.dirname(options.candidates), { recursive: true })
  fs.writeFileSync(options.report, JSON.stringify(report, null, 2), 'utf8')
  fs.writeFileSync(options.candidates, `${result.candidateLines.join('\n')}\n`, 'utf8')

  const pct = (value, total = result.stats.aliasRelations || 1) =>
    `${((value / total) * 100).toFixed(1)}%`

  console.log('=== LEGACY EAN ALIASES DRY RUN ===')
  console.log(`Live writes:                  disabled`)
  console.log(`Current product_ean_aliases:  ${count}`)
  console.log(`Active products:              ${result.stats.products}`)
  console.log(`Products with alternates:     ${result.stats.productsWithAlternates}`)
  console.log(`Alias relations:              ${result.stats.aliasRelations}`)
  console.log(`Unique alias codes:           ${result.stats.uniqueAliasCodes}`)
  console.log(`Insertable candidate rows:    ${result.stats.insertableRows} (${pct(result.stats.insertableRows)})`)
  console.log(`Skipped rows:                 ${result.stats.skippedRows} (${pct(result.stats.skippedRows)})`)
  console.log('\n--- STATUS COUNTS ---')
  for (const [status, value] of Object.entries(result.stats.byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`${status}: ${value} (${pct(value)})`)
  }
  console.log('\n--- TOP FLAGS ---')
  for (const item of result.stats.topFlags.slice(0, 12)) {
    console.log(`${item.key}: ${item.count}`)
  }
  console.log(`\nSaved report to ${options.report}`)
  console.log(`Saved candidate JSONL to ${options.candidates}`)
}

main().catch((error) => {
  console.error('Legacy EAN alias dry-run failed:', error.message || error)
  process.exit(1)
})
