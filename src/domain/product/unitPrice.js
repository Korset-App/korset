import { computePricePerUnit } from '../../utils/parseQuantity.js'

const WEIGHT_VOLUME_CATEGORIES = new Set([
  'dairy_eggs',
  'water_beverages',
  'snacks',
  'sweets',
  'frozen',
  'grocery',
  'bakery',
  'baby_food',
  'healthy',
])

const WEIGHT_VOLUME_SUBCATEGORIES = new Set([
  'milk',
  'kefir',
  'sour_cream',
  'cream',
  'yogurt',
  'cheese',
  'curd',
  'water',
  'juice',
  'energy',
  'soda',
  'chips',
  'crackers',
  'cookies',
  'candy',
  'chocolate',
  'ice_cream',
  'pasta',
  'rice',
  'cereal',
  'sauce',
])

const HIDDEN_WEIGHT_VOLUME_SUBCATEGORIES = new Set([
  'spice',
  'spices',
  'seasoning',
  'tea_bags',
  'capsules',
  'sachets',
  'gum',
])

const PIECE_COMPARABLE_SUBCATEGORIES = new Set(['eggs'])

function getQuantityInput(product) {
  if (!product) return null
  return product.quantityParsed || product.quantity || product.specs?.weight || null
}

function isWeightVolumeComparable(product) {
  const category = product?.category || null
  const subcategory = product?.subcategory || null
  if (subcategory && HIDDEN_WEIGHT_VOLUME_SUBCATEGORIES.has(subcategory)) return false
  if (subcategory && WEIGHT_VOLUME_SUBCATEGORIES.has(subcategory)) return true
  return WEIGHT_VOLUME_CATEGORIES.has(category)
}

function isPieceComparable(product) {
  return PIECE_COMPARABLE_SUBCATEGORIES.has(product?.subcategory)
}

export function buildProductUnitPrice(product) {
  if (!product?.priceKzt) return null
  const calculated = computePricePerUnit(product.priceKzt, getQuantityInput(product))
  if (!calculated) return null

  if (calculated.per100 != null) {
    if (!isWeightVolumeComparable(product)) return null
    return {
      kind: 'per100',
      value: calculated.per100,
      suffix: calculated.suffix,
    }
  }

  if (calculated.perUnit != null) {
    if (!isPieceComparable(product)) return null
    return {
      kind: 'perUnit',
      value: calculated.perUnit,
      suffix: calculated.unitSuffix,
    }
  }

  return null
}
