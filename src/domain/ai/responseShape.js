import { getCategoryLabel, getSubcategoryLabel } from '../product/categoryMap.js'
import { buildSafetyNotes } from './safetyContract.js'

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

const PRODUCT_RESPONSE_TEXT = {
  ru: {
    verdict: {
      chooseAnother: 'Лучше выбрать другое',
      notHalal: 'Не подходит под halal-запрос',
      packageCheck: 'Нужно проверить упаковку',
      partialFit: 'Подходит не полностью уверенно',
      bestChoice: 'Хорошо подходит по данным карточки',
      goodOption: 'Выглядит подходящим вариантом',
    },
    checks: {
      ingredients: 'Состав и пищевые добавки',
      allergens: 'Следы аллергенов',
      halal: 'Halal-маркировку или сертификат',
    },
  },
  kz: {
    verdict: {
      chooseAnother: 'Басқа нұсқаны таңдаған дұрыс',
      notHalal: 'Halal сұранысына сай емес',
      packageCheck: 'Қаптамадан тексеру керек',
      partialFit: 'Толық сенімді емес',
      bestChoice: 'Карточка деректері бойынша жақсы сай келеді',
      goodOption: 'Жақсы нұсқа болып көрінеді',
    },
    checks: {
      ingredients: 'Құрамы мен тағамдық қоспалары',
      allergens: 'Аллерген іздері',
      halal: 'Halal белгісі немесе сертификаты',
    },
  },
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
    return {
      reply: response,
      productGroups: [],
      followUps: [],
      warnings: [],
      verdict: null,
      confidenceNotes: [],
      checkOnPackage: [],
      alternatives: [],
      externalReference: null,
      externalEnrichmentStatus: null,
      ragUsed: false,
    }
  }

  return {
    reply: typeof response?.reply === 'string' ? response.reply : '',
    productGroups: Array.isArray(response?.productGroups) ? response.productGroups : [],
    followUps: Array.isArray(response?.followUps) ? response.followUps : [],
    warnings: Array.isArray(response?.warnings) ? response.warnings : [],
    verdict: normalizeProductVerdict(response?.verdict),
    confidenceNotes: normalizeStringList(response?.confidenceNotes, 6, 240),
    checkOnPackage: normalizeStringList(response?.checkOnPackage, 6, 160),
    alternatives: normalizeProductAlternatives(response?.alternatives),
    externalReference: normalizeExternalReference(response?.externalReference),
    externalEnrichmentStatus:
      typeof response?.externalEnrichmentStatus === 'string'
        ? response.externalEnrichmentStatus.slice(0, 60)
        : null,
    ragUsed: Boolean(response?.ragUsed),
  }
}

function normalizeExternalReference(value) {
  if (!value || typeof value !== 'object') return null
  return {
    text: typeof value.text === 'string' ? value.text.trim().slice(0, 600) : '',
    sourceLabel: typeof value.sourceLabel === 'string' ? value.sourceLabel.trim().slice(0, 80) : '',
    externalConfidence:
      typeof value.externalConfidence === 'string'
        ? value.externalConfidence.trim().slice(0, 80)
        : '',
    needsPackageCheck: Boolean(value.needsPackageCheck),
  }
}

function normalizeStringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function normalizeProductVerdict(value) {
  if (!value || typeof value !== 'object') return null
  const allowedLabels = new Set([
    'best_choice',
    'good_option',
    'fits_but_check',
    'choose_another',
    'insufficient_data',
  ])
  const label = allowedLabels.has(value.label) ? value.label : 'insufficient_data'
  return {
    label,
    title: typeof value.title === 'string' ? value.title.trim().slice(0, 120) : '',
    tone: ['positive', 'neutral', 'caution', 'danger'].includes(value.tone)
      ? value.tone
      : 'neutral',
  }
}

function normalizeProductAlternatives(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object' && item.ean)
    .slice(0, 5)
    .map((item) => ({
      ean: String(item.ean).slice(0, 32),
      name: typeof item.name === 'string' ? item.name.slice(0, 200) : '',
      brand: typeof item.brand === 'string' ? item.brand.slice(0, 100) : '',
      category: typeof item.category === 'string' ? item.category.slice(0, 80) : '',
      subcategory: typeof item.subcategory === 'string' ? item.subcategory.slice(0, 80) : '',
      priceKzt: Number.isFinite(Number(item.priceKzt)) ? Number(item.priceKzt) : null,
      stockStatus: typeof item.stockStatus === 'string' ? item.stockStatus.slice(0, 40) : 'unknown',
      image: typeof item.image === 'string' ? item.image.slice(0, 500) : null,
      quantity: typeof item.quantity === 'string' ? item.quantity.slice(0, 80) : '',
    }))
}

function getProductResponseText(lang) {
  return PRODUCT_RESPONSE_TEXT[lang === 'kz' ? 'kz' : 'ru']
}

function getProductVerdict(safetyNotes, profile, lang) {
  const text = getProductResponseText(lang).verdict
  if (safetyNotes.allergy.level === 'direct_match') {
    return { label: 'choose_another', title: text.chooseAnother, tone: 'danger' }
  }
  if ((profile?.halal || profile?.halalOnly) && safetyNotes.halal.level === 'not_halal') {
    return { label: 'choose_another', title: text.notHalal, tone: 'danger' }
  }
  if (safetyNotes.allergy.level === 'insufficient_data') {
    return { label: 'insufficient_data', title: text.packageCheck, tone: 'caution' }
  }
  if (['questionable', 'insufficient_data'].includes(safetyNotes.halal.level)) {
    return { label: 'fits_but_check', title: text.partialFit, tone: 'caution' }
  }
  if (safetyNotes.halal.level === 'confirmed_halal') {
    return { label: 'best_choice', title: text.bestChoice, tone: 'positive' }
  }
  return { label: 'good_option', title: text.goodOption, tone: 'positive' }
}

function getPackageChecks(safetyNotes, product, lang) {
  const text = getProductResponseText(lang).checks
  const checks = []
  if (!product?.ingredients && !product?.ingredientsKz) checks.push(text.ingredients)
  if (safetyNotes.allergy.level !== 'not_personalized') checks.push(text.allergens)
  if (
    ['likely_compatible', 'questionable', 'insufficient_data'].includes(safetyNotes.halal.level)
  ) {
    checks.push(text.halal)
  }
  return [...new Set(checks)].slice(0, 5)
}

export function buildProductAIResponseMeta({
  product = {},
  profile = {},
  alternatives = [],
  lang = 'ru',
} = {}) {
  const safetyNotes = buildSafetyNotes({ product, profile, lang })
  const verdict = getProductVerdict(safetyNotes, profile, lang)
  const warnings = []
  if (safetyNotes.allergy.level === 'direct_match') {
    warnings.push('allergy_direct_match')
  }
  if (safetyNotes.halal.level === 'not_halal') warnings.push('not_halal')
  if (safetyNotes.halal.level === 'questionable') warnings.push('halal_questionable')
  if (safetyNotes.halal.level === 'insufficient_data') warnings.push('missing_composition')

  return {
    verdict,
    confidenceNotes: safetyNotes.userNotes,
    checkOnPackage: getPackageChecks(safetyNotes, product, lang),
    alternatives: normalizeProductAlternatives(alternatives),
    warnings,
  }
}
