const MAX_RECENT_SCANS = 5

export function normalizeManualEan(value) {
  return String(value || '').replace(/\D+/g, '')
}

export function getManualEanError(ean) {
  if (!ean) return 'empty'
  if (ean.length === 8 || ean.length === 13) return null
  return 'invalid_length'
}

export function buildRecentScanEntry(product) {
  if (!product) return null
  return {
    ean: product.ean,
    name: product.name,
    image_url: product.image || product.image_url || product.imageUrl || null,
  }
}

export function upsertRecentScan(existing = [], product) {
  const entry = buildRecentScanEntry(product)
  if (!entry?.ean) return existing.slice(0, MAX_RECENT_SCANS)

  return [entry, ...existing.filter((item) => item?.ean !== entry.ean)].slice(0, MAX_RECENT_SCANS)
}

export function getNextCompareState({ active, pinnedProduct, product }) {
  if (!active) return { action: 'product', product }
  if (!pinnedProduct) return { action: 'pin', pinnedProduct: product }
  return { action: 'compare', productA: pinnedProduct, productB: product }
}
