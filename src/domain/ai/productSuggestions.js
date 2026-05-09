const RISK_LIMIT = 2
const DEFAULT_LIMIT = 5

const ADDITIVE_RE = /\bE\s?\d{3,4}[a-z]?\b/i

const CATEGORY_SUGGESTIONS = {
  dairy_eggs: {
    id: 'category_dairy_use',
    labelKey: 'ai.productSuggestions.categoryDairyUse.label',
    questionKey: 'ai.productSuggestions.categoryDairyUse.question',
    priority: 50,
    kind: 'use',
  },
  dairy: {
    id: 'category_dairy_use',
    labelKey: 'ai.productSuggestions.categoryDairyUse.label',
    questionKey: 'ai.productSuggestions.categoryDairyUse.question',
    priority: 50,
    kind: 'use',
  },
  sweets: {
    id: 'category_sweets_sugar',
    labelKey: 'ai.productSuggestions.categorySweetsSugar.label',
    questionKey: 'ai.productSuggestions.categorySweetsSugar.question',
    priority: 50,
    kind: 'use',
  },
  beverages: {
    id: 'category_beverages_daily',
    labelKey: 'ai.productSuggestions.categoryBeveragesDaily.label',
    questionKey: 'ai.productSuggestions.categoryBeveragesDaily.question',
    priority: 50,
    kind: 'use',
  },
  water_beverages: {
    id: 'category_beverages_daily',
    labelKey: 'ai.productSuggestions.categoryBeveragesDaily.label',
    questionKey: 'ai.productSuggestions.categoryBeveragesDaily.question',
    priority: 50,
    kind: 'use',
  },
  baby_food: {
    id: 'category_baby_check',
    labelKey: 'ai.productSuggestions.categoryBabyCheck.label',
    questionKey: 'ai.productSuggestions.categoryBabyCheck.question',
    priority: 50,
    kind: 'risk',
  },
  snacks: {
    id: 'category_snacks_frequency',
    labelKey: 'ai.productSuggestions.categorySnacksFrequency.label',
    questionKey: 'ai.productSuggestions.categorySnacksFrequency.question',
    priority: 50,
    kind: 'use',
  },
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim().toLowerCase()
}

function getIngredients(product) {
  return [
    product?.ingredients,
    product?.ingredientsKz,
    product?.ingredients_raw,
    product?.ingredients_text,
  ]
    .filter(hasText)
    .join(' ')
}

function getCategoryKey(product) {
  const category = normalizeText(product?.category)
  const subcategory = normalizeText(product?.subcategory)
  const group = normalizeText(product?.group)
  const haystack = `${category} ${subcategory} ${group}`

  if (haystack.includes('baby')) return 'baby_food'
  if (haystack.includes('snack') || haystack.includes('chips')) return 'snacks'
  if (haystack.includes('sweet') || haystack.includes('chocolate') || haystack.includes('candy'))
    return 'sweets'
  if (haystack.includes('beverage') || haystack.includes('drink') || haystack.includes('water'))
    return 'beverages'
  if (
    haystack.includes('dairy') ||
    haystack.includes('milk') ||
    haystack.includes('yogurt') ||
    haystack.includes('cheese') ||
    haystack.includes('egg')
  )
    return 'dairy_eggs'
  if (haystack.includes('grain') || haystack.includes('pasta') || haystack.includes('bread'))
    return 'grains'

  return category || subcategory || group
}

function extractIngredientFocus(ingredients) {
  const additive = ingredients.match(ADDITIVE_RE)?.[0]?.replace(/\s+/g, '').toUpperCase()
  if (additive) return additive

  const normalized = normalizeText(ingredients)
  const interesting = [
    ['maltodextrin', 'maltodextrin'],
    ['мальтодекстрин', 'мальтодекстрин'],
    ['aspartame', 'aspartame'],
    ['аспартам', 'аспартам'],
    ['gelatin', 'gelatin'],
    ['желатин', 'желатин'],
    ['carrageenan', 'carrageenan'],
    ['каррагинан', 'каррагинан'],
  ]

  return interesting.find(([needle]) => normalized.includes(needle))?.[1] || null
}

function hasUserAllergens(profile) {
  return Array.isArray(profile?.allergens) && profile.allergens.length > 0
}

function hasProductAllergens(product) {
  return Array.isArray(product?.allergens) && product.allergens.length > 0
}

function wantsHalal(profile) {
  return Boolean(
    profile?.halalOnly || profile?.halalStrict || profile?.dietGoals?.includes?.('halal')
  )
}

