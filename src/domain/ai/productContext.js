import { findProductInCatalog } from '../product/alternatives.js'
import { parseRouteProductRef } from '../product/model.js'

function getRefs(product) {
  return [product?.ean, ...(product?.alternateEans || []), ...(product?.alternate_eans || [])]
    .map((value) => (value == null ? '' : String(value).trim()))
    .filter(Boolean)
}

function normalizeProductRef(productRef) {
  const parsed = parseRouteProductRef(productRef)
  return parsed.ean || parsed.id || parsed.canonicalId || String(productRef || '').trim()
}

function fallbackMatchesRef(product, ref) {
  if (!product || !ref) return false
  return getRefs(product).includes(ref)
}

export async function resolveProductAIContext({
  productRef,
  storeId,
  catalogProducts = [],
  fallbackProduct = null,
  fetchFullProductImpl = async () => null,
} = {}) {
  const ref = normalizeProductRef(productRef)
  if (!ref) return null

  if (storeId && /^\d{8,14}$/.test(ref)) {
    const fullProduct = await fetchFullProductImpl(storeId, ref)
    if (fullProduct) return fullProduct
  }

  const catalogProduct = findProductInCatalog(catalogProducts, ref)
  if (catalogProduct) return catalogProduct

  return fallbackMatchesRef(fallbackProduct, ref) ? fallbackProduct : null
}

export async function resolveProductForProductAI({
  productRef,
  storeId,
  catalogProducts = [],
  fallbackProduct = null,
  resolveProductByEanImpl,
} = {}) {
  return resolveProductAIContext({
    productRef,
    storeId,
    catalogProducts,
    fallbackProduct,
    fetchFullProductImpl:
      typeof resolveProductByEanImpl === 'function'
        ? (activeStoreId, ean) => resolveProductByEanImpl(ean, activeStoreId, { logScan: false })
        : async () => null,
  })
}
