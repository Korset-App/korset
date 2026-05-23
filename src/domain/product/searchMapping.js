import { normalizeNutrition, parseJson } from './model.js'
import { buildProductSearchDiagnostics } from './searchDiagnostics.js'
import { getImageUrl } from '../../utils/imageUrl.js'
import { enrichQuantity } from '../../utils/parseQuantity.js'

export function mapSearchRowToProduct(row) {
  const gp =
    typeof row?.global_products === 'string'
      ? parseJson(row.global_products, {})
      : row?.global_products || {}

  const product = {
    ean: gp.ean || row.ean,
    name: row.local_name || gp.name,
    nameKz: gp.name_kz,
    brand: gp.brand,
    category: gp.category,
    subcategory: gp.subcategory,
    quantity: gp.quantity,
    group: gp.group,
    description: gp.description || undefined,
    ingredients: gp.ingredients_raw || undefined,
    ingredientsKz: gp.ingredients_kz || undefined,
    allergens: parseJson(gp.allergens_json, []),
    dietTags: parseJson(gp.diet_tags_json, []),
    tags: parseJson(gp.tags_json, []),
    additivesTags: parseJson(gp.additives_tags_json, []),
    traces: parseJson(gp.traces_json, []),
    categoriesTags: parseJson(gp.categories_tags_json, []),
    halalStatus: gp.halal_status || 'unknown',
    packagingType: gp.packaging_type || null,
    fatPercent: gp.fat_percent ?? null,
    nutriscore: gp.nutriscore,
    nutritionPer100: normalizeNutrition(gp.nutriments_json),
    alcohol100g: gp.alcohol_100g ?? null,
    saturatedFat100g: gp.saturated_fat_100g ?? null,
    novaGroup: gp.nova_group ?? null,
    imageIngredientsUrl: gp.image_ingredients_url || null,
    imageNutritionUrl: gp.image_nutrition_url || null,
    image: getImageUrl(gp.image_url),
    images: parseJson(gp.images, []),
    manufacturer: gp.manufacturer ? { name: gp.manufacturer, country: gp.country_of_origin } : null,
    specs: gp.specs_json || null,
    priceKzt: row.price_kzt,
    shelf:
      [row.shelf_zone, row.shelf_position].filter(Boolean).join(' / ') || row.shelf_zone || null,
    stockStatus: row.stock_status,
    storeProductId: row.id,
    globalProductId: gp.id,
    source: 'search_rpc',
    alternateEans: parseJson(gp.alternate_eans, []),
    qualityScore: gp.data_quality_score ?? null,
    sourceConfidence: gp.source_confidence ?? null,
    searchRank: row.search_rank == null ? null : Number(row.search_rank),
    matchType: row.match_type || null,
  }
  product.searchMeta = buildProductSearchDiagnostics(product)

  return enrichQuantity(product)
}