function getHalalStatus(product) {
  return product?.halalStatus || product?.halal_status || 'unknown'
}

function addSuggestion(list, suggestion, values = {}) {
  if (!suggestion) return
  list.push({ ...suggestion, values: { ...(suggestion.values || {}), ...values } })
}

function selectSuggestions(candidates, limit) {
  const selected = []
  const seen = new Set()
  let riskCount = 0

  for (const candidate of candidates.sort((a, b) => a.priority - b.priority)) {
    if (!candidate || seen.has(candidate.id)) continue
    if (candidate.kind === 'risk' && riskCount >= RISK_LIMIT) continue
    selected.push(candidate)
    seen.add(candidate.id)
    if (candidate.kind === 'risk') riskCount += 1
    if (selected.length >= limit) break
  }

  return selected
}

export function buildProductAISuggestions({
  product,
  profile = {},
  alternatives = [],
  limit = DEFAULT_LIMIT,
} = {}) {
  if (!product) return []

  const ingredients = getIngredients(product)
  const hasIngredients = hasText(ingredients)
  const categoryKey = getCategoryKey(product)
  const ingredientFocus = hasIngredients ? extractIngredientFocus(ingredients) : null
  const halalStatus = getHalalStatus(product)
  const candidates = []

  addSuggestion(candidates, {
    id: 'personal_fit',
    labelKey: 'ai.productSuggestions.personalFit.label',
    questionKey: 'ai.productSuggestions.personalFit.question',
    priority: 10,
    kind: 'personal',
  })

  if (hasUserAllergens(profile) || hasProductAllergens(product)) {
    addSuggestion(candidates, {
      id: 'allergy_risk',
      labelKey: 'ai.productSuggestions.allergyRisk.label',
      questionKey: 'ai.productSuggestions.allergyRisk.question',
      priority: 20,
      kind: 'risk',
    })
  }

  if (wantsHalal(profile) || halalStatus === 'no') {
    addSuggestion(candidates, {
      id: 'halal_check',
      labelKey: 'ai.productSuggestions.halalCheck.label',
      questionKey: 'ai.productSuggestions.halalCheck.question',
      priority: wantsHalal(profile) ? 24 : 74,
      kind: 'risk',
    })
  }

  if (product.stockStatus === 'out_of_stock' || product.stock_status === 'out_of_stock') {
    addSuggestion(candidates, {
      id: 'out_of_stock_replace',
      labelKey: 'ai.productSuggestions.outOfStockReplace.label',
      questionKey: 'ai.productSuggestions.outOfStockReplace.question',
      priority: 30,
      kind: 'buy',
    })
  }

  if (ingredientFocus) {
    addSuggestion(
      candidates,
      {
        id: 'ingredient_focus',
        labelKey: 'ai.productSuggestions.ingredientFocus.label',
        questionKey: 'ai.productSuggestions.ingredientFocus.question',
        priority: 32,
        kind: 'explain',
      },
      { ingredient: ingredientFocus }
    )
  }

  addSuggestion(candidates, {
    id: hasIngredients ? 'explain_ingredients' : 'missing_ingredients',
    labelKey: hasIngredients
      ? 'ai.productSuggestions.explainIngredients.label'
      : 'ai.productSuggestions.missingIngredients.label',
    questionKey: hasIngredients
      ? 'ai.productSuggestions.explainIngredients.question'
      : 'ai.productSuggestions.missingIngredients.question',
    priority: hasIngredients ? 34 : 36,
    kind: 'explain',
  })

  if (alternatives.length > 0) {
    addSuggestion(candidates, {
      id: 'better_option',
      labelKey: 'ai.productSuggestions.betterOption.label',
      questionKey: 'ai.productSuggestions.betterOption.question',
      priority: 38,
      kind: 'buy',
    })
  }

  addSuggestion(candidates, CATEGORY_SUGGESTIONS[categoryKey])

  addSuggestion(candidates, {
    id: 'packaging_check',
    labelKey: 'ai.productSuggestions.packagingCheck.label',
    questionKey: 'ai.productSuggestions.packagingCheck.question',
    priority: 80,
    kind: 'check',
  })

  addSuggestion(candidates, {
    id: 'usage_ideas',
    labelKey: 'ai.productSuggestions.usageIdeas.label',
    questionKey: 'ai.productSuggestions.usageIdeas.question',
    priority: 90,
    kind: 'use',
  })

  return selectSuggestions(candidates, limit)
}
