export function buildAIProductGroups(products = [], options = {}) {
  const maxGroups = options.maxGroups || 4
  const maxProductsPerGroup = options.maxProductsPerGroup || 4
  const groups = []

  for (const product of products) {
    if (!product?.ean) continue
    const id = product.category || 'other'
    let group = groups.find((item) => item.id === id)
    if (!group) {
      if (groups.length >= maxGroups) continue
      group = { id, title: id, products: [] }
      groups.push(group)
    }
    if (group.products.length >= maxProductsPerGroup) continue
    group.products.push({
      ean: product.ean,
      name: product.name,
      brand: product.brand || '',
      category: product.category || '',
      priceKzt: product.priceKzt ?? null,
      stockStatus: product.stockStatus || 'unknown',
      image: product.image || product.imageUrl || null,
    })
  }

  return groups
}

export function normalizeAIResponse(response) {
  if (typeof response === 'string') {
    return { reply: response, productGroups: [], followUps: [], warnings: [], ragUsed: false }
  }

  return {
    reply: typeof response?.reply === 'string' ? response.reply : '',
    productGroups: Array.isArray(response?.productGroups) ? response.productGroups : [],
    followUps: Array.isArray(response?.followUps) ? response.followUps : [],
    warnings: Array.isArray(response?.warnings) ? response.warnings : [],
    ragUsed: Boolean(response?.ragUsed),
  }
}
