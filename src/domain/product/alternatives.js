import { checkProductFit } from '../../utils/fitCheck.js'

function normalizeRef(value) {
  return value == null ? '' : String(value).trim()
}

function getProductRefs(product) {
  const refs = [product?.ean, ...(product?.alternateEans || []), ...(product?.alternate_eans || [])]
  return refs.map(normalizeRef).filter(Boolean)
}

function getPriceDelta(product, target) {
  const productPrice = Number(product?.priceKzt)
  const targetPrice = Number(target?.priceKzt)
  if (!Number.isFinite(productPrice) || !Number.isFinite(targetPrice))
    return Number.MAX_SAFE_INTEGER
  return Math.abs(productPrice - targetPrice)
}

function getRelationRank(candidate, target) {
  if (target?.group && candidate?.group === target.group) return 0
  if (target?.subcategory && candidate?.subcategory === target.subcategory) return 1
  if (target?.category && candidate?.category === target.category) return 2
  return 3
}

export function findProductInCatalog(catalogProducts, ref) {
  const normalizedRef = normalizeRef(ref)
  if (!normalizedRef) return null
  return (
    (catalogProducts || []).find((product) => getProductRefs(product).includes(normalizedRef)) ||
    null
  )
}

export function findProductAlternatives({ product, catalogProducts, profile, limit = 6 }) {
  if (!product || !Array.isArray(catalogProducts) || catalogProducts.length === 0) return []

  const originalRefs = new Set(getProductRefs(product))

  return catalogProducts
    .filter((candidate) => {
      if (!candidate) return false
      if (getProductRefs(candidate).some((ref) => originalRefs.has(ref))) return false
      return getRelationRank(candidate, product) < 3
    })
    .sort((a, b) => {
      const aFit = checkProductFit(a, profile || {}).fits ? 0 : 1
      const bFit = checkProductFit(b, profile || {}).fits ? 0 : 1
      if (aFit !== bFit) return aFit - bFit

      const relationDelta = getRelationRank(a, product) - getRelationRank(b, product)
      if (relationDelta !== 0) return relationDelta

      const priceDelta = getPriceDelta(a, product) - getPriceDelta(b, product)
      if (priceDelta !== 0) return priceDelta

      return normalizeRef(a.ean).localeCompare(normalizeRef(b.ean))
    })
    .slice(0, limit)
}
