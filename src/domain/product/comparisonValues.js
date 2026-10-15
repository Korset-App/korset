export function comparisonNumber(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function hasComparisonNutrition(nutrition) {
  return ['kcal', 'protein', 'fat', 'carbs', 'sugar', 'salt', 'fiber', 'saturatedFat', 'alcohol']
    .some((key) => comparisonNumber(nutrition?.[key]) !== null)
}

export function hasComparisonIngredients(product) {
  return [product.ingredients, product.ingredientsKz]
    .some((value) => typeof value === 'string' && value.trim().length > 0)
}
