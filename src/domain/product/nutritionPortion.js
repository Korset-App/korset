import { parseQuantityTokens } from '../../utils/parseQuantity.js'

function normalizeNumber(val) {
  if (val == null) return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

export function resolveNutritionPortion(product) {
  if (!product) return null

  // Non-food categories shouldn't offer portion scaling
  const nonFoodCategories = new Set([
    'household',
    'hygiene',
    'pet_supplies',
    'cosmetics',
    'electronics',
    'pharmacy',
    'auto',
    'stationery',
    'textile',
  ])
  if (product.category && nonFoodCategories.has(product.category)) {
    return null
  }

  let parsed = product.quantityParsed || null
  if (!parsed) {
    const raw = product.quantity || product.specs?.weight || product.name || null
    if (raw && typeof raw === 'string') {
      const tokens = parseQuantityTokens(raw)
      if (tokens && tokens.length > 0) {
        const primary =
          tokens.find((t) => t.unitType === 'weight' || t.unitType === 'volume') || tokens[0]
        parsed = {
          value: primary.value,
          unit: primary.unit,
          unitType: primary.unitType,
          isWeightByWeight: primary.isWeightByWeight || false,
        }
      }
    }
  }

  if (!parsed || parsed.isWeightByWeight) return null
  const val = normalizeNumber(parsed.value)
  if (val == null || val <= 0) return null

  const unit = parsed.unit
  const unitType = parsed.unitType

  if (unitType === 'weight') {
    let grams = val
    if (unit === 'кг') {
      grams = val * 1000
    }
    if (!Number.isFinite(grams) || grams <= 0) return null

    const factor = grams / 100
    const displayAmount =
      unit === 'кг' && val < 1
        ? `${Math.round(grams)} г`
        : `${String(val).replace('.', ',')} ${unit}`

    return {
      factor,
      amount: grams,
      displayAmount,
      isLiquid: false,
      isExact100: Math.abs(grams - 100) < 0.001,
      unit,
      unitType: 'weight',
    }
  }

  if (unitType === 'volume') {
    let ml = val
    if (unit === 'л') {
      ml = val * 1000
    }
    if (!Number.isFinite(ml) || ml <= 0) return null

    const factor = ml / 100
    const displayAmount =
      unit === 'л' && val < 1 ? `${Math.round(ml)} мл` : `${String(val).replace('.', ',')} ${unit}`

    return {
      factor,
      amount: ml,
      displayAmount,
      isLiquid: true,
      isExact100: Math.abs(ml - 100) < 0.001,
      unit,
      unitType: 'volume',
    }
  }

  return null
}

function scaleMacro(val, factor) {
  const n = normalizeNumber(val)
  if (n == null) return null
  const scaled = Math.round(n * factor * 10) / 10
  return scaled
}

function scaleEnergy(val, factor) {
  const n = normalizeNumber(val)
  if (n == null) return null
  return Math.round(n * factor)
}

export function computePortionNutrition(nutrition, portionInfo, mode = '100') {
  if (!nutrition) return null
  if (mode !== 'whole' || !portionInfo || portionInfo.factor == null) {
    return {
      ...nutrition,
      _base100: nutrition,
      _isPortion: false,
    }
  }

  const factor = portionInfo.factor

  return {
    ...nutrition,
    kcal: scaleEnergy(nutrition.kcal, factor),
    energy_kcal: scaleEnergy(nutrition.energy_kcal, factor),
    energy_kcal_100g: scaleEnergy(nutrition.energy_kcal_100g, factor),
    'energy-kcal_100g': scaleEnergy(nutrition['energy-kcal_100g'], factor),
    protein: scaleMacro(
      nutrition.protein ?? nutrition.protein_100g ?? nutrition.proteins_100g,
      factor
    ),
    fat: scaleMacro(nutrition.fat ?? nutrition.fat_100g, factor),
    carbs: scaleMacro(nutrition.carbs ?? nutrition.carbohydrates_100g, factor),
    sugar: scaleMacro(nutrition.sugar ?? nutrition.sugars_100g ?? nutrition.sugars, factor),
    salt: scaleMacro(nutrition.salt ?? nutrition.salt_100g, factor),
    fiber: scaleMacro(nutrition.fiber ?? nutrition.fibre ?? nutrition.fiber_100g, factor),
    saturatedFat: scaleMacro(nutrition.saturatedFat ?? nutrition['saturated-fat_100g'], factor),
    _base100: nutrition,
    _isPortion: true,
    _factor: factor,
  }
}
