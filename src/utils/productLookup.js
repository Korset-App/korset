import { resolveProductByEan } from '../domain/product/resolver.js'

function inferLookupType(product) {
  return product?.source === 'cache' || product?.source === 'off' ? 'external' : 'local'
}

export async function lookupProduct(ean, storeId = null, options = {}) {
  const normalizedEan = String(ean || '').trim()
  if (!normalizedEan) return { type: 'not_found', ean: normalizedEan }

  const product = await resolveProductByEan(normalizedEan, storeId, {
    logScan: true,
    fitResult: options.fitResult ?? null,
  })

  if (!product) {
    return { type: 'not_found', ean: normalizedEan }
  }

  return {
    type: inferLookupType(product),
    product,
  }
}
