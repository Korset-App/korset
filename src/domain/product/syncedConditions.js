const STALE_MS = 30 * 60 * 1000

export function applySyncedConditions(product, conditions, now = Date.now()) {
  if (!product) return product
  const syncConditions = conditions ?? product.syncConditions
  if (!syncConditions || String(syncConditions.ean) !== String(product.ean)) return product

  const regularMinor = syncConditions.regular_minor
  if (!Number.isSafeInteger(regularMinor) || regularMinor < 0 || regularMinor % 100 !== 0)
    return product

  const nowMs = new Date(now).getTime()
  const startMs = Date.parse(syncConditions.valid_from)
  const endMs = Date.parse(syncConditions.valid_until)
  const appliedMs = Date.parse(syncConditions.applied_at)
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
    conditionsStale: !Number.isFinite(appliedMs) || nowMs - appliedMs > STALE_MS,
  }
}

export function applySyncedRegularFallback(product) {
  const regularMinor = product?.syncConditions?.regular_minor
  if (!Number.isSafeInteger(regularMinor) || regularMinor < 0 || regularMinor % 100 !== 0)
    return product
  return {
    ...product,
    priceKzt: regularMinor / 100,
    oldPriceKzt: null,
    discountPercent: null,
    conditionsStale: true,
    conditionsUnavailable: true,
  }
}
