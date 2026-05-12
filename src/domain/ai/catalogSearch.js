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

function hasUserAllergen(product, profile) {
  const userAllergens = profile?.allergens || []
  if (!userAllergens.length) return false
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
  const tokens = tokenize(query)
  if (!Array.isArray(products) || tokens.length === 0) return []

  return products
    .filter((product) => product?.ean && !hasUserAllergen(product, profile))
    .map((product) => {
      const text = productSearchText(product)
      const matchScore = tokens.reduce((sum, token) => sum + (text.includes(token) ? 4 : 0), 0)
      const availableBoost = product.stockStatus === 'out_of_stock' ? -2 : 2
      const priceBoost = product.priceKzt ? Math.max(0, 1500 - product.priceKzt) / 1000 : 0
      return { product, matchScore, score: matchScore + availableBoost + priceBoost }
    })
    .filter((item) => item.matchScore > 0)
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
