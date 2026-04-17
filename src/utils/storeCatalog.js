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
        description, allergens_json, diet_tags_json, halal_status,
        additives_tags_json, traces_json, categories_tags_json, tags_json,
        nutriments_json, alcohol_100g, saturated_fat_100g, nova_group,
        image_ingredients_url, image_nutrition_url,
        manufacturer, country_of_origin, specs_json,
        nutriscore, data_quality_score, source_primary, source_confidence,
        is_verified, needs_review, group
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
    group: sp.global_products?.group || null,
    image: sp.global_products?.image_url || sp.global_products?.images?.[0] || null,
    imageUrl: sp.global_products?.image_url || null,
    images: sp.global_products?.images || [],
    description: sp.global_products?.description || null,
    ingredients: sp.global_products?.ingredients_raw || null,
    ingredientsKz: sp.global_products?.ingredients_kz || null,
    allergens: sp.global_products?.allergens_json || [],
    dietTags: sp.global_products?.diet_tags_json || [],
    tags: sp.global_products?.tags_json || [],
    additivesTags: sp.global_products?.additives_tags_json || [],
    traces: sp.global_products?.traces_json || [],
    categoriesTags: sp.global_products?.categories_tags_json || [],
    nutritionPer100: sp.global_products?.nutriments_json || null,
    alcohol100g: sp.global_products?.alcohol_100g ?? null,
    saturatedFat100g: sp.global_products?.saturated_fat_100g ?? null,
    novaGroup: sp.global_products?.nova_group ?? null,
    imageIngredientsUrl: sp.global_products?.image_ingredients_url || null,
    imageNutritionUrl: sp.global_products?.image_nutrition_url || null,
    manufacturer: sp.global_products?.manufacturer
      ? { name: sp.global_products.manufacturer, country: sp.global_products.country_of_origin }
      : null,
    specs: sp.global_products?.specs_json || null,
    halalStatus: sp.global_products?.halal_status || 'unknown',
    nutriscore: sp.global_products?.nutriscore || null,
    qualityScore: sp.global_products?.data_quality_score ?? 0,
    sourceConfidence: sp.global_products?.source_confidence ?? null,
    sourcePrimary: sp.global_products?.source_primary || null,
    isVerified: sp.global_products?.is_verified || false,
    needsReview: sp.global_products?.needs_review || false,
    isStoreProduct: true,
    canonicalId: sp.ean,
  }))
}
