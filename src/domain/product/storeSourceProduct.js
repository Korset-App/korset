import { createEmptyProduct, isUuid } from './model.js'
import { normalizeGlobalProduct } from './normalizers.js'
import { applySyncedConditions } from './syncedConditions.js'

export function getProductRef(product) {
  return isUuid(product?.storeSourceItemId)
    ? `si:${product.storeSourceItemId}`
    : product?.ean || null
}

export function normalizeSourceCard(row, now = Date.now()) {
  if (!isUuid(row?.store_source_item_id)) return null
  const facts = row.global_product
    ? normalizeGlobalProduct(row.global_product)
    : createEmptyProduct()
  const product = createEmptyProduct({
    ...facts,
    canonicalId: `si:${row.store_source_item_id}`,
    ean: row.ean || null,
    name: row.name,
    storeSourceItemId: row.store_source_item_id,
    storeId: row.store_id,
    source: 'store_integration',
    needsEnrichment: row.needs_enrichment !== false,
    saleUnit: row.unit,
    priceKzt: Number.isSafeInteger(row.regular_minor) ? row.regular_minor / 100 : null,
    stockStatus: row.stock_status || 'unknown',
    syncConditions: {
      store_source_item_id: row.store_source_item_id,
      regular_minor: row.regular_minor,
      sale_minor: row.sale_minor,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
      observed_at: row.observed_at,
      unit: row.unit,
    },
  })
  const current = applySyncedConditions(product, undefined, now)
  const observed = Date.parse(row.observed_at)
  const stale =
    !Number.isFinite(observed) ||
    new Date(now).getTime() - observed > 30 * 60 * 1000 ||
    observed > new Date(now).getTime() + 60 * 1000
  return {
    ...current,
    stockStatus: stale ? 'unknown' : product.stockStatus,
    conditionsStale: stale,
    productScreenFull: true,
  }
}
