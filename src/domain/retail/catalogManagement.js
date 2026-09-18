/**
 * Domain functions for adding and managing store products manually or from barcode scan.
 */

export function validateManualProductPayload({ ean, priceKzt, localName } = {}) {
  const cleanEan = String(ean || '').replace(/\D/g, '')
  if (!cleanEan || (cleanEan.length !== 8 && cleanEan.length !== 13)) {
    return { ok: false, error: 'invalid_ean' }
  }

  const price = Number(priceKzt)
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: 'invalid_price' }
  }

  const cleanName = String(localName || '').trim()

  return {
    ok: true,
    value: {
      ean: cleanEan,
      priceKzt: Math.round(price),
      localName: cleanName || null,
    },
  }
}

export function buildStoreProductUpsertPayload({
  storeId,
  ean,
  priceKzt,
  globalProductId = null,
  localName = null,
  stockStatus = 'in_stock',
  shelfZone = null,
}) {
  if (!storeId) {
    throw new Error('storeId is required')
  }

  const cleanEan = String(ean || '').replace(/\D/g, '')
  if (!cleanEan) {
    throw new Error('ean is required')
  }

  return {
    store_id: storeId,
    ean: cleanEan,
    global_product_id: globalProductId,
    price_kzt: Number(priceKzt) || 0,
    local_name: localName ? String(localName).trim().slice(0, 200) : null,
    stock_status: stockStatus === 'out_of_stock' ? 'out_of_stock' : 'in_stock',
    shelf_zone: shelfZone ? String(shelfZone).trim().slice(0, 80) : null,
    is_active: true,
    updated_at: new Date().toISOString(),
  }
}

export function calculateDiscountPercent(currentPrice, oldPrice) {
  const current = Number(currentPrice)
  const old = Number(oldPrice)
  if (!Number.isFinite(current) || !Number.isFinite(old) || old <= current || current <= 0) {
    return null
  }
  const pct = Math.round((1 - current / old) * 100)
  return pct > 0 && pct < 100 ? pct : null
}

export function calculateDiscountedPrice(oldPrice, discountPercent) {
  const old = Number(oldPrice)
  const pct = Number(discountPercent)
  if (!Number.isFinite(old) || !Number.isFinite(pct) || old <= 0 || pct <= 0 || pct >= 100) {
    return null
  }
  return Math.round(old * (1 - pct / 100))
}

export function validatePromotionPayload({
  isFeatured = false,
  oldPriceKzt = null,
  discountPercent = null,
  currentPrice = 0,
} = {}) {
  const current = Number(currentPrice) || 0
  let oldPrice =
    oldPriceKzt !== null && oldPriceKzt !== undefined && oldPriceKzt !== ''
      ? Math.round(Number(oldPriceKzt))
      : null

  let discountPct =
    discountPercent !== null && discountPercent !== undefined && discountPercent !== ''
      ? Math.round(Number(discountPercent))
      : null

  if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= current)) {
    oldPrice = null
  }

  if (
    discountPct !== null &&
    (!Number.isFinite(discountPct) || discountPct <= 0 || discountPct >= 100)
  ) {
    discountPct = null
  }

  // Auto-calculate discount percentage if old price is present but discount percentage is not
  if (oldPrice !== null && discountPct === null && current > 0) {
    discountPct = calculateDiscountPercent(current, oldPrice)
  }

  return {
    is_featured: Boolean(isFeatured),
    old_price_kzt: oldPrice,
    discount_percent: discountPct,
  }
}
