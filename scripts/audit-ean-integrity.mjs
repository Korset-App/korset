#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { parseQuantityTokens } from '../src/utils/parseQuantity.js'

const require = createRequire(import.meta.url)
const { classifyBarcode } = require('./validate-ean.cjs')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PAGE_SIZE = 1000
const DEFAULT_OUT_PATH = 'C:\\tmp\\korset-ean-integrity-audit.json'

const FAKE_EAN_PREFIXES = ['arbuz_', 'kaspi_', 'korzinavdom_']
const HIGH_RISK_CATEGORY_KEYS = ['dairy', 'milk', 'sauce', 'mayonnaise', 'baby', 'sweets']
const STOP_WORDS = new Set([
  'и',
  'с',
  'со',
  'в',
  'на',
  'для',
  'без',
  'из',
  'шт',
  'штука',
  'г',
  'гр',
  'кг',
  'мл',
  'л',
  'продукт',
  'товар',
])

const FLAVOR_HINTS = [
  'ванил',
  'шоколад',
  'клубник',
  'банан',
  'карамел',
  'персик',
  'яблок',
  'вишн',
  'малин',
  'лимон',
  'апельсин',
  'манго',
  'кокос',
  'орех',
  'фундук',
  'миндал',
  'гриб',
  'сырн',
  'томат',
  'чили',
  'остр',
  'чеснок',
  'зелень',
  'перепел',
  'оливк',
  'сметан',
  'классич',
  'провансаль',
]

