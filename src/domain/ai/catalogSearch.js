/**
 * Domain logic for classifying user intent, matching products,
 * and building compact catalog context for AI prompts.
 */

export function findCatalogCandidates(query = '', products = [], profile = null) {
  const cleanQuery = String(query).toLowerCase().trim()

  // 1. Exclude products matching user's allergens if profile is provided
  const userAllergens = profile?.allergens || []
  const filtered = products.filter((p) => {
    if (!p) return false
    const productAllergens = p.allergens || []
    const hasAllergen = productAllergens.some((a) => userAllergens.includes(a))
    return !hasAllergen
  })

  // 2. Score remaining products based on matching words and attributes
  const scored = filtered.map((p) => {
    let score = 0
    const name = String(p.name || '').toLowerCase()
    const brand = String(p.brand || '').toLowerCase()
    const category = String(p.category || '').toLowerCase()

    const words = cleanQuery.split(/[\s,.-]+/)
    for (const word of words) {
      if (word.length <= 1) continue
      if (name.includes(word)) score += 10
      if (brand.includes(word)) score += 5
      if (category.includes(word)) score += 5
    }

    // Boost based on special dietary/halal mentions in query
    if (
      cleanQuery.includes('халал') ||
      cleanQuery.includes('халяль') ||
      cleanQuery.includes('halal')
    ) {
      if (p.halalStatus === 'yes' || p.halal_status === 'yes') score += 15
    }
    if (
      cleanQuery.includes('без сахара') ||
      cleanQuery.includes('sugar free') ||
      cleanQuery.includes('sugar-free')
    ) {
      const diet = p.dietTags || p.diet_tags || []
      if (diet.includes('sugar_free')) score += 15
    }
    if (cleanQuery.includes('веган') || cleanQuery.includes('vegan')) {
      const diet = p.dietTags || p.diet_tags || []
      if (diet.includes('vegan')) score += 15
    }

    return { product: p, score }
  })

  // 3. If there is a non-empty search query, keep only products with score > 0
  let candidates = scored
  if (cleanQuery.length > 0) {
    candidates = scored.filter((item) => item.score > 0)
  }

  // 4. Sort: score (desc), availability (desc), price (asc)
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score

    const aStock = a.product.stockStatus || a.product.stock_status || 'in_stock'
    const bStock = b.product.stockStatus || b.product.stock_status || 'in_stock'
    const stockScore = { in_stock: 3, low_stock: 2, out_of_stock: 1 }
    const aStockPriority = stockScore[aStock] || 3
    const bStockPriority = stockScore[bStock] || 3
    if (bStockPriority !== aStockPriority) return bStockPriority - aStockPriority

    const aPrice = a.product.priceKzt || a.product.price || 0
    const bPrice = b.product.priceKzt || b.product.price || 0
    return aPrice - bPrice
  })

  return candidates.map((item) => item.product)
}

export function buildCatalogAIContext(candidates = [], options = {}) {
  const maxItems = options.maxItems ?? 12
  return candidates.slice(0, maxItems).map((p) => ({
    ean: p.ean || '',
    name: p.name || '',
    brand: p.brand || '',
    category: p.category || '',
    priceKzt: p.priceKzt || p.price || 0,
    stockStatus: p.stockStatus || p.stock_status || 'in_stock',
    halalStatus: p.halalStatus || p.halal_status || 'unknown',
    dietTags: p.dietTags || p.diet_tags || [],
    allergens: p.allergens || [],
  }))
}
