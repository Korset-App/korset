function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3)
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word))
}

function extractBudget(text) {
  const match = text.match(/(?:до|дейін|under)\s*(\d[\d\s]{1,8})/)
  if (!match) return null
  const value = Number(match[1].replace(/\s+/g, ''))
  return Number.isFinite(value) && value > 0 ? value : null
}

function getQueryIntent(query) {
  const text = normalizeText(query)
  const recipeKeywords = []
  if (hasAny(text, ['плов', 'палау'])) {
    recipeKeywords.push(
      { terms: ['рис', 'rice'], score: 10 },
      { terms: ['морковь', 'сәбіз'], score: 8 },
      { terms: ['масло', 'oil'], score: 6 }
    )
  }
  if (hasAny(text, ['ужин', 'кешкі ас'])) {
    recipeKeywords.push(
      { terms: ['кур', 'meat'], score: 8 },
      { terms: ['рис', 'гречка', 'grains'], score: 6 },
      { terms: ['овощ', 'көкөніс'], score: 5 }
    )
  }

  return {
    budget: extractBudget(text),
    halal: hasAny(text, ['халал', 'halal']),
    lactoseFree: hasAny(text, ['без лактоз', 'лактозасыз', 'lactose free']),
    sugarFree: hasAny(text, ['без сахар', 'без сахара', 'қантсыз', 'sugar free']),
    recipeKeywords,
  }
}

function hasUserAllergen(product, profile, intent) {
  const userAllergens = profile?.allergens || []
  if (!userAllergens.length) return false
  if (intent?.lactoseFree && product?.dietTags?.includes('lactose_free')) return false
  const productAllergens = product?.allergens || []
  return productAllergens.some((allergen) => {
    const normalized = String(allergen).replace(/^en:/, '')
    return userAllergens.includes(normalized) || userAllergens.includes(allergen)
  })
}

function productSearchText(product) {
  return normalizeText(
    [
      product.name,
      product.nameKz,
      product.brand,
      product.category,
      product.subcategory,
      product.group,
      product.halalStatus === 'yes' ? 'halal халал' : '',
      ...(product.dietTags || []),
    ].join(' ')
  )
}

export function findCatalogCandidates(query, products = [], profile = null, options = {}) {
  const limit = options.limit || 12
  const intent = getQueryIntent(query)
  const tokens = tokenize(query)
  if (!Array.isArray(products) || (tokens.length === 0 && intent.recipeKeywords.length === 0)) {
    return []
  }

  return products
    .filter((product) => {
      if (!product?.ean || hasUserAllergen(product, profile, intent)) return false
      if (intent.budget && product.priceKzt && product.priceKzt > intent.budget) return false
      return true
    })
    .map((product) => {
      const text = productSearchText(product)
      const matchScore = tokens.reduce((sum, token) => sum + (text.includes(token) ? 4 : 0), 0)
      const recipeScore = intent.recipeKeywords.reduce((sum, keywordGroup) => {
        const matched = keywordGroup.terms.some((term) => text.includes(normalizeText(term)))
        return sum + (matched ? keywordGroup.score : 0)
      }, 0)
      const dietScore =
        (intent.halal && product.halalStatus === 'yes' ? 6 : 0) +
        (intent.lactoseFree && product.dietTags?.includes('lactose_free') ? 8 : 0) +
        (intent.sugarFree && product.dietTags?.includes('sugar_free') ? 6 : 0)
      const availableBoost = product.stockStatus === 'out_of_stock' ? -2 : 2
      const priceBoost = product.priceKzt ? Math.max(0, 1500 - product.priceKzt) / 1000 : 0
      const intentScore = recipeScore + dietScore
      return {
        product,
        matchScore,
        intentScore,
        score: matchScore + intentScore + availableBoost + priceBoost,
      }
    })
    .filter((item) => item.matchScore > 0 || item.intentScore > 0)
    .sort(
      (a, b) =>
        b.score - a.score || (a.product.priceKzt || Infinity) - (b.product.priceKzt || Infinity)
    )
    .slice(0, limit)
    .map((item) => item.product)
}

export function buildCatalogAIContext(products = [], options = {}) {
  const maxItems = options.maxItems || 12
  return products.slice(0, maxItems).map((product) => ({
    ean: product.ean,
    name: product.name,
    brand: product.brand || '',
    category: product.category || '',
    priceKzt: product.priceKzt ?? null,
    stockStatus: product.stockStatus || 'unknown',
    halalStatus: product.halalStatus || 'unknown',
    dietTags: Array.isArray(product.dietTags) ? product.dietTags : [],
    allergens: Array.isArray(product.allergens) ? product.allergens : [],
  }))
}
