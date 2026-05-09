/**
 * Scanner helper utilities and state resolution for comparing products and managing scan history.
 */

export function normalizeManualEan(input) {
  return String(input || '').replace(/\D/g, '')
}

export function getManualEanError(ean) {
  if (!ean) return 'empty'
  if (ean.length !== 8 && ean.length !== 13) return 'invalid_length'
  return null
}

export function upsertRecentScan(existing = [], product, limit = 10) {
  if (!product || !product.ean) return existing
  const filtered = existing.filter((item) => item.ean !== product.ean)
  const entry = buildRecentScanEntry(product)
  return [entry, ...filtered].slice(0, limit)
}

export function buildRecentScanEntry(product) {
  if (!product) return null
  return {
    ean: product.ean || '',
    name: product.name || '',
    image_url: product.image_url || product.image || null,
  }
}

export function getNextCompareState({ active, pinnedProduct, product }) {
  if (active) {
    if (!pinnedProduct) {
      return { action: 'pin', pinnedProduct: product }
    }
    return { action: 'compare', productA: pinnedProduct, productB: product }
  }
  return { action: 'product', product }
}
