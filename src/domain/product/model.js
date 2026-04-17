export function buildCanonicalId({ id, ean, demoId } = {}) {
  if (id && isUuid(id)) return `gp:${id}`
  if (ean) return `ean:${String(ean)}`
  if (demoId) return `demo:${demoId}`
  return `tmp:${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyProduct(overrides = {}) {
  const ean = overrides.ean ? String(overrides.ean) : null
  const id = overrides.id || null
  const demoId = overrides.demoId || null
  const canonicalId = overrides.canonicalId || buildCanonicalId({ id, ean, demoId })
  const images = Array.isArray(overrides.images) ? overrides.images.filter(Boolean) : []
  const image = overrides.image || images[0] || null

  return {
    canonicalId,
    source: overrides.source || 'unknown',
    sourceMeta: {
      globalProductId: overrides.sourceMeta?.globalProductId || (isUuid(id) ? id : null),
      storeProductId: overrides.sourceMeta?.storeProductId || null,
      cacheId: overrides.sourceMeta?.cacheId || null,
      externalSource: overrides.sourceMeta?.externalSource || null,
      isVerified: Boolean(overrides.sourceMeta?.isVerified),
      needsReview: Boolean(overrides.sourceMeta?.needsReview),
      qualityScore: normalizeNumber(overrides.sourceMeta?.qualityScore),
      aiEnriched: Boolean(overrides.sourceMeta?.aiEnriched),
      lastUpdatedAt: overrides.sourceMeta?.lastUpdatedAt || null,
    },

    id,
    demoId,
    ean,
    name: overrides.name || '',
    nameKz: overrides.nameKz || overrides.name_kz || null,
    brand: overrides.brand || null,
    category: overrides.category || 'grocery',
    subcategory: overrides.subcategory || null,
    quantity: overrides.quantity || null,
    group: overrides.group || null,

    images,
    image,

    description: overrides.description || null,
    ingredients: overrides.ingredients || null,
    ingredientsKz: overrides.ingredientsKz || overrides.ingredients_kz || null,

    allergens: normalizeStringArray(overrides.allergens),
    dietTags: normalizeStringArray(overrides.dietTags),
    tags: normalizeStringArray(overrides.tags),
    additivesTags: normalizeStringArray(overrides.additivesTags ?? overrides.additives_tags),
    traces: normalizeStringArray(overrides.traces),
    categoriesTags: normalizeStringArray(overrides.categoriesTags ?? overrides.categories_tags),
    halalStatus: normalizeHalalStatus(overrides.halalStatus ?? overrides.halal),
    halal: normalizeHalalStatus(overrides.halalStatus ?? overrides.halal),

    nutritionPer100: normalizeNutrition(overrides.nutritionPer100 || overrides.nutrition),
    alcohol100g: normalizeNumber(overrides.alcohol100g ?? overrides.alcohol_100g),
    saturatedFat100g: normalizeNumber(overrides.saturatedFat100g ?? overrides.saturated_fat_100g),
    novaGroup: normalizeNumber(overrides.novaGroup ?? overrides.nova_group),

    imageIngredientsUrl: overrides.imageIngredientsUrl ?? overrides.image_ingredients_url ?? null,
    imageNutritionUrl: overrides.imageNutritionUrl ?? overrides.image_nutrition_url ?? null,

    manufacturer: normalizeManufacturer(overrides.manufacturer, overrides.country),

    specs: normalizeSpecs(overrides.specs),

    priceKzt: normalizeNumber(overrides.priceKzt),
    shelf: overrides.shelf || null,
    stockStatus: overrides.stockStatus || null,

    nutriscore: normalizeNutriscore(overrides.nutriscore),
    qualityScore: normalizeNumber(overrides.qualityScore ?? overrides.sourceMeta?.qualityScore),
    sourceConfidence: normalizeNumber(overrides.sourceConfidence ?? overrides.source_confidence),
  }
}

export function withProductImage(product) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : []
  const image = product.image || images[0] || (product.ean ? `/products/${product.ean}.png` : null)
  return {
    ...product,
    images,
    image,
  }
}

export function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

export function parseRouteProductRef(raw) {
  const value = decodeURIComponent(raw || '').trim()
  if (!value) return {}
  if (value.startsWith('gp:')) return { canonicalId: value, id: value.slice(3) }
  if (value.startsWith('ean:')) return { canonicalId: value, ean: value.slice(4) }
  if (value.startsWith('demo:')) return { canonicalId: value, demoId: value.slice(5) }
  if (isUuid(value)) return { id: value, canonicalId: `gp:${value}` }
  if (/^\d{8,14}$/.test(value)) return { ean: value, canonicalId: `ean:${value}` }
  return { demoId: value, canonicalId: `demo:${value}` }
}

export function normalizeStringArray(input) {
  if (!input) return []
  if (Array.isArray(input)) {
    return [...new Set(input.map((v) => String(v).trim()).filter(Boolean))]
  }
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      return normalizeStringArray(parsed)
    } catch {
      return [
        ...new Set(
          trimmed
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        ),
      ]
    }
  }
  return []
}

export function parseJson(input, fallback) {
  if (input == null) return fallback
  if (typeof input === 'object') return input
  try {
    return JSON.parse(input)
  } catch {
    return fallback
  }
}

export function normalizeNutrition(input) {
  const raw = parseJson(input, input || {}) || {}
  return {
    kcal: normalizeNumber(raw.kcal ?? raw.calories ?? raw['energy-kcal_100g']),
    protein: normalizeNumber(raw.protein ?? raw.proteins_100g),
    fat: normalizeNumber(raw.fat ?? raw.fat_100g),
    carbs: normalizeNumber(raw.carbs ?? raw.carbohydrates ?? raw.carbohydrates_100g),
    sugar: normalizeNumber(raw.sugar ?? raw.sugars ?? raw.sugars_100g),
    fiber: normalizeNumber(raw.fiber ?? raw.fibre ?? raw.fiber_100g),
    salt: normalizeNumber(raw.salt ?? raw.salt_100g),
    saturatedFat: normalizeNumber(raw.saturatedFat ?? raw['saturated-fat_100g']),
    alcohol: normalizeNumber(raw.alcohol ?? raw.alcohol_100g),
  }
}

export function normalizeManufacturer(manufacturer, country = null) {
  if (manufacturer && typeof manufacturer === 'object') {
    return {
      name: manufacturer.name || null,
      country: manufacturer.country || country || null,
    }
  }
  return {
    name: manufacturer || null,
    country: country || null,
  }
}

export function normalizeSpecs(specs) {
  const raw = parseJson(specs, specs || {}) || {}
  return {
    weight: raw.weight || raw.quantity || null,
    storage: raw.storage || null,
    bestBefore: raw.bestBefore || raw.expiry || null,
    caloriesPerUnit: raw.caloriesPerUnit || raw.calories || null,
  }
}

export function normalizeHalalStatus(value) {
  if (value === true || value === 'yes' || value === 'halal') return 'yes'
  if (value === false || value === 'no') return 'no'
  return 'unknown'
}

export function normalizeNutriscore(value) {
  if (!value) return null
  const normalized = String(value).trim().toUpperCase()
  return /^[A-E]$/.test(normalized) ? normalized : null
}

export function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
