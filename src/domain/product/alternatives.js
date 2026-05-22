import { checkProductFit } from '../../utils/fitCheck.js'
import { getImageUrl } from '../../utils/imageUrl.js'
import { enrichQuantity } from '../../utils/parseQuantity.js'
import { normalizeNutrition, normalizeStringArray, parseJson, withProductImage } from './model.js'
import { normalizeAlternativeScenario } from './alternativeScenarios.js'

function eanMatches(product, ean) {
  if (!product || !ean) return false
  const ref = String(ean)
  if (String(product.ean) === ref) return true
  return Array.isArray(product.alternateEans) && product.alternateEans.map(String).includes(ref)
}

function relationScore(source, candidate) {
  if (source.group && candidate.group && source.group === candidate.group) return 0
  if (source.subcategory && candidate.subcategory && source.subcategory === candidate.subcategory)
    return 1
  if (source.category && candidate.category && source.category === candidate.category) return 2
  return 99
}

function priceDistance(source, candidate) {
  if (source.priceKzt == null || candidate.priceKzt == null) return Number.MAX_SAFE_INTEGER
  return Math.abs(Number(candidate.priceKzt) - Number(source.priceKzt))
}

function normalizeNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function availabilityRank(product = {}) {
  if (product.stockStatus === 'in_stock') return 3
  if (product.stockStatus === 'low_stock') return 2
  if (product.stockStatus === 'out_of_stock') return 0
  return product.alternativeMeta?.availabilityRank ?? 1
}

function hasProfileHalalNeed(profile = {}) {
  return Boolean(profile.halal || profile.halalOnly || profile.halalStrict)
}

function halalRiskRank(product = {}, profile = {}) {
  if (!hasProfileHalalNeed(profile)) return 0
  if (product.halalStatus === 'yes') return 0
  if (product.halalStatus === 'unknown') return 1
  if (product.halalStatus === 'no') return 3
  return 1
}

function getProfileRisk(product = {}, profile = {}) {
  const fit = checkProductFit(product, profile)
  if (fit?.fits === false) return 'avoid'
  if (fit?.verdict === 'warning' || fit?.verdict === 'caution') return 'check'
  if (halalRiskRank(product, profile) >= 3) return 'avoid'
  return 'ok'
}

function profileRiskRank(product = {}, profile = {}) {
  const risk = getProfileRisk(product, profile)
  if (risk === 'avoid') return 3
  if (risk === 'check') return 2
  return 0
}

function compositionRank(product = {}) {
  return product.ingredients || product.ingredientsKz ? 0 : 1
}

function getBaseRank(product = {}) {
  return normalizeNumber(product.alternativeMeta?.baseRank, 0)
}

function getDataCompleteness(product = {}) {
  return normalizeNumber(product.alternativeMeta?.dataCompleteness, 0)
}

function getRelationRank(product = {}) {
  return normalizeNumber(product.alternativeMeta?.relationRank, 99)
}

function getPriceDelta(source = {}, product = {}) {
  const metaDelta = normalizeNumber(product.alternativeMeta?.priceDeltaKzt)
  if (metaDelta !== null) return metaDelta
  if (source.priceKzt == null || product.priceKzt == null) return null
  return Number(product.priceKzt) - Number(source.priceKzt)
}

function decorateAlternative(product = {}, profile = {}) {
  const compositionIncomplete = !(product.ingredients || product.ingredientsKz)
  const unavailable = product.stockStatus === 'out_of_stock'
  const profileRisk = getProfileRisk(product, profile)
  return {
    ...product,
    alternativeMeta: {
      ...(product.alternativeMeta || {}),
      compositionIncomplete,
      unavailable,
      profileRisk,
    },
  }
}

function sortByScenario(a, b, { product, profile, scenario }) {
  const availabilityDiff = availabilityRank(b) - availabilityRank(a)
  const relationDiff = getRelationRank(a) - getRelationRank(b)
  const baseRankDiff = getBaseRank(b) - getBaseRank(a)
  const priceA = getPriceDelta(product, a)
  const priceB = getPriceDelta(product, b)

  if (scenario === 'fits_me') {
    return (
      profileRiskRank(a, profile) - profileRiskRank(b, profile) ||
      compositionRank(a) - compositionRank(b) ||
      halalRiskRank(a, profile) - halalRiskRank(b, profile) ||
      availabilityDiff ||
      relationDiff ||
      baseRankDiff
    )
  }

  if (scenario === 'cheaper') {
    return (
      (priceA ?? Number.MAX_SAFE_INTEGER) - (priceB ?? Number.MAX_SAFE_INTEGER) ||
      availabilityDiff ||
      relationDiff ||
      baseRankDiff
    )
  }

  if (scenario === 'better_composition') {
    return (
      compositionRank(a) - compositionRank(b) ||
      getDataCompleteness(b) - getDataCompleteness(a) ||
      profileRiskRank(a, profile) - profileRiskRank(b, profile) ||
      availabilityDiff ||
      relationDiff ||
      baseRankDiff
    )
  }

  return (
    availabilityDiff ||
    relationDiff ||
    baseRankDiff ||
    priceDistance(product, a) - priceDistance(product, b)
  )
}

