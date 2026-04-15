import products from '../data/products.json'
import { STORE_PRODUCT_MAP } from '../data/stores.js'
import { getStoreInventory } from '../data/storeInventories.js'
import { supabase } from './supabase.js'

function cloneProduct(product) {
  return product ? JSON.parse(JSON.stringify(product)) : null
}

function getAllKnownEans(product) {
  const eans = [
    product?.ean,
    ...(Array.isArray(product?.alternateEans) ? product.alternateEans : []),
  ]
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
  return (
    getStoreCatalogProducts(storeSlug).find((product) => matchesProductEan(product, ean)) || null
  )
}

export function getAnyKnownProductByRef(ref, storeSlug = null) {
  if (!ref) return null
  return (
    getStoreCatalogProducts(storeSlug).find(
      (product) => matchesProductEan(product, ref) || product.id === ref
    ) ||
    getGlobalDemoProducts().find(
      (product) => matchesProductEan(product, ref) || product.id === ref
    ) ||
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

export async function getStoreCatalogProductsFromDB(storeId) {
  if (!storeId) return []
  const { data, error } = await supabase
    .from('store_products')
    .select(
      `
      *,
      global_products (
        id, ean, name, name_kz, brand, category, subcategory,
        quantity, image_url, images, ingredients_raw, ingredients_kz,
        allergens_json, diet_tags_json, halal_status,
        nutriscore, data_quality_score
      )
    `
    )
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map((sp) => ({
    id: sp.id,
    storeProductId: sp.id,
    storeId: sp.store_id,
    ean: sp.ean,
    priceKzt: sp.price_kzt || null,
    stockStatus: sp.stock_status,
    shelfZone: sp.shelf_zone,
    shelfPosition: sp.shelf_position,
    isPromoted: sp.is_promoted,
    localName: sp.local_name,
    localSku: sp.local_sku,
    name: sp.global_products?.name || sp.local_name || sp.ean,
    nameKz: sp.global_products?.name_kz || null,
    brand: sp.global_products?.brand || null,
    category: sp.global_products?.category || null,
    subcategory: sp.global_products?.subcategory || null,
    quantity: sp.global_products?.quantity || null,
    image: sp.global_products?.image_url || sp.global_products?.images?.[0] || null,
    imageUrl: sp.global_products?.image_url || null,
    ingredients: sp.global_products?.ingredients_raw || null,
    ingredientsKz: sp.global_products?.ingredients_kz || null,
    allergens: sp.global_products?.allergens_json || [],
    dietTags: sp.global_products?.diet_tags_json || [],
    halalStatus: sp.global_products?.halal_status || 'unknown',
    nutriscore: sp.global_products?.nutriscore || null,
    dataQualityScore: sp.global_products?.data_quality_score || 0,
    isStoreProduct: true,
    canonicalId: sp.ean,
  }))
}
