function normalizeEan(value) {
  return value == null ? null : String(value)
}

export function productMatchesRouteEan(product, ean) {
  const routeEan = normalizeEan(ean)
  if (!product || !routeEan) return false
  if (normalizeEan(product.ean) === routeEan) return true
  const alternateEans = product.alternateEans || product.alternate_eans || []
  return Array.isArray(alternateEans) && alternateEans.map(String).includes(routeEan)
}

function hasUsefulValue(value) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function preserveBaseFactsWhenFullIsSparse(baseProduct, fullProduct) {
  if (!baseProduct) return fullProduct
  if (!fullProduct) return baseProduct

  const merged = { ...baseProduct, ...fullProduct }
  const factKeys = [
    'ingredients',
    'ingredientsKz',
    'nutritionPer100',
    'allergens',
    'dietTags',
    'tags',
    'additivesTags',
    'traces',
    'categoriesTags',
    'description',
    'image',
    'images',
  ]

  for (const key of factKeys) {
    if (!hasUsefulValue(fullProduct[key]) && hasUsefulValue(baseProduct[key])) {
      merged[key] = baseProduct[key]
    }
  }

  return merged
}

export function getProductScreenProduct({ baseProduct, fullProduct, ean }) {
  if (productMatchesRouteEan(fullProduct, ean)) {
    return preserveBaseFactsWhenFullIsSparse(baseProduct, fullProduct)
  }
  return baseProduct || null
}

export function getProductScreenBaseProduct({ catalogProduct, stateProduct, ean }) {
  if (catalogProduct) return catalogProduct
  if (productMatchesRouteEan(stateProduct, ean)) return stateProduct
  return null
}

export function shouldFetchFullProductForProductScreen({
  baseProduct,
  fullProduct,
  ean,
  storeId,
  isOnline,
  needsResolve,
}) {
  if (needsResolve) return false
  if (!isOnline || !storeId || !ean) return false
  if (productMatchesRouteEan(fullProduct, ean)) return false
  if (!baseProduct) return true
  return baseProduct.productScreenFull !== true
}
