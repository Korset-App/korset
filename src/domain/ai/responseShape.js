import { getCategoryLabel, getSubcategoryLabel } from '../product/categoryMap.js'

const GROUP_TITLES = {
  dairy: 'Молочные продукты',
  dairy_eggs: 'Молочные продукты и яйца',
  sweets: 'Сладости',
  grains: 'Крупы и гарниры',
  grocery: 'Бакалея',
  vegetables: 'Овощи и фрукты',
  fruits: 'Овощи и фрукты',
  meat: 'Мясо и птица',
  water_beverages: 'Напитки',
  snacks: 'Снеки',
  other: 'Другие товары',
}

function getGroupTitle(id) {
  return GROUP_TITLES[id] || id
}

function getProductGroupId(product) {
  if (product.category && product.subcategory) return `${product.category}:${product.subcategory}`
  return product.category || 'other'
}

function getProductGroupTitle(product, lang = 'ru') {
  if (product.category && product.subcategory) {
    const title = getSubcategoryLabel(product.category, product.subcategory, lang)
    if (title) return title
  }
  if (product.category)
    return getCategoryLabel(product.category, lang) || getGroupTitle(product.category)
  return getGroupTitle('other')
}

export function buildAIProductGroups(products = [], options = {}) {
  const maxGroups = options.maxGroups || 4
  const maxProductsPerGroup = options.maxProductsPerGroup || 4
  const lang = options.lang || 'ru'
  const groups = []

  for (const product of products) {
    if (!product?.ean) continue
    const id = getProductGroupId(product)
    let group = groups.find((item) => item.id === id)
    if (!group) {
      if (groups.length >= maxGroups) continue
      group = { id, title: getProductGroupTitle(product, lang), products: [] }
      groups.push(group)
    }
    if (group.products.length >= maxProductsPerGroup) continue
    group.products.push({
      ean: product.ean,
      name: product.name,
      brand: product.brand || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      group: product.group || '',
      priceKzt: product.priceKzt ?? null,
      stockStatus: product.stockStatus || 'unknown',
      image: product.image || product.imageUrl || null,
      quantity: product.quantity || '',
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
