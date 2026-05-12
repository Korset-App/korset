const SUGGESTION_KEYS = {
  personal_fit: ['personalFit', 'personalFit'],
  explain_ingredients: ['explainIngredients', 'explainIngredients'],
  ingredient_focus: ['ingredientFocus', 'ingredientFocus'],
  missing_ingredients: ['missingIngredients', 'missingIngredients'],
  allergy_risk: ['allergyRisk', 'allergyRisk'],
  halal_check: ['halalCheck', 'halalCheck'],
  out_of_stock_replace: ['outOfStockReplace', 'outOfStockReplace'],
  better_option: ['betterOption', 'betterOption'],
  category_dairy_use: ['categoryDairyUse', 'categoryDairyUse'],
  category_sweets_sugar: ['categorySweetsSugar', 'categorySweetsSugar'],
  category_beverages_daily: ['categoryBeveragesDaily', 'categoryBeveragesDaily'],
  category_baby_check: ['categoryBabyCheck', 'categoryBabyCheck'],
  category_snacks_frequency: ['categorySnacksFrequency', 'categorySnacksFrequency'],
  packaging_check: ['packagingCheck', 'packagingCheck'],
  usage_ideas: ['usageIdeas', 'usageIdeas'],
}

function createSuggestion(id, priority, kind = 'default', values = {}) {
  const [label, question] = SUGGESTION_KEYS[id]
  return {
    id,
    priority,
    kind,
    labelKey: `ai.productSuggestions.${label}.label`,
    questionKey: `ai.productSuggestions.${question}.question`,
    values,
  }
}

function findIngredientFocus(ingredients) {
  const match = String(ingredients || '').match(/\bE\s?-?\d{3,4}[a-z]?\b/i)
  return match ? match[0].replace(/\s|-/g, '').toUpperCase() : null
}

function categorySuggestion(product) {
  const category = product?.category || ''
  const subcategory = product?.subcategory || ''
  if (category === 'dairy_eggs') return createSuggestion('category_dairy_use', 55)
  if (category === 'sweets') return createSuggestion('category_sweets_sugar', 55)
  if (category === 'water_beverages' || category === 'tea_coffee') {
    return createSuggestion('category_beverages_daily', 55)
  }
  if (category === 'baby_food') return createSuggestion('category_baby_check', 55)
  if (category === 'snacks' || subcategory === 'chips')
    return createSuggestion('category_snacks_frequency', 55)
  return createSuggestion('usage_ideas', 80)
}

function hasAllergyRisk(product, profile) {
  const userAllergens = profile?.allergens || []
  const productAllergens = product?.allergens || []
  if (!userAllergens.length || !productAllergens.length) return false
  return productAllergens.some((allergen) => {
    const normalized = String(allergen).replace(/^en:/, '')
    return userAllergens.includes(normalized) || userAllergens.includes(allergen)
  })
}

export function buildProductAISuggestions({
  product,
  profile = {},
  alternatives = [],
  limit = 5,
} = {}) {
  if (!product) return []

  const suggestions = [createSuggestion('personal_fit', 10)]
  const riskSuggestions = []
  const ingredient = findIngredientFocus(product.ingredients)

  if (hasAllergyRisk(product, profile))
    riskSuggestions.push(createSuggestion('allergy_risk', 20, 'risk'))
  if ((profile.halalOnly || profile.halalStrict) && product.halalStatus !== 'yes') {
    riskSuggestions.push(createSuggestion('halal_check', 25, 'risk'))
  }

  suggestions.push(...riskSuggestions.slice(0, 2))

  if (product.stockStatus === 'out_of_stock' && alternatives.length > 0) {
    suggestions.push(createSuggestion('out_of_stock_replace', 30))
  }

  if (product.ingredients) {
    suggestions.push(
      ingredient
        ? createSuggestion('ingredient_focus', 35, 'default', { ingredient })
        : createSuggestion('explain_ingredients', 40)
    )
  } else {
    suggestions.push(createSuggestion('missing_ingredients', 40))
  }

  if (alternatives.length > 0 && product.stockStatus !== 'out_of_stock') {
    suggestions.push(createSuggestion('better_option', 50))
  }

  suggestions.push(categorySuggestion(product))
  suggestions.push(createSuggestion('packaging_check', 70))
  suggestions.push(createSuggestion('usage_ideas', 90))

  const unique = []
  for (const suggestion of suggestions.sort((a, b) => a.priority - b.priority)) {
    if (!unique.some((item) => item.id === suggestion.id)) unique.push(suggestion)
  }
  return unique.slice(0, limit)
}