const PACKAGING_HINTS = [
  ['tub', ['ведро', 'ведер', 'контейнер', 'пл/б', 'пластиковый контейнер']],
  ['pouch', ['дой', 'д/п', 'пакет', 'м/у', 'мягк', 'пачка', 'п/б']],
  ['bottle_plastic', ['пэт', 'бутыл', 'пет']],
  ['bottle_glass', ['стекло', 'стеклян']],
  ['can', ['ж/б', 'жб', 'банка', 'консерв']],
  ['tetrapak', ['тба', 'т/б', 'тетра', 'tetra']],
]

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { out: DEFAULT_OUT_PATH, sampleLimit: 25 }
  for (const arg of args) {
    if (arg.startsWith('--out=')) result.out = arg.slice('--out='.length)
    if (arg.startsWith('--sample-limit=')) {
      const parsed = Number(arg.slice('--sample-limit='.length))
      if (Number.isFinite(parsed) && parsed > 0) result.sampleLimit = parsed
    }
  }
  return result
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"“”'`]/g, ' ')
    .replace(/[^\p{L}\p{N}%]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeBrand(value) {
  return normalizeText(value).replace(/\s+/g, '') || null
}

function compactProduct(row) {
  return {
    id: row.id,
    ean: row.ean,
    name: row.name,
    brand: row.brand,
    category: row.category,
    subcategory: row.subcategory,
    quantity: row.quantity,
    packagingType: row.packaging_type || null,
    fatPercent: row.fat_percent ?? null,
    sourcePrimary: row.source_primary || null,
    alternateEanCount: getAlternateEans(row).length,
  }
}

function getAlternateEans(row) {
  if (!row?.alternate_eans) return []
  if (Array.isArray(row.alternate_eans)) return row.alternate_eans.filter(Boolean).map(String)
  if (typeof row.alternate_eans === 'string') {
    try {
      const parsed = JSON.parse(row.alternate_eans)
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []
    } catch {
      return []
    }
  }
  return []
}

function isFakeEan(ean) {
  const value = String(ean || '')
  return FAKE_EAN_PREFIXES.some((prefix) => value.startsWith(prefix))
}

function isRestrictedPrefix(ean) {
  const prefix = String(ean || '').slice(0, 3)
  return (prefix >= '020' && prefix <= '029') || (prefix >= '040' && prefix <= '049') || (prefix >= '200' && prefix <= '299')
}

function barcodeInfo(ean) {
  if (!ean) return { valid: false, kind: 'empty' }
  if (isFakeEan(ean)) return { valid: false, kind: 'fake_source_id' }
  const info = classifyBarcode(ean)
  const prefix = String(info.ean13 || ean).slice(0, 3)
  return {
    ...info,
    kind: info.valid ? 'barcode' : info.type || 'invalid',
    prefix,
    restricted: info.valid && isRestrictedPrefix(info.ean13 || ean),
  }
}

function productText(product) {
  return [product?.brand, product?.name, product?.quantity].filter(Boolean).join(' ')
}

function extractQuantity(product) {
  const text = [product?.quantity, product?.name].filter(Boolean).join(' ')
  const tokens = parseQuantityTokens(text) || []
  const primary = tokens.find((item) => item.unitType === 'weight' || item.unitType === 'volume')
  if (!primary) return null
  let gramsOrMl = primary.value
  if (primary.unit === 'кг' || primary.unit === 'л') gramsOrMl = primary.value * 1000
  return {
    value: primary.value,
    unit: primary.unit,
    unitType: primary.unitType,
    normalized: Number.isFinite(gramsOrMl) ? gramsOrMl : null,
  }
}

function extractPackaging(product) {
  if (product?.packaging_type) return product.packaging_type
  const text = normalizeText(productText(product))
  for (const [key, hints] of PACKAGING_HINTS) {
    if (hints.some((hint) => text.includes(hint))) return key
  }
  return null
}

function extractFat(product) {
  if (product?.fat_percent != null && product.fat_percent !== '') return Number(product.fat_percent)
  const text = productText(product)
  const match = text.match(/(\d{1,2}[,.]?\d?)\s*%/)
  if (!match) return null
  const value = Number(match[1].replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function extractFlavorSet(product) {
  const text = normalizeText(productText(product))
  const found = FLAVOR_HINTS.filter((hint) => text.includes(hint))
  return new Set(found)
}

function nameTokens(product) {
  const brand = normalizeBrand(product?.brand)
  const text = normalizeText(product?.name)
  return text
    .split(' ')
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => token !== brand)
    .filter((token) => !/^\d+$/.test(token))
}

function tokenSimilarity(a, b) {
  const aTokens = new Set(nameTokens(a))
  const bTokens = new Set(nameTokens(b))
  if (!aTokens.size || !bTokens.size) return 0
  let shared = 0
  for (const token of aTokens) if (bTokens.has(token)) shared++
  return shared / Math.max(aTokens.size, bTokens.size)
}

function compareIdentity(owner, target) {
  if (!target) return { hasTarget: false, flags: [], similarity: null }

  const flags = []
  const ownerBrand = normalizeBrand(owner.brand)
  const targetBrand = normalizeBrand(target.brand)
  if (ownerBrand && targetBrand && ownerBrand !== targetBrand) flags.push('brand_mismatch')

  if (owner.category && target.category && owner.category !== target.category) flags.push('category_mismatch')
  if (owner.subcategory && target.subcategory && owner.subcategory !== target.subcategory) {
    flags.push('subcategory_mismatch')
  }

  const ownerQty = extractQuantity(owner)
  const targetQty = extractQuantity(target)
  if (ownerQty && targetQty) {
    if (ownerQty.unitType !== targetQty.unitType) {
      flags.push('quantity_unit_type_mismatch')
    } else if (
      ownerQty.normalized != null &&
      targetQty.normalized != null &&
      Math.abs(ownerQty.normalized - targetQty.normalized) > 0.01
    ) {
      flags.push('quantity_mismatch')
    }
  }

  const ownerFat = extractFat(owner)
  const targetFat = extractFat(target)
  if (ownerFat != null && targetFat != null && Math.abs(ownerFat - targetFat) > 0.01) {
    flags.push('fat_percent_mismatch')
  }

  const ownerPack = extractPackaging(owner)
  const targetPack = extractPackaging(target)
  if (ownerPack && targetPack && ownerPack !== targetPack) flags.push('packaging_mismatch')

  const ownerFlavors = extractFlavorSet(owner)
  const targetFlavors = extractFlavorSet(target)
  if (ownerFlavors.size && targetFlavors.size) {
    const shared = [...ownerFlavors].filter((item) => targetFlavors.has(item))
    if (shared.length === 0) flags.push('flavor_variant_mismatch')
  }

  const similarity = tokenSimilarity(owner, target)
  if (similarity > 0 && similarity < 0.35) flags.push('low_name_similarity')

  return { hasTarget: true, flags, similarity }
}

function severityForAlias({ alias, owner, owners, target, barcode, identity }) {
  const flags = []
  if (!barcode.valid) flags.push(barcode.kind === 'fake_source_id' ? 'fake_alias' : 'invalid_alias')
  if (barcode.restricted) flags.push('restricted_or_weight_scale_alias')
  if (alias === owner.ean) flags.push('self_alias')
  if (owners.length > 1) flags.push('alias_used_by_multiple_products')
  if (target && target.id !== owner.id) flags.push('alias_is_another_primary_ean')
  if (getAlternateEans(owner).length > 10) flags.push('owner_has_many_alternates')
  flags.push(...identity.flags)

  const criticalFlags = new Set([
    'alias_used_by_multiple_products',
    'alias_is_another_primary_ean',
    'brand_mismatch',
    'category_mismatch',
    'subcategory_mismatch',
    'quantity_unit_type_mismatch',
    'quantity_mismatch',
    'fat_percent_mismatch',
    'packaging_mismatch',
    'flavor_variant_mismatch',
  ])
  const suspiciousFlags = new Set([
    'restricted_or_weight_scale_alias',
    'fake_alias',
    'invalid_alias',
    'self_alias',
    'owner_has_many_alternates',
    'low_name_similarity',
  ])

  let severity = 'review'
  if (flags.some((flag) => criticalFlags.has(flag))) severity = 'critical'
  else if (flags.some((flag) => suspiciousFlags.has(flag))) severity = 'suspicious'
  else if (barcode.valid && !target && owners.length === 1 && getAlternateEans(owner).length <= 3) {
    severity = 'provisionally_safe'
  }

  return { severity, flags: [...new Set(flags)] }
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount
}

function addSample(list, item, limit) {
  if (list.length < limit) list.push(item)
}

function topEntries(object, limit = 20) {
  return Object.entries(object)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }))
}

