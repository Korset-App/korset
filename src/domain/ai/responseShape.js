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

const MENTION_STOP_WORDS = new Set([
  'товар',
  'товары',
  'вариант',
  'варианты',
  'есть',
  'вижу',
  'могу',
  'предложить',
  'магазине',
  'напиток',
  'нектар',
  'масло',
  'рис',
])

function normalizeMentionText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
}

function getMentionTokens(value) {
  return normalizeMentionText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !MENTION_STOP_WORDS.has(token))
}

function getReplyMentionScore(product, replyText) {
  const reply = normalizeMentionText(replyText)
  if (!reply) return 0

  let score = 0
  const name = normalizeMentionText(product.name)
  const brand = normalizeMentionText(product.brand)
  const quantity = normalizeMentionText(product.quantity)

  if (name.length >= 8 && reply.includes(name)) score += 24
  if (brand.length >= 3 && reply.includes(brand)) score += 14
  if (quantity.length >= 2 && reply.includes(quantity)) score += 4

  const tokens = getMentionTokens(product.name)
  const matchedTokens = tokens.filter((token) => reply.includes(token))
  score += matchedTokens.length * 4
  if (matchedTokens.length >= Math.min(2, tokens.length) && matchedTokens.length > 0) {
    score += 8
  }

  return score
}

function alignProductsWithReply(products, replyText) {
  if (!replyText) return products

  const ranked = products
    .map((product, index) => ({
      product,
      index,
      mentionScore: getReplyMentionScore(product, replyText),
    }))
    .sort((a, b) => b.mentionScore - a.mentionScore || a.index - b.index)

  const mentioned = ranked.filter((item) => item.mentionScore >= 8)
  if (mentioned.length >= 2) return mentioned.map((item) => item.product)
  return ranked.map((item) => item.product)
}

export function buildAIProductGroups(products = [], options = {}) {
  const maxGroups = options.maxGroups || 4
  const maxProductsPerGroup = options.maxProductsPerGroup || 4
  const lang = options.lang || 'ru'
  const alignedProducts = alignProductsWithReply(products, options.replyText)
  const groups = []

  for (const product of alignedProducts) {
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
