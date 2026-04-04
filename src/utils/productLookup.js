
import { resolveProductByEan } from '../domain/product/resolver.js'

export async function lookupProduct(ean, storeId = null) {
  const product = await resolveProductByEan(ean, storeId, { logScan: true })
  if (!product) return { type: 'not_found', ean }

  return {
    type: product.source === 'store' || product.source === 'global' || product.source === 'demo' ? 'local' : 'external',
    product,
  }
}