async function fetchAll(sb, table, select, applyFilters = (query) => query) {
  const rows = []
  let from = 0
  while (true) {
    let query = sb.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    query = applyFilters(query)
    const { data, error } = await query
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

function buildAliasIndexes(products) {
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

function analyzeGlobalAliases(products, indexes, sampleLimit) {
  const stats = {
    totalAliasRelations: 0,
    uniqueAliasCodes: indexes.ownersByAlias.size,
    bySeverity: {},
    byFlag: {},
    byBrand: {},
    byCategory: {},
    byBarcodeKind: {},
    productsWithAlternates: 0,
    productsWithAltOver3: 0,
    productsWithAltOver10: 0,
    productsWithAltOver25: 0,
    fakePrimaryEans: 0,
    primaryAliasSelfRefs: 0,
    samples: {
      critical: [],
      suspicious: [],
      provisionallySafe: [],
      threeZhelaniya: [],
      milk: [],
      hugeAlternateLists: [],
    },
  }

  for (const product of products) {
    const aliases = getAlternateEans(product)
    if (aliases.length) stats.productsWithAlternates += 1
    if (aliases.length > 3) stats.productsWithAltOver3 += 1
    if (aliases.length > 10) stats.productsWithAltOver10 += 1
    if (aliases.length > 25) stats.productsWithAltOver25 += 1
    if (isFakeEan(product.ean)) stats.fakePrimaryEans += 1
    if (aliases.includes(product.ean)) stats.primaryAliasSelfRefs += 1

    if (aliases.length >= 25) {
      addSample(
        stats.samples.hugeAlternateLists,
        {
          product: compactProduct(product),
          firstAliases: aliases.slice(0, 20),
        },
        sampleLimit
      )
    }
  }

  for (const [alias, owners] of indexes.ownersByAlias.entries()) {
    const barcode = barcodeInfo(alias)
    increment(stats.byBarcodeKind, barcode.kind)

    for (const owner of owners) {
      stats.totalAliasRelations += 1
      const target = indexes.primaryByEan.get(alias) || null
      const identity = compareIdentity(owner, target)
      const verdict = severityForAlias({ alias, owner, owners, target, barcode, identity })

      increment(stats.bySeverity, verdict.severity)
      increment(stats.byBrand, owner.brand || 'unknown')
      increment(stats.byCategory, owner.category || 'unknown')
      for (const flag of verdict.flags) increment(stats.byFlag, flag)

      const sample = {
        alias,
        severity: verdict.severity,
        flags: verdict.flags,
        barcode: {
          kind: barcode.kind,
          valid: Boolean(barcode.valid),
          prefix: barcode.prefix || null,
          restricted: Boolean(barcode.restricted),
          checksumOk: barcode.checksumOk ?? null,
        },
        owner: compactProduct(owner),
        primaryTarget: target ? compactProduct(target) : null,
        duplicateOwnerCount: owners.length,
        identitySimilarity: identity.similarity,
      }

      if (verdict.severity === 'critical') addSample(stats.samples.critical, sample, sampleLimit)
      if (verdict.severity === 'suspicious') addSample(stats.samples.suspicious, sample, sampleLimit)
      if (verdict.severity === 'provisionally_safe') {
        addSample(stats.samples.provisionallySafe, sample, sampleLimit)
      }

      const fullText = normalizeText(productText(owner))
      if (fullText.includes('3 желания') || fullText.includes('три желания')) {
        addSample(stats.samples.threeZhelaniya, sample, sampleLimit)
      }
      if (fullText.includes('молоко') || fullText.includes('молоч')) {
        addSample(stats.samples.milk, sample, sampleLimit)
      }
    }
  }

  stats.topFlags = topEntries(stats.byFlag, 30)
  stats.topBrandsByAliasRelations = topEntries(stats.byBrand, 30)
  stats.topCategoriesByAliasRelations = topEntries(stats.byCategory, 30)
  return stats
}

function analyzeStoreImpact(stores, storeProducts, indexes, sampleLimit) {
  const byStore = []
  const globalSummary = {
    activeStoreProducts: storeProducts.length,
    stores: stores.length,
    altCodesInAnyStore: 0,
    aliasPrimaryConflictsInSameStore: 0,
    aliasPrimaryConflictsOutsideStore: 0,
    duplicateAliasCodesInsideStores: 0,
  }

  const rowsByStore = new Map()
  for (const row of storeProducts) {
    if (!rowsByStore.has(row.store_id)) rowsByStore.set(row.store_id, [])
    rowsByStore.get(row.store_id).push(row)
  }

  for (const store of stores) {
    const rows = rowsByStore.get(store.id) || []
    const productIds = new Set(rows.map((row) => row.global_product_id).filter(Boolean))
    const aliasOwners = new Map()

    for (const row of rows) {
      const product = row.global_products
      if (!product) continue
      for (const alias of new Set(getAlternateEans(product))) {
        if (!aliasOwners.has(alias)) aliasOwners.set(alias, [])
        aliasOwners.get(alias).push({ row, product })
      }
    }

    let aliasPrimaryConflictsInSameStore = 0
    let aliasPrimaryConflictsOutsideStore = 0
    let duplicateAliasCodesInsideStore = 0
    let restrictedAliasCodes = 0
    const samples = {
      sameStorePrimaryConflicts: [],
      outsideStorePrimaryConflicts: [],
      duplicateAliases: [],
    }

    for (const [alias, owners] of aliasOwners.entries()) {
      const barcode = barcodeInfo(alias)
      if (barcode.restricted) restrictedAliasCodes += 1
      if (owners.length > 1) {
        duplicateAliasCodesInsideStore += 1
        addSample(
          samples.duplicateAliases,
          {
            alias,
            ownerCount: owners.length,
            owners: owners.slice(0, 8).map((item) => compactProduct(item.product)),
          },
          sampleLimit
        )
      }

      const target = indexes.primaryByEan.get(alias)
      if (!target) continue
      if (productIds.has(target.id)) {
        aliasPrimaryConflictsInSameStore += 1
        addSample(
          samples.sameStorePrimaryConflicts,
          {
            alias,
            primaryTarget: compactProduct(target),
            alternateOwners: owners.slice(0, 8).map((item) => compactProduct(item.product)),
          },
          sampleLimit
        )
      } else {
        aliasPrimaryConflictsOutsideStore += 1
        addSample(
          samples.outsideStorePrimaryConflicts,
          {
            alias,
            primaryTarget: compactProduct(target),
            alternateOwners: owners.slice(0, 8).map((item) => compactProduct(item.product)),
          },
          sampleLimit
        )
      }
    }

    globalSummary.altCodesInAnyStore += aliasOwners.size
    globalSummary.aliasPrimaryConflictsInSameStore += aliasPrimaryConflictsInSameStore
    globalSummary.aliasPrimaryConflictsOutsideStore += aliasPrimaryConflictsOutsideStore
    globalSummary.duplicateAliasCodesInsideStores += duplicateAliasCodesInsideStore

    byStore.push({
      store: { id: store.id, code: store.code, name: store.name },
      activeStoreProducts: rows.length,
      aliasCodesInStore: aliasOwners.size,
      duplicateAliasCodesInsideStore,
      aliasPrimaryConflictsInSameStore,
      aliasPrimaryConflictsOutsideStore,
      restrictedAliasCodes,
      samples,
    })
  }

  return { summary: globalSummary, byStore }
}

function analyzeHighRiskGroups(products, indexes) {
  const groups = {}
  for (const key of HIGH_RISK_CATEGORY_KEYS) {
    groups[key] = {
      products: 0,
      aliasRelations: 0,
      criticalAliasRelations: 0,
      duplicateAliasRelations: 0,
      primaryConflictRelations: 0,
    }
  }

  for (const product of products) {
    const text = normalizeText([product.name, product.brand, product.category, product.subcategory].join(' '))
    const keys = []
    if (text.includes('молоко') || text.includes('молоч') || text.includes('dairy')) keys.push('dairy', 'milk')
    if (text.includes('майонез') || text.includes('соус') || text.includes('кетчуп')) keys.push('sauce', 'mayonnaise')
    if (text.includes('детск') || text.includes('агуш') || text.includes('фрутонян')) keys.push('baby')
    if (text.includes('конфет') || text.includes('шоколад') || text.includes('батончик')) keys.push('sweets')

    for (const key of new Set(keys)) {
      const group = groups[key]
      group.products += 1
      const aliases = getAlternateEans(product)
      group.aliasRelations += aliases.length
      for (const alias of aliases) {
        const owners = indexes.ownersByAlias.get(alias) || []
        if (owners.length > 1) group.duplicateAliasRelations += 1
        const target = indexes.primaryByEan.get(alias)
        if (target && target.id !== product.id) group.primaryConflictRelations += 1
        if (owners.length > 1 || (target && target.id !== product.id)) group.criticalAliasRelations += 1
      }
    }
  }

  return groups
}

function buildExecutiveSummary({ products, globalAliases, storeImpact, highRiskGroups }) {
  const activeProducts = products.length
  const critical = globalAliases.bySeverity.critical || 0
  const suspicious = globalAliases.bySeverity.suspicious || 0
  const provisionallySafe = globalAliases.bySeverity.provisionally_safe || 0
  const review = globalAliases.bySeverity.review || 0
  const totalRelations = globalAliases.totalAliasRelations || 1
  const pollutedRatio = (critical + suspicious) / totalRelations
  const severityScore = Math.min(10, Math.max(1, Math.round(6 + pollutedRatio * 4)))

  return {
    activeProducts,
    totalAliasRelations: globalAliases.totalAliasRelations,
    uniqueAliasCodes: globalAliases.uniqueAliasCodes,
    productsWithAlternates: globalAliases.productsWithAlternates,
    criticalAliasRelations: critical,
    suspiciousAliasRelations: suspicious,
    reviewAliasRelations: review,
    provisionallySafeAliasRelations: provisionallySafe,
    pollutedAliasRelationRatio: Number(pollutedRatio.toFixed(4)),
    estimatedSeverityScore10: severityScore,
    storeImpact: storeImpact.summary,
    highRiskGroups,
    interpretation: {
      falseProductRisk: 'high',
      rootCause: 'alternate_eans contain broad search matches and conflicts, not only true same-SKU barcodes',
      immediateBusinessRisk: 'wrong scan result can corrupt trust in price, Fit-Check, halal/allergen guidance, and pilot demos',
      recoveryPotential: 'high if current aliases are quarantined and rebuilt with source/evidence/status gates',
    },
  }
}

async function main() {
  const options = parseArgs()
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const products = await fetchAll(
    sb,
    'global_products',
    [
      'id',
      'ean',
      'name',
      'brand',
      'category',
      'subcategory',
      'quantity',
      'packaging_type',
      'fat_percent',
      'source_primary',
      'data_quality_score',
      'alternate_eans',
      'is_active',
    ].join(','),
    (query) => query.eq('is_active', true)
  )

  const stores = await fetchAll(
    sb,
    'stores',
    'id,code,name,is_active',
    (query) => query.eq('is_active', true)
  )

  const storeProducts = await fetchAll(
    sb,
    'store_products',
    [
      'id',
      'ean',
      'store_id',
      'global_product_id',
      'is_active',
      'global_products!inner(id,ean,name,brand,category,subcategory,quantity,packaging_type,fat_percent,source_primary,alternate_eans,is_active)',
    ].join(','),
    (query) => query.eq('is_active', true).eq('global_products.is_active', true)
  )

  const indexes = buildAliasIndexes(products)
  const globalAliases = analyzeGlobalAliases(products, indexes, options.sampleLimit)
  const storeImpact = analyzeStoreImpact(stores, storeProducts, indexes, options.sampleLimit)
  const highRiskGroups = analyzeHighRiskGroups(products, indexes)
  const summary = buildExecutiveSummary({ products, globalAliases, storeImpact, highRiskGroups })

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'read_only',
    summary,
    globalAliases,
    storeImpact,
    highRiskGroups,
    methodology: {
      trustedLimitations:
        'Current alternate_eans do not store per-alias source/evidence, so the audit cannot prove true trusted aliases. It can identify conflicts, suspicious aliases, and provisionally safe candidates.',
      criticalSignals: [
        'alias used by multiple products',
        'alias is another product primary EAN',
        'brand/category/subcategory mismatch',
        'quantity/fat/package/flavor mismatch',
      ],
      suspiciousSignals: [
        'restricted or weight-scale prefix',
        'fake source ID alias',
        'invalid alias',
        'self alias',
        'owner has unusually many alternates',
        'low name similarity against primary target',
      ],
    },
  }

  fs.mkdirSync(path.dirname(options.out), { recursive: true })
  fs.writeFileSync(options.out, JSON.stringify(report, null, 2), 'utf8')

  const pct = (value, total = globalAliases.totalAliasRelations || 1) =>
    `${((value / total) * 100).toFixed(1)}%`

  console.log('=== EAN INTEGRITY AUDIT ===')
  console.log(`Mode:                         read-only`)
  console.log(`Active global products:       ${summary.activeProducts}`)
  console.log(`Products with alternates:     ${summary.productsWithAlternates}`)
  console.log(`Alias relations:              ${summary.totalAliasRelations}`)
  console.log(`Unique alias codes:           ${summary.uniqueAliasCodes}`)
  console.log(`Critical alias relations:     ${summary.criticalAliasRelations} (${pct(summary.criticalAliasRelations)})`)
  console.log(`Suspicious alias relations:   ${summary.suspiciousAliasRelations} (${pct(summary.suspiciousAliasRelations)})`)
  console.log(`Review alias relations:       ${summary.reviewAliasRelations} (${pct(summary.reviewAliasRelations)})`)
  console.log(`Provisionally safe relations: ${summary.provisionallySafeAliasRelations} (${pct(summary.provisionallySafeAliasRelations)})`)
  console.log(`Estimated severity /10:       ${summary.estimatedSeverityScore10}`)
  console.log('\n--- TOP FLAGS ---')
  for (const item of globalAliases.topFlags.slice(0, 12)) {
    console.log(`${item.key}: ${item.count}`)
  }
  console.log('\n--- STORE IMPACT ---')
  for (const store of storeImpact.byStore) {
    console.log(
      `${store.store.code}: products=${store.activeStoreProducts}, aliasCodes=${store.aliasCodesInStore}, duplicateAliases=${store.duplicateAliasCodesInsideStore}, sameStorePrimaryConflicts=${store.aliasPrimaryConflictsInSameStore}, outsideStorePrimaryConflicts=${store.aliasPrimaryConflictsOutsideStore}`
    )
  }
  console.log(`\nSaved report to ${options.out}`)
}

main().catch((error) => {
  console.error('EAN integrity audit failed:', error)
  process.exit(1)
})
