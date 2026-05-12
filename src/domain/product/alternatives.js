import { checkProductFit } from '../../utils/fitCheck.js'

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

export function findProductInCatalog(catalogProducts = [], ean) {
  if (!Array.isArray(catalogProducts)) return null
  return catalogProducts.find((product) => eanMatches(product, ean)) || null
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
