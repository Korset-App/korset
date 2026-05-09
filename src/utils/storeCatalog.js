// Legacy no-op helpers kept only for older imports during cleanup.
// New product and alternatives flows should use StoreContext.catalogProducts.

export function getStoreCatalogProducts(_storeSlug) {
  return []
}

export function getGlobalProductByEan(_ean) {
  return null
}

export function getStoreCatalogProductByEan(_storeSlug, _ean) {
  return null
}

export function getAnyKnownProductByRef(_ref, _storeSlug = null) {
  return null
}
