import { buildProductCharacteristicSpecs } from './productSpecs.js'
import { buildProductUnitPrice } from './unitPrice.js'

function hasAnyNutrition(nutrition) {
  if (!nutrition) return false
  return [
    nutrition.kcal,
    nutrition.energy_kcal,
    nutrition.energy_kcal_100g,
    nutrition['energy-kcal_100g'],
    nutrition.protein,
    nutrition.protein_100g,
    nutrition.proteins_100g,
    nutrition.fat,
    nutrition.fat_100g,
    nutrition.carbs,
    nutrition.carbohydrates_100g,
    nutrition.sugar,
    nutrition.sugars_100g,
    nutrition.sugars,
    nutrition.salt,
    nutrition.salt_100g,
  ].some((value) => value != null)
}

function hasText(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

export function hasProductScreenCharacteristics(product, { lang = 'ru' } = {}) {
  if (!product) return false
  return (
    buildProductCharacteristicSpecs(product, { lang }).length > 0 ||
    buildProductUnitPrice(product) != null
  )
}

export function buildProductScreenSectionKeys(product, { lang = 'ru' } = {}) {
  if (!product) return []
  const sectionKeys = []
  if (hasAnyNutrition(product.nutritionPer100)) sectionKeys.push('nutrition')
  if (hasText(product.ingredients)) sectionKeys.push('ingredients')
  if (hasProductScreenCharacteristics(product, { lang })) sectionKeys.push('characteristics')
  if (hasText(product.description)) sectionKeys.push('description')
  return sectionKeys
}