export function findProductInCatalog(catalogProducts = [], ean) {
  if (!Array.isArray(catalogProducts)) return null
  return catalogProducts.find((product) => eanMatches(product, ean)) || null
}

export function mapProductAlternativeRpcRows(rows = []) {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => {
    const product = enrichQuantity({
      ean: row.gp_ean || row.ean,
      name: row.local_name || row.name,
      nameKz: row.name_kz || null,
      brand: row.brand || null,
      category: row.category || null,
      subcategory: row.subcategory || null,
      quantity: row.quantity || null,
      group: row.product_group || null,
      image: getImageUrl(row.image_url),
      ingredients: row.ingredients_raw || null,
      ingredientsKz: row.ingredients_kz || null,
      allergens: normalizeStringArray(parseJson(row.allergens_json, [])),
      dietTags: normalizeStringArray(parseJson(row.diet_tags_json, [])),
      traces: normalizeStringArray(parseJson(row.traces_json, [])),
      nutritionPer100: normalizeNutrition(row.nutriments_json),
      halalStatus: row.halal_status || 'unknown',
      packagingType: row.packaging_type || null,
      fatPercent: row.fat_percent ?? null,
      nutriscore: row.nutriscore || null,
      priceKzt: normalizeNumber(row.price_kzt),
      shelf: row.shelf_zone || null,
      stockStatus: row.stock_status || null,
      storeProductId: row.store_product_id || null,
      globalProductId: row.global_product_id || null,
      source: 'store',
      alternateEans: normalizeStringArray(parseJson(row.alternate_eans, [])),
      alternativeMeta: {
        relationRank: normalizeNumber(row.relation_rank, 99),
        priceDeltaKzt: normalizeNumber(row.price_delta_kzt),
        hasComposition: Boolean(row.has_composition),
        dataCompleteness: normalizeNumber(row.data_completeness, 0),
        availabilityRank: normalizeNumber(row.availability_rank, 1),
        baseRank: normalizeNumber(row.base_rank, 0),
        rankReason: row.rank_reason || null,
      },
    })
    return withProductImage(product)
  })
}

export function rankAlternativesForProfile({
  product,
  candidates = [],
  profile = {},
  scenario = 'similar',
  limit = null,
} = {}) {
  if (!product || !Array.isArray(candidates)) return []
  const normalizedScenario = normalizeAlternativeScenario(scenario)
  const visible =
    normalizedScenario === 'cheaper'
      ? candidates.filter((candidate) => {
          const delta = getPriceDelta(product, candidate)
          return delta !== null && delta < 0
        })
      : candidates

  const ranked = visible
    .filter((candidate) => candidate?.ean && !eanMatches(candidate, product.ean))
    .map((candidate) => decorateAlternative(candidate, profile))
    .sort((a, b) => sortByScenario(a, b, { product, profile, scenario: normalizedScenario }))

  return limit ? ranked.slice(0, limit) : ranked
}

export function findProductAlternatives({
  product,
  catalogProducts = [],
  profile = {},
  limit = 6,
} = {}) {
  if (!product || !Array.isArray(catalogProducts)) return []

  return catalogProducts
    .filter((candidate) => candidate?.ean && !eanMatches(candidate, product.ean))
    .map((candidate) => ({
      candidate,
      relation: relationScore(product, candidate),
      fit: checkProductFit(candidate, profile),
      price: priceDistance(product, candidate),
    }))
    .filter((item) => item.relation < 99)
    .sort((a, b) => {
      const aFits = a.fit?.fits !== false ? 0 : 1
      const bFits = b.fit?.fits !== false ? 0 : 1
      return aFits - bFits || a.relation - b.relation || a.price - b.price
    })
    .slice(0, limit)
    .map((item) => item.candidate)
}
