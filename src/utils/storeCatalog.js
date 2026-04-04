import products from '../data/products.json'
import { STORE_PRODUCT_MAP } from '../data/stores.js'
import { getStoreInventory } from '../data/storeInventories.js'

function cloneProduct(product) {
  return product ? JSON.parse(JSON.stringify(product)) : null
}

function getAllKnownEans(product) {
  const eans = [product?.ean, ...(Array.isArray(product?.alternateEans) ? product.alternateEans : [])]
  return [...new Set(eans.filter(Boolean).map(String))]
}

function matchesProductEan(product, ean) {
  if (!product || !ean) return false
  return getAllKnownEans(product).includes(String(ean))
}

function applyStoreOverlay(product, overlay = null, storeSlug = null) {
  if (!product) return null
  const next = cloneProduct(product)
  const priceKzt = overlay?.priceKzt ?? null
  const shelf = overlay?.shelf ?? null
  const stockStatus = overlay?.stockStatus ?? null
  const isStoreProduct = Boolean(storeSlug && overlay)

  return {
    ...next,
    priceKzt,
    shelf,
    stockStatus,
    isStoreProduct,
    storeSlug: storeSlug || null,
    canonicalId: next.ean || next.id,
    image: next.image || next.images?.[0] || null,
  }
}

function getBaseProducts() {
  return products.filter((product) => product?.ean)
}

export function getGlobalDemoProducts() {
  return getBaseProducts().map((product) => applyStoreOverlay(product))
}

export function getStoreCatalogProducts(storeSlug) {
  if (!storeSlug || !STORE_PRODUCT_MAP[storeSlug]) return []
  const allowedEans = new Set(STORE_PRODUCT_MAP[storeSlug])
  const inventoryMap = new Map(getStoreInventory(storeSlug).map((item) => [item.ean, item]))

  return getBaseProducts()
    .filter((product) => allowedEans.has(product.ean))
    .map((product) => applyStoreOverlay(product, inventoryMap.get(product.ean) || null, storeSlug))
}

export function getGlobalProductByEan(ean) {
  return getGlobalDemoProducts().find((product) => matchesProductEan(product, ean)) || null
}

export function getStoreCatalogProductByEan(storeSlug, ean) {
  return getStoreCatalogProducts(storeSlug).find((product) => matchesProductEan(product, ean)) || null
}

export function getAnyKnownProductByRef(ref, storeSlug = null) {
  if (!ref) return null
  return (
    getStoreCatalogProducts(storeSlug).find((product) => matchesProductEan(product, ref) || product.id === ref) ||
    getGlobalDemoProducts().find((product) => matchesProductEan(product, ref) || product.id === ref) ||
    null
  )
}

export function getProductByEan(ean, storeSlug = null) {
  return getAnyKnownProductByRef(ean, storeSlug)
}

export function isStoreCatalogProduct(storeSlug, ean) {
  return Boolean(getStoreCatalogProductByEan(storeSlug, ean))
}

export function getAllKnownEansForProduct(product) {
  return getAllKnownEans(product)
}
