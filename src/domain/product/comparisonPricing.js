import { computePricePerUnit, parseQuantity } from '../../utils/parseQuantity.js'
import { buildProductUnitPrice } from './unitPrice.js'
import { comparisonNumber } from './comparisonValues.js'

const RATE_UNITS = { kg: 'кг', g: 'г', l: 'л', ml: 'мл' }

export function getComparisonPriceRateUnit(product) {
  if (product?.saleUnit) {
    if (product.saleUnit === 'piece') return null
    return Object.hasOwn(RATE_UNITS, product.saleUnit) ? product.saleUnit : 'unknown'
  }
  const quantity = product?.quantityParsed || parseQuantity(product?.quantity || product?.specs?.weight)
  if (!quantity?.isWeightByWeight) return null
  if (quantity.unit === 'кг') return 'kg'
  if (quantity.unit === 'л') return 'l'
  return 'unknown'
}

export function getComparisonPriceRateSuffix(product) {
  return RATE_UNITS[getComparisonPriceRateUnit(product)] || null
}

export function getComparisonUnitPrice(product, { forDecision = false } = {}) {
  const price = comparisonNumber(product?.priceKzt)
  if (price === null) return null
  const rate = getComparisonPriceRateUnit(product)
  if (rate === 'unknown') return null
  if (rate) {
    return {
      kind: 'per100',
      value: Math.round(price * (rate === 'kg' || rate === 'l' ? 0.1 : 100)),
      suffix: rate === 'kg' || rate === 'g' ? '100 г' : '100 мл',
    }
  }
  if (forDecision) {
    const calculated = buildProductUnitPrice({ ...product, priceKzt: price || 1 })
    return calculated ? { ...calculated, value: price === 0 ? 0 : calculated.value } : null
  }
  const quantity = product?.quantityParsed || product?.quantity || product?.specs?.weight || product?.name
  const calculated = computePricePerUnit(price || 1, quantity)
  if (!calculated) return null
  if (calculated.per100 != null) {
    return { kind: 'per100', value: price === 0 ? 0 : calculated.per100, suffix: calculated.suffix }
  }
  return { kind: 'perUnit', value: price === 0 ? 0 : calculated.perUnit, suffix: calculated.unitSuffix }
}

export function areComparisonUnitsCompatible(unitA, unitB) {
  return Boolean(unitA && unitB && unitA.kind === unitB.kind && unitA.suffix === unitB.suffix)
}

export function areComparisonBasePricesCompatible(productA, productB) {
  const unitA = getComparisonPriceRateUnit(productA)
  const unitB = getComparisonPriceRateUnit(productB)
  return unitA !== 'unknown' && unitB !== 'unknown' && unitA === unitB
}
