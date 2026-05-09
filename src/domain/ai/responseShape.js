/**
 * Domain logic for shaping and normalizing AI responses and product groupings.
 */

export function buildAIProductGroups(products = [], options = {}) {
  const maxGroups = options.maxGroups ?? 10
  const maxProductsPerGroup = options.maxProductsPerGroup ?? 5

  const groupsMap = new Map()

  for (const p of products) {
    if (!p) continue
    const cat = p.category || 'other'
    if (!groupsMap.has(cat)) {
      groupsMap.set(cat, [])
    }
    groupsMap.get(cat).push({
      ean: p.ean || '',
      name: p.name || '',
      brand: p.brand || '',
      category: cat,
      priceKzt: p.priceKzt || p.price || 0,
      stockStatus: p.stockStatus || p.stock_status || 'in_stock',
      ...(p.image ? { image: p.image } : {}),
    })
  }

  const groups = []
  for (const [cat, catProducts] of groupsMap.entries()) {
    groups.push({
      id: cat,
      title: cat,
      products: catProducts.slice(0, maxProductsPerGroup),
    })
  }

  return groups.slice(0, maxGroups)
}

export function normalizeAIResponse(response) {
  if (typeof response === 'string') {
    return {
      reply: response,
      productGroups: [],
      followUps: [],
      warnings: [],
      ragUsed: false,
    }
  }

  return {
    reply: response?.reply || '',
    productGroups: response?.productGroups || [],
    followUps: response?.followUps || [],
    warnings: response?.warnings || [],
    ragUsed: response?.ragUsed || false,
  }
}
