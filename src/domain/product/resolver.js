import localProducts from '../../data/products.json'
import { supabase } from '../../utils/supabase.js'
import { enrichProductAI } from '../../services/ai.js'
import { getGlobalProductByEan, getStoreCatalogProductByEan } from '../../utils/storeCatalog.js'
import { buildLocalScanHistoryEntry, appendLocalScanHistory, getCurrentHistoryOwnerKey } from '../../utils/localHistory.js'
import { loadPrivacySettings } from '../../utils/privacySettings.js'
import { getOrCreateDeviceId, getOrCreateSessionId, resolveCurrentInternalUserId } from '../../utils/userIdentity.js'
import { normalizeDemoProduct, normalizeGlobalProduct, normalizeCacheProduct, normalizeOFFProduct, coerceProductEntity } from './normalizers.js'
import { isUuid, parseRouteProductRef } from './model.js'

const demoProducts = localProducts.map(normalizeDemoProduct)
const demoById = new Map(demoProducts.map((product) => [product.demoId, product]))
const demoByEan = new Map(demoProducts.map((product) => [product.ean, product]))

export function getDemoProductById(id) {
  return id ? demoById.get(id) || null : null
}

export function getDemoProductByEan(ean) {
  return ean ? demoByEan.get(String(ean)) || null : null
}

export function getAllDemoProducts() {
  return demoProducts.slice()
}

export function getDemoProductForEntity(product) {
  if (!product) return null
  return getDemoProductById(product.demoId || product.id) || getDemoProductByEan(product.ean) || null
}

async function findStoreProduct(ean, storeId) {
  try {
    let query = supabase
      .from('store_products')
      .select('id, ean, price_kzt, shelf_zone, shelf_position, local_name, local_sku, stock_status, global_product_id, store_id, is_active')
      .eq('ean', ean)
      .eq('is_active', true)

    if (storeId) query = query.eq('store_id', storeId)

    const { data, error } = await query.maybeSingle()
    if (error || !data?.global_product_id) return null

    const { data: globalRow, error: globalError } = await supabase
      .from('global_products')
      .select('*')
      .eq('id', data.global_product_id)
      .eq('is_active', true)
      .maybeSingle()

    if (globalError || !globalRow) return null

    return normalizeGlobalProduct(globalRow, {
      storeProductId: data.id,
      priceKzt: data.price_kzt,
      shelf: [data.shelf_zone, data.shelf_position].filter(Boolean).join(' / ') || null,
      stockStatus: data.stock_status || null,
    })
  } catch {
    return null
  }
}

async function findGlobalProductByEan(ean) {
  try {
    const { data, error } = await supabase
      .from('global_products')
      .select('*')
      .eq('ean', ean)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) return null
    return normalizeGlobalProduct(data)
  } catch {
    return null
  }
}

