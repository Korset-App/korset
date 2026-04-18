import { getImageUrl } from '../../utils/imageUrl.js'
import {
  createEmptyProduct,
  normalizeStringArray,
  normalizeNutrition,
  normalizeManufacturer,
  normalizeSpecs,
  normalizeHalalStatus,
  normalizeNutriscore,
  parseJson,
  withProductImage,
} from './model.js'

const OFF_ALLERGEN_MAP = {
  'en:milk': 'milk',
  'en:gluten': 'gluten',
  'en:nuts': 'nuts',
  'en:peanuts': 'peanuts',
  'en:soybeans': 'soy',
  'en:soy': 'soy',
  'en:eggs': 'eggs',
  'en:fish': 'fish',
  'en:crustaceans': 'shellfish',
  'en:shellfish': 'shellfish',
  'en:wheat': 'gluten',
}

export function normalizeDemoProduct(row) {
  return withProductImage(
    createEmptyProduct({
      source: 'demo',
      demoId: row.id,
      ean: row.ean,
      name: row.name,
      brand: row.manufacturer?.name || row.brand || null,
      category: row.category || 'grocery',
      subcategory: row.subcategory || null,
      quantity: row.quantity || row.specs?.weight || null,
      group: row.group || null,
      images: row.images || [],
      description: row.description || null,
      ingredients: row.ingredients || null,
      allergens: normalizeStringArray(row.allergens),
      dietTags: normalizeStringArray(row.dietTags),
      tags: normalizeStringArray(row.tags),
      halalStatus: normalizeHalalStatus(row.halalStatus ?? row.halal),
      nutritionPer100: normalizeNutrition(row.nutritionPer100 || row.nutrition),
      manufacturer: normalizeManufacturer(row.manufacturer, row.country),
      specs: normalizeSpecs(row.specs),
      priceKzt: row.priceKzt,
      shelf: row.shelf || null,
      stockStatus: row.stockStatus || null,
      nutriscore: normalizeNutriscore(row.nutriscore),
      qualityScore: row.qualityScore ?? null,
    })
  )
}

export function normalizeGlobalProduct(row, storeOverlay = null) {
  const product = createEmptyProduct({
    source: storeOverlay ? 'store' : 'global',
    id: row.id,
    ean: row.ean,
    alternateEans: normalizeStringArray(parseJson(row.alternate_eans, [])),
    name: row.name,
    nameKz: row.name_kz || null,
    brand: row.brand,
    category: row.category || 'grocery',
    subcategory: row.subcategory || null,
    quantity: row.quantity || null,
    group: row.group || null,
    images: Array.isArray(row.images) ? row.images : parseJson(row.images, []),
    image: getImageUrl(row.image_url) || null,
    description: row.description || null,
    ingredients: row.ingredients_raw || null,
    ingredientsKz: row.ingredients_kz || null,
    allergens: normalizeStringArray(parseJson(row.allergens_json, [])),
    dietTags: normalizeStringArray(parseJson(row.diet_tags_json, [])),
    tags: normalizeStringArray(parseJson(row.tags_json, [])),
    additivesTags: normalizeStringArray(parseJson(row.additives_tags_json, [])),
    traces: normalizeStringArray(parseJson(row.traces_json, [])),
    categoriesTags: normalizeStringArray(parseJson(row.categories_tags_json, [])),
    halalStatus: row.halal_status,
    nutritionPer100: normalizeNutrition(row.nutriments_json),
    alcohol100g: row.alcohol_100g ?? null,
    saturatedFat100g: row.saturated_fat_100g ?? null,
    novaGroup: row.nova_group ?? null,
    imageIngredientsUrl: row.image_ingredients_url || null,
    imageNutritionUrl: row.image_nutrition_url || null,
    manufacturer: normalizeManufacturer(row.manufacturer, row.country_of_origin),
    specs: normalizeSpecs(row.specs_json),
    priceKzt: storeOverlay?.priceKzt ?? null,
    shelf: storeOverlay?.shelf ?? null,
    stockStatus: storeOverlay?.stockStatus ?? null,
    nutriscore: row.nutriscore,
    qualityScore: row.data_quality_score ?? null,
    sourceConfidence: row.source_confidence ?? null,
    sourceMeta: {
      globalProductId: row.id,
      storeProductId: storeOverlay?.storeProductId || null,
      cacheId: null,
      externalSource: row.source_primary || null,
      isVerified: Boolean(row.is_verified),
      needsReview: Boolean(row.needs_review),
      qualityScore: row.data_quality_score ?? null,
      aiEnriched: row.source_primary === 'ai_enriched',
      lastUpdatedAt: row.updated_at || row.created_at || null,
    },
  })
  return withProductImage(product)
}

