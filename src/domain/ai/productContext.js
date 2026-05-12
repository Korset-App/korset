function eanMatches(product, productRef) {
  if (!product || !productRef) return false
  const ref = String(productRef)
  if (String(product.ean) === ref) return true
  return Array.isArray(product.alternateEans) && product.alternateEans.map(String).includes(ref)
}

export async function resolveProductAIContext({
  productRef,
  storeId,
  catalogProducts = [],
  fallbackProduct = null,
  fetchFullProductImpl,
}) {
  if (!productRef) return null

  if (storeId && fetchFullProductImpl) {
    const fullProduct = await fetchFullProductImpl(storeId, String(productRef))
    if (fullProduct) return fullProduct
  }

  const catalogProduct = catalogProducts.find((product) => eanMatches(product, productRef))
  if (catalogProduct) return catalogProduct

  if (eanMatches(fallbackProduct, productRef)) return fallbackProduct

  return null
}

export async function resolveProductForProductAI({
  productRef,
  storeId,
  catalogProducts = [],
  fallbackProduct = null,
  resolveProductByEanImpl,
}) {
  if (!productRef) return null

  if (resolveProductByEanImpl && storeId) {
    const resolved = await resolveProductByEanImpl(String(productRef), storeId, { logScan: false })
    if (resolved) return resolved
  }

  return resolveProductAIContext({
    productRef,
    storeId: null,
    catalogProducts,
    fallbackProduct,
    fetchFullProductImpl: null,
  })
}
