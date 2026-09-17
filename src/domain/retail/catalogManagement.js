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
