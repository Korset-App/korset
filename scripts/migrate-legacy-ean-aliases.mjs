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
    batchSize: 250,
    sampleLimit: 30,
    limitProducts: 0,
    live: false,
    updateExisting: false,
  }
  for (const arg of args) {
    if (arg === '--live') options.live = true
    else if (arg === '--update-existing') options.updateExisting = true
    else if (arg.startsWith('--report=')) options.report = arg.slice('--report='.length)
    else if (arg.startsWith('--candidates=')) options.candidates = arg.slice('--candidates='.length)
    else if (arg.startsWith('--sample-limit=')) options.sampleLimit = Number(arg.slice('--sample-limit='.length)) || options.sampleLimit
    else if (arg.startsWith('--limit-products=')) options.limitProducts = Number(arg.slice('--limit-products='.length)) || 0
    else if (arg.startsWith('--batch-size=')) options.batchSize = Number(arg.slice('--batch-size='.length)) || options.batchSize
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

const STATUS_RANK = {
  review: 1,
  quarantined: 2,
}

function preferStricterCandidate(current, next) {
  const currentRank = STATUS_RANK[current.status] || 0
  const nextRank = STATUS_RANK[next.status] || 0
  return nextRank > currentRank ? next : current
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
  const candidateByKey = new Map()
  let duplicateCandidateRows = 0

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
        const key = rowKey(candidate)
        if (candidateByKey.has(key)) {
          duplicateCandidateRows += 1
          candidateByKey.set(key, preferStricterCandidate(candidateByKey.get(key), candidate))
        } else {
          candidateByKey.set(key, candidate)
        }
        addSample(samples, classification.status, sample, options.sampleLimit)
      } else {
        stats.skippedRows += 1
        addSample(samples, `skipped_${classification.status}`, sample, options.sampleLimit)
      }
    }
  }

  const candidateRows = [...candidateByKey.values()]

  return {
    stats: {
      ...stats,
      insertableUniqueRows: candidateRows.length,
      duplicateCandidateRows,
      topFlags: topEntries(stats.byFlag, 30),
      topCategories: topEntries(stats.byCategory, 20),
      topBrands: topEntries(stats.byBrand, 30),
    },
    samples,
    candidateRows,
    candidateLines: candidateRows.map((candidate) => JSON.stringify(candidate)),
  }
}

function rowKey(row) {
  return `${row.ean}::${row.global_product_id}`
}

async function splitExistingAliasRows(sb, rows) {
  if (!rows.length) return { newRows: [], existingRows: [] }
  const eans = [...new Set(rows.map((row) => row.ean))]
  const { data, error } = await sb
    .from('product_ean_aliases')
    .select('id,ean,global_product_id')
    .in('ean', eans)
    .eq('is_active', true)
  if (error) throw new Error(`existing alias check failed: ${error.message}`)
  const existingByKey = new Map((data || []).map((row) => [rowKey(row), row]))
  const newRows = []
  const existingRows = []
  for (const row of rows) {
    const existing = existingByKey.get(rowKey(row))
    if (existing) existingRows.push({ ...row, id: existing.id })
    else newRows.push(row)
  }
  return { newRows, existingRows }
}

async function updateExistingAliasRows(sb, rows) {
  let updated = 0
  for (const row of rows) {
    const { id, ...payload } = row
    const { error } = await sb.from('product_ean_aliases').update(payload).eq('id', id)
    if (error) throw new Error(`existing alias update failed for ${row.ean}: ${error.message}`)
    updated += 1
  }
  return updated
}

