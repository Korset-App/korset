function normalizeEan(value) {
  return value == null ? null : String(value)
}

export function productMatchesRouteEan(product, ean) {
  const routeEan = normalizeEan(ean)
  if (!product || !routeEan) return false
  if (normalizeEan(product.ean) === routeEan) return true
  const alternateEans = product.alternateEans || product.alternate_eans || []
  if (Array.isArray(alternateEans) && alternateEans.map(String).includes(routeEan)) return true
  if (
    product.sourceMeta?.resolvedAliasEan &&
    normalizeEan(product.sourceMeta.resolvedAliasEan) === routeEan
  ) {
    return true
  }
  return false
}

function hasUsefulValue(value) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export function mergeProductEnrichment({
  currentProduct,
  enrichedProduct,
  ean,
  storeId,
  eventStoreId,
}) {
  if (
    storeId !== eventStoreId ||
    !productMatchesRouteEan(currentProduct, ean) ||
    normalizeEan(currentProduct.ean) !== normalizeEan(enrichedProduct?.ean) ||
    currentProduct.sourceMeta?.isVerified
  )
    return currentProduct
  const merged = { ...currentProduct }
  let changed = false
  for (const key of ['description', 'ingredients', 'allergens', 'dietTags']) {
    if (!hasUsefulValue(currentProduct[key]) && hasUsefulValue(enrichedProduct[key])) {
      merged[key] = enrichedProduct[key]
      changed = true
    }
  }
  if (!changed) return currentProduct
  merged.sourceMeta = { ...currentProduct.sourceMeta, aiEnriched: true }
  return merged
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
    'quantity',
    'quantityParsed',
    'specs',
    'storageConditions',
    'shelfLife',
    'packagingType',
    'cookingInstructions',
    'halalStatus',
    'halalCertifier',
    'halalNotes',
    'fatPercent',
    'flavor',
    'manufacturer',
    'country',
    'alternateEans',
    'nutriscore',
    'novaGroup',
    'saturatedFat100g',
  ]

  for (const key of factKeys) {
    if (!hasUsefulValue(fullProduct[key]) && hasUsefulValue(baseProduct[key])) {
      merged[key] = baseProduct[key]
    }
  }

  return merged
}

export function getProductScreenProduct({
  baseProduct,
  fullProduct,
  ean,
  storeId,
  backgroundEnrichment,
}) {
  const currentProduct = productMatchesRouteEan(fullProduct, ean)
    ? preserveBaseFactsWhenFullIsSparse(baseProduct, fullProduct)
    : baseProduct || null
  if (!backgroundEnrichment) return currentProduct
  return mergeProductEnrichment({
    currentProduct,
    enrichedProduct: backgroundEnrichment.product,
    ean,
    storeId,
    eventStoreId: backgroundEnrichment.storeId,
  })
}

export function getProductScreenBaseProduct({ catalogProduct, stateProduct, ean }) {
  if (catalogProduct && normalizeEan(catalogProduct.ean) === normalizeEan(ean))
    return catalogProduct
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
