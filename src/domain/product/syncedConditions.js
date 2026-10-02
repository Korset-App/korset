const STALE_MS = 30 * 60 * 1000

export function applySyncedConditions(product, conditions, now = Date.now()) {
  if (!product) return product
  const syncConditions = conditions ?? product.syncConditions
  if (
    !syncConditions ||
    (product.storeSourceItemId
      ? syncConditions.store_source_item_id !== product.storeSourceItemId
      : String(syncConditions.ean) !== String(product.ean))
  )
    return product

  const regularMinor = syncConditions.regular_minor
  const nowMs = new Date(now).getTime()
  const appliedMs = Date.parse(
    Object.hasOwn(syncConditions, 'observed_at')
      ? syncConditions.observed_at
      : syncConditions.applied_at
  )
  const stale =
    !Number.isFinite(appliedMs) || nowMs - appliedMs > STALE_MS || appliedMs > nowMs + 60 * 1000
  if (
    !Number.isSafeInteger(regularMinor) ||
    regularMinor < 0 ||
    (!product.storeSourceItemId && regularMinor % 100 !== 0)
  )
    return product.storeSourceItemId
      ? { ...product, conditionsStale: stale, stockStatus: stale ? 'unknown' : product.stockStatus }
      : product

  const startMs = Date.parse(syncConditions.valid_from)
  const endMs = Date.parse(syncConditions.valid_until)
  const saleMinor = syncConditions.sale_minor
  const saleActive =
    Number.isSafeInteger(saleMinor) &&
    saleMinor >= 0 &&
    saleMinor < regularMinor &&
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    nowMs >= startMs &&
    nowMs < endMs
  const regularKzt = regularMinor / 100

  return {
    ...product,
    syncConditions,
    conditionsUnavailable: conditions ? false : Boolean(product.conditionsUnavailable),
    priceKzt: saleActive ? saleMinor / 100 : regularKzt,
    oldPriceKzt: saleActive ? regularKzt : null,
    discountPercent: saleActive
      ? Math.min(99, Math.max(0, Math.round((1 - saleMinor / regularMinor) * 100)))
      : null,
    conditionsStale: stale,
    ...(stale && (product.storeSourceItemId || Object.hasOwn(syncConditions, 'observed_at'))
      ? { stockStatus: 'unknown' }
      : {}),
  }
}

export function applySyncedRegularFallback(product) {
  const regularMinor = product?.syncConditions?.regular_minor
  if (
    !Number.isSafeInteger(regularMinor) ||
    regularMinor < 0 ||
    (!product.storeSourceItemId && regularMinor % 100 !== 0)
  )
    return product?.storeSourceItemId
      ? { ...product, conditionsStale: true, conditionsUnavailable: true, stockStatus: 'unknown' }
      : product
  return {
    ...product,
    priceKzt: regularMinor / 100,
    oldPriceKzt: null,
    discountPercent: null,
    conditionsStale: true,
    conditionsUnavailable: true,
    ...(product.storeSourceItemId ? { stockStatus: 'unknown' } : {}),
  }
}