async function insertCandidateRows(sb, rows, { batchSize, updateExisting }) {
  const result = {
    attempted: rows.length,
    inserted: 0,
    updatedExisting: 0,
    skippedExisting: 0,
    batches: 0,
  }

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize)
    const { newRows, existingRows } = await splitExistingAliasRows(sb, batch)

    if (existingRows.length > 0 && updateExisting) {
      result.updatedExisting += await updateExistingAliasRows(sb, existingRows)
    } else {
      result.skippedExisting += existingRows.length
    }

    if (newRows.length > 0) {
      const { error } = await sb.from('product_ean_aliases').insert(newRows)
      if (error) {
        throw new Error(`insert batch ${offset + 1}-${offset + newRows.length} failed: ${error.message}`)
      }
      result.inserted += newRows.length
    }

    result.batches += 1
    if (result.batches % 20 === 0 || offset + batchSize >= rows.length) {
      console.log(
        `  Insert progress: ${Math.min(offset + batchSize, rows.length)}/${rows.length} (inserted ${result.inserted}, updated existing ${result.updatedExisting}, skipped existing ${result.skippedExisting})`
      )
    }
  }

  return result
}

async function main() {
  const options = parseArgs()
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
  let liveInsertResult = null

  if (options.live) {
    const trustedCandidates = result.candidateRows.filter((row) => row.status === 'trusted')
    if (trustedCandidates.length > 0) {
      throw new Error('Refusing live write: legacy dry-run produced trusted candidates unexpectedly')
    }
    console.log('Live writes: enabled for review/quarantined evidence rows only')
    liveInsertResult = await insertCandidateRows(sb, result.candidateRows, {
      batchSize: options.batchSize,
      updateExisting: options.updateExisting,
    })
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: options.live ? 'live' : 'dry_run',
    liveWritesEnabled: options.live,
    currentProductEanAliasRows: count,
    liveInsertResult,
    reportPath: options.report,
    candidatesPath: options.candidates,
    summary: result.stats,
    samples: result.samples,
    notes: {
      trustedPolicy:
        'Legacy alternate_eans are never promoted directly to trusted in this dry-run because they lack per-alias source/evidence.',
      nextStep: options.live
        ? 'Verify live status counts before proceeding to Stage 4 or correction tooling.'
        : 'Review status counts and samples before running --live.',
    },
  }

  fs.mkdirSync(path.dirname(options.report), { recursive: true })
  fs.mkdirSync(path.dirname(options.candidates), { recursive: true })
  fs.writeFileSync(options.report, JSON.stringify(report, null, 2), 'utf8')
  fs.writeFileSync(options.candidates, `${result.candidateLines.join('\n')}\n`, 'utf8')

  const pct = (value, total = result.stats.aliasRelations || 1) =>
    `${((value / total) * 100).toFixed(1)}%`

  console.log('=== LEGACY EAN ALIASES DRY RUN ===')
  console.log(`Live writes:                  ${options.live ? 'enabled' : 'disabled'}`)
  console.log(`Current product_ean_aliases:  ${count}`)
  console.log(`Active products:              ${result.stats.products}`)
  console.log(`Products with alternates:     ${result.stats.productsWithAlternates}`)
  console.log(`Alias relations:              ${result.stats.aliasRelations}`)
  console.log(`Unique alias codes:           ${result.stats.uniqueAliasCodes}`)
  console.log(`Insertable candidate rows:    ${result.stats.insertableRows} (${pct(result.stats.insertableRows)})`)
  console.log(`Unique candidate rows:        ${result.stats.insertableUniqueRows} (${pct(result.stats.insertableUniqueRows)})`)
  console.log(`Duplicate candidate rows:     ${result.stats.duplicateCandidateRows} (${pct(result.stats.duplicateCandidateRows)})`)
  console.log(`Skipped rows:                 ${result.stats.skippedRows} (${pct(result.stats.skippedRows)})`)
  if (liveInsertResult) {
    console.log('\n--- LIVE INSERT RESULT ---')
    console.log(`Attempted:                    ${liveInsertResult.attempted}`)
    console.log(`Inserted:                     ${liveInsertResult.inserted}`)
    console.log(`Updated existing:             ${liveInsertResult.updatedExisting}`)
    console.log(`Skipped existing:             ${liveInsertResult.skippedExisting}`)
    console.log(`Batches:                      ${liveInsertResult.batches}`)
  }
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
