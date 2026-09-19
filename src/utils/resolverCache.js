// Session EAN cache (5 min TTL)
const _eanCache = new Map()
const EAN_CACHE_TTL_MS = 5 * 60 * 1000

// In-flight deduplication (prevents duplicate concurrent RPC requests)
const _inflightMap = new Map()

// Catalog freshness tracking
let _catalogCachedAt = 0
let _catalogWarmedStoreId = null
const CATALOG_ONLINE_TTL_MS = 60 * 60 * 1000

export function notifyCatalogWarmed(storeId) {
  _catalogCachedAt = Date.now()
  _catalogWarmedStoreId = storeId || null
}

export function isCatalogFresh(storeId) {
  if (!_catalogCachedAt || !storeId) return false
  if (_catalogWarmedStoreId !== storeId) return false
  return Date.now() - _catalogCachedAt < CATALOG_ONLINE_TTL_MS
}

export function getCachedProduct(ean, storeId) {
  const cacheKey = `${storeId || 'global'}:${ean}`
  const cached = _eanCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < EAN_CACHE_TTL_MS) {
    return cached.product
  }
  return null
}

export function setCachedProduct(ean, storeId, product) {
  const cacheKey = `${storeId || 'global'}:${ean}`
  _eanCache.set(cacheKey, { product, ts: Date.now() })
}

export function getInflightPromise(cacheKey) {
  return _inflightMap.get(cacheKey)
}

export function setInflightPromise(cacheKey, promise) {
  _inflightMap.set(cacheKey, promise)
}

export function deleteInflightPromise(cacheKey) {
  _inflightMap.delete(cacheKey)
}

export function clearResolverCache() {
  _eanCache.clear()
  _inflightMap.clear()
  _catalogCachedAt = 0
  _catalogWarmedStoreId = null
}