async function findGlobalProductById(id) {
  try {
    const { data, error } = await supabase
      .from('global_products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) return null
    return normalizeGlobalProduct(data)
  } catch {
    return null
  }
}

async function findCacheProduct(ean) {
  try {
    const { data, error } = await supabase
      .from('external_product_cache')
      .select('*')
      .eq('ean', ean)
      .maybeSingle()

    if (error || !data) return null

    supabase
      .from('external_product_cache')
      .update({
        scan_count: (data.scan_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('ean', ean)
      .then(() => {})
      .catch(() => {})

    return normalizeCacheProduct(data)
  } catch {
    return null
  }
}

async function fetchFromOFFViaProxy(ean) {
  try {
    const response = await fetch(`/api/off?ean=${encodeURIComponent(ean)}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return null
    const json = await response.json()
    if (!json?.product) return null
    return json.product
  } catch {
    return null
  }
}

async function enrichProduct(product) {
  try {
    const enrichment = await enrichProductAI({ name: product.name, brand: product.brand })
    if (!enrichment) return product
    return coerceProductEntity({
      ...product,
      description: enrichment.description || product.description,
      ingredients: enrichment.ingredients || product.ingredients,
      allergens: enrichment.allergens?.length ? enrichment.allergens : product.allergens,
      dietTags: enrichment.dietTags?.length ? [...new Set([...(product.dietTags || []), ...enrichment.dietTags])] : product.dietTags,
      sourceMeta: {
        ...product.sourceMeta,
        aiEnriched: true,
      },
    })
  } catch {
    return product
  }
}

async function saveToCache(product, rawPayload = {}) {
  try {
    await supabase.from('external_product_cache').upsert({
      ean: product.ean,
      source: 'openfoodfacts',
      raw_payload: rawPayload,
      normalized_name: product.name,
      normalized_brand: product.brand || null,
      normalized_ingredients: product.ingredients || null,
      normalized_allergens_json: product.allergens || [],
      normalized_diet_tags_json: product.dietTags || [],
      normalized_nutriments_json: product.nutritionPer100 || {},
      image_url: product.image || null,
      nutriscore: product.nutriscore || null,
      scan_count: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'ean' })
  } catch {
    // silent
  }
}

async function logMissingProduct(ean, storeId) {
  try {
    await supabase.from('missing_products').upsert({
      ean,
      store_id: storeId || null,
      scan_count: 1,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      resolved: false,
    }, { onConflict: 'store_id,ean' })
  } catch {
    // silent
  }
}

async function persistLocalHistory(product, foundStatus, storeId) {
  const privacy = loadPrivacySettings()
  if (!privacy.localHistoryEnabled) return
  if (!product?.ean) return
  const ownerKey = await getCurrentHistoryOwnerKey()
  const entry = buildLocalScanHistoryEntry(product, foundStatus, storeId)
  if (!entry) return
  appendLocalScanHistory(ownerKey, entry)
}

async function logScan({ ean, foundStatus, product, storeId, fitResult }) {
  const privacy = loadPrivacySettings()
  if (!privacy.analyticsEnabled) return

  try {
    const internalUserId = await resolveCurrentInternalUserId()
    const globalProductId = product?.sourceMeta?.globalProductId || (isUuid(product?.id) ? product.id : null)
    const storeProductId = product?.sourceMeta?.storeProductId || null
    const { error } = await supabase.from('scan_events').insert({
      ean,
      found_status: foundStatus,
      global_product_id: globalProductId,
      store_product_id: storeProductId,
      store_id: storeId || null,
      user_id: internalUserId,
      fit_result: fitResult ?? null,
      device_id: getOrCreateDeviceId(),
      session_id: getOrCreateSessionId(),
      app_version: '1.0',
    })
    if (error) console.error('logScan error', error)
  } catch (error) {
    console.error('logScan error', error)
  }
}

async function finalizeResolvedProduct(product, { ean, foundStatus, storeId, fitResult, logScan: shouldLog }) {
  if (!shouldLog) return product

  await Promise.allSettled([
    persistLocalHistory(product, foundStatus, storeId),
    logScan({ ean, foundStatus, product, storeId, fitResult }),
  ])

  return product
}

export async function resolveProductByEan(ean, storeId = null, options = {}) {
  const normalizedEan = String(ean || '').trim()
  if (!normalizedEan) return null

  if (storeId) {
    const localStoreProduct = coerceProductEntity(getStoreCatalogProductByEan(storeId, normalizedEan))
    if (localStoreProduct) {
      return finalizeResolvedProduct(localStoreProduct, {
        ean: normalizedEan,
        foundStatus: 'found_store',
        storeId,
        fitResult: options.fitResult,
        logScan: options.logScan,
      })
    }

    const storeProduct = await findStoreProduct(normalizedEan, storeId)
    if (storeProduct) {
      return finalizeResolvedProduct(storeProduct, {
        ean: normalizedEan,
        foundStatus: 'found_store',
        storeId,
        fitResult: options.fitResult,
        logScan: options.logScan,
      })
    }
  }

  const globalProduct = await findGlobalProductByEan(normalizedEan)
  if (globalProduct) {
    return finalizeResolvedProduct(globalProduct, {
      ean: normalizedEan,
      foundStatus: 'found_global',
      storeId,
      fitResult: options.fitResult,
      logScan: options.logScan,
    })
  }

  const demoProduct = coerceProductEntity(getGlobalProductByEan(normalizedEan) || getDemoProductByEan(normalizedEan))
  if (demoProduct) {
    return finalizeResolvedProduct(demoProduct, {
      ean: normalizedEan,
      foundStatus: 'found_global',
      storeId,
      fitResult: options.fitResult,
      logScan: options.logScan,
    })
  }

  const cachedProduct = await findCacheProduct(normalizedEan)
  if (cachedProduct) {
    return finalizeResolvedProduct(cachedProduct, {
      ean: normalizedEan,
      foundStatus: 'found_cache',
      storeId,
      fitResult: options.fitResult,
      logScan: options.logScan,
    })
  }

  const offProductRaw = await fetchFromOFFViaProxy(normalizedEan)
  if (offProductRaw) {
    let product = normalizeOFFProduct(normalizedEan, offProductRaw)
    product = await enrichProduct(product)
    await saveToCache(product, offProductRaw)
    return finalizeResolvedProduct(product, {
      ean: normalizedEan,
      foundStatus: 'found_off',
      storeId,
      fitResult: options.fitResult,
      logScan: options.logScan,
    })
  }

  if (options.logScan) {
    await Promise.allSettled([
      logScan({ ean: normalizedEan, foundStatus: 'not_found', product: null, storeId, fitResult: options.fitResult }),
      logMissingProduct(normalizedEan, storeId),
    ])
  }

  return null
}

export async function resolveProductByRef(ref = {}, storeId = null) {
  const routeRef = ref.canonicalId && !ref.id && !ref.ean && !ref.demoId
    ? parseRouteProductRef(ref.canonicalId)
    : ref

  const demoId = routeRef.demoId || null
  const globalId = routeRef.id && isUuid(routeRef.id) ? routeRef.id : null
  const ean = routeRef.ean || null

  if (demoId) {
    const demoProduct = getDemoProductById(demoId)
    if (demoProduct) return demoProduct
  }

  if (globalId) {
    const globalProduct = await findGlobalProductById(globalId)
    if (globalProduct) return globalProduct
  }

  if (ean) {
    return resolveProductByEan(ean, storeId, { logScan: false })
  }

  if (routeRef.canonicalId) {
    const parsed = parseRouteProductRef(routeRef.canonicalId)
    if (parsed.demoId) {
      const demoProduct = getDemoProductById(parsed.demoId)
      if (demoProduct) return demoProduct
    }
    if (parsed.id) {
      const globalProduct = await findGlobalProductById(parsed.id)
      if (globalProduct) return globalProduct
    }
    if (parsed.ean) {
      return resolveProductByEan(parsed.ean, storeId, { logScan: false })
    }
  }

  return null
}

export async function hydrateProductsFromScanRows(rows) {
  return hydrateProductRefs(rows.map((row) => ({ ...row, scannedAt: row.scanned_at || row.created_at || null })))
}

export async function hydrateProductsFromFavoriteRows(rows) {
  return hydrateProductRefs(rows.map((row) => ({ ...row, favoredAt: row.added_at || row.created_at || null })))
}

async function hydrateProductRefs(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const uniqueRefs = []
  const seenKeys = new Set()
  for (const row of rows) {
    const key = row.ean || row.global_product_id || row.id
    if (!key || seenKeys.has(key)) continue
    seenKeys.add(key)
    uniqueRefs.push(row)
  }

  const globalIds = [...new Set(uniqueRefs.map((row) => row.global_product_id).filter(Boolean))]
  const eans = [...new Set(uniqueRefs.map((row) => row.ean).filter(Boolean))]

  const globalById = new Map()
  const globalByEan = new Map()
  const cacheByEan = new Map()

  if (globalIds.length) {
    const { data } = await supabase.from('global_products').select('*').in('id', globalIds)
    for (const row of data || []) {
      const product = normalizeGlobalProduct(row)
      globalById.set(row.id, product)
      if (row.ean) globalByEan.set(row.ean, product)
    }
  }

  const missingGlobalEans = eans.filter((ean) => !globalByEan.has(ean))
  if (missingGlobalEans.length) {
    const { data } = await supabase.from('global_products').select('*').in('ean', missingGlobalEans)
    for (const row of data || []) {
      const product = normalizeGlobalProduct(row)
      globalById.set(row.id, product)
      if (row.ean) globalByEan.set(row.ean, product)
    }
  }

  const missingCacheEans = eans.filter((ean) => !globalByEan.has(ean) && !demoByEan.has(ean))
  if (missingCacheEans.length) {
    const { data } = await supabase.from('external_product_cache').select('*').in('ean', missingCacheEans)
    for (const row of data || []) {
      cacheByEan.set(row.ean, normalizeCacheProduct(row))
    }
  }

  return uniqueRefs.map((row) => {
    let product = null
    if (row.global_product_id && globalById.has(row.global_product_id)) product = globalById.get(row.global_product_id)
    if (!product && row.ean && globalByEan.has(row.ean)) product = globalByEan.get(row.ean)
    if (!product && row.ean) product = coerceProductEntity(getGlobalProductByEan(row.ean)) || null
    if (!product && row.ean && demoByEan.has(row.ean)) product = demoByEan.get(row.ean)
    if (!product && row.ean && cacheByEan.has(row.ean)) product = cacheByEan.get(row.ean)
    if (!product && row.ean) product = coerceProductEntity({ ean: row.ean, name: `Товар ${row.ean}`, source: 'unknown' })
    if (!product && row.global_product_id) product = coerceProductEntity({ id: row.global_product_id, name: 'Неизвестный товар', source: 'unknown' })

    return {
      ...product,
      scanDate: row.scannedAt ? new Date(row.scannedAt) : null,
      favDate: row.favoredAt ? new Date(row.favoredAt) : null,
    }
  })
}