export function normalizeCacheProduct(row) {
  const product = createEmptyProduct({
    source: 'cache',
    ean: row.ean,
    name: row.normalized_name || `Товар ${row.ean}`,
    brand: row.normalized_brand || null,
    category: row.normalized_category || null,
    quantity: row.normalized_quantity || null,
    images: row.image_url ? [getImageUrl(row.image_url)] : [],
    description: row.normalized_description || null,
    ingredients: row.normalized_ingredients || null,
    allergens: normalizeStringArray(parseJson(row.normalized_allergens_json, [])),
    dietTags: normalizeStringArray(parseJson(row.normalized_diet_tags_json, [])),
    additivesTags: normalizeStringArray(parseJson(row.normalized_additives_tags_json, [])),
    traces: normalizeStringArray(parseJson(row.normalized_traces_json, [])),
    nutritionPer100: normalizeNutrition(row.normalized_nutriments_json),
    novaGroup: row.nova_group ?? null,
    nutriscore: row.nutriscore,
    sourceMeta: {
      globalProductId: row.global_product_id || null,
      storeProductId: null,
      cacheId: row.id || null,
      externalSource: row.source || 'openfoodfacts',
      isVerified: false,
      needsReview: true,
      qualityScore: null,
      aiEnriched: false,
      lastUpdatedAt: row.updated_at || row.cached_at || null,
    },
  })
  return withProductImage(product)
}

export function normalizeOFFProduct(ean, product, enrichment = null) {
  const allergens = [
    ...new Set(
      (product.allergens_tags || product.allergens_hierarchy || [])
        .map((item) => OFF_ALLERGEN_MAP[item])
        .filter(Boolean)
    ),
  ]
  const traces = [
    ...new Set((product.traces_tags || []).map((item) => OFF_ALLERGEN_MAP[item]).filter(Boolean)),
  ]
  const labels = product.labels_tags || []
  const dietTags = []
  if (labels.some((label) => /vegan/i.test(label))) dietTags.push('vegan')
  if (labels.some((label) => /vegetarian/i.test(label))) dietTags.push('vegetarian')
  if (labels.some((label) => /halal/i.test(label))) dietTags.push('halal')
  if (labels.some((label) => /gluten.free/i.test(label))) dietTags.push('gluten_free')
  const additivesTags = (product.additives_tags || []).map((t) => t.replace(/^en:/, ''))

  const base = createEmptyProduct({
    source: 'off',
    ean,
    name: (product.product_name || '').trim() || `Товар ${ean}`,
    brand: (product.brands || '').trim() || null,
    quantity: product.quantity || null,
    images: product.image_front_url ? [product.image_front_url] : [],
    ingredients: product.ingredients_text_ru || product.ingredients_text || null,
    allergens,
    traces,
    additivesTags,
    categoriesTags: product.categories_tags || [],
    dietTags,
    halalStatus: labels.some((label) => /halal/i.test(label)) ? 'yes' : 'unknown',
    nutritionPer100: normalizeNutrition(product.nutriments || {}),
    novaGroup: product.nova_group ?? null,
    imageIngredientsUrl: product.image_ingredients_url || null,
    imageNutritionUrl: product.image_nutrition_url || null,
    nutriscore: product.nutriscore_grade,
    description: enrichment?.description || null,
    sourceMeta: {
      globalProductId: null,
      storeProductId: null,
      cacheId: null,
      externalSource: 'openfoodfacts',
      isVerified: false,
      needsReview: true,
      qualityScore: null,
      aiEnriched: Boolean(enrichment),
      lastUpdatedAt: null,
    },
  })

  const enriched = createEmptyProduct({
    ...base,
    description: enrichment?.description || base.description,
    ingredients: enrichment?.ingredients || base.ingredients,
    allergens: enrichment?.allergens?.length ? enrichment.allergens : base.allergens,
    dietTags: enrichment?.dietTags?.length
      ? [...new Set([...base.dietTags, ...enrichment.dietTags])]
      : base.dietTags,
    sourceMeta: {
      ...base.sourceMeta,
      aiEnriched: Boolean(enrichment),
    },
  })

  return withProductImage(enriched)
}

export function coerceProductEntity(productLike) {
  if (!productLike) return null
  if (productLike.canonicalId && productLike.sourceMeta)
    return withProductImage(createEmptyProduct(productLike))

  const hasGlobalShape =
    productLike.ean &&
    ('halalStatus' in productLike ||
      'nutritionPer100' in productLike ||
      'sourceMeta' in productLike ||
      'qualityScore' in productLike)
  if (hasGlobalShape) return withProductImage(createEmptyProduct(productLike))

  if (productLike.id && String(productLike.id).startsWith('p'))
    return normalizeDemoProduct(productLike)
  if (productLike.normalized_name || productLike.normalized_nutriments_json)
    return normalizeCacheProduct(productLike)
  if (productLike.product_name || productLike.nutriments || productLike.allergens_tags)
    return normalizeOFFProduct(productLike.ean, productLike)
  if (productLike.ingredients_raw || productLike.halal_status || productLike.nutriments_json)
    return normalizeGlobalProduct(productLike)

  return withProductImage(createEmptyProduct(productLike))
}
