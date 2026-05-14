import { parseQuantityTokens } from '../../utils/parseQuantity.js'

const ATTRIBUTE_ALIASES = [
  { key: 'sugar_free', phrases: ['без сахара', 'б сах', 'б.сах', 'sugar free', 'sugar-free'] },
  {
    key: 'gluten_free',
    phrases: ['без глютена', 'без глютен', 'безглютен', 'gluten free', 'gluten-free'],
  },
  { key: 'lactose_free', phrases: ['без лактозы', 'безлактоз', 'lactose free', 'lactose-free'] },
  { key: 'halal', phrases: ['халал', 'halal'] },
  { key: 'protein', phrases: ['протеин', 'белковый', 'protein'] },
]

const QUERY_ALIASES = [
  {
    phrases: ['сникерс'],
    tokens: ['snickers'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['snickers'],
    tokens: ['сникерс'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['доритос'],
    tokens: ['doritos'],
    intent: { category: 'snacks', subcategory: 'chips' },
  },
  {
    phrases: ['doritos'],
    tokens: ['доритос'],
    intent: { category: 'snacks', subcategory: 'chips' },
  },
  {
    phrases: ['кока кола', 'кока-кола', 'coca cola', 'coca-cola'],
    tokens: ['coca', 'cola', 'кока', 'кола'],
    intent: { category: 'water_beverages', subcategory: 'soda' },
  },
  {
    phrases: ['сүт'],
    tokens: ['молоко', 'milk'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
]

const INTENT_RULES = [
  {
    phrases: [
      'молочный шоколад',
      'шоколад молочный',
      'шоколад',
      'chocolate',
      'snickers',
      'сникерс',
    ],
    category: 'sweets',
    subcategory: 'chocolate',
  },
  {
    phrases: ['печенье', 'крекер', 'бисквит', 'cookie', 'biscuit'],
    category: 'sweets',
    subcategory: 'cookies',
  },
  { phrases: ['конфеты', 'конфет', 'candy'], category: 'sweets', subcategory: 'candy' },
  {
    phrases: ['сливочное масло', 'масло сливочное', 'butter'],
    category: 'dairy_eggs',
    subcategory: 'butter',
  },
  {
    phrases: [
      'подсолнечное масло',
      'масло подсолнеч',
      'оливковое масло',
      'масло оливков',
      'растительное масло',
    ],
    category: 'grocery',
    subcategory: 'cooking_oil',
  },
  {
    phrases: [
      'топленое молоко',
      'топленное молоко',
      'топленое',
      'топленное',
      'молоко',
      'молок',
      'milk',
      'сүт',
    ],
    category: 'dairy_eggs',
    subcategory: 'milk',
  },
  {
    phrases: ['кефир', 'айран', 'ряженка', 'йогурт'],
    category: 'dairy_eggs',
    subcategory: 'fermented',
  },
  {
    phrases: ['сыр моцарелла', 'моцарелла', 'сыр ', 'cheese'],
    category: 'dairy_eggs',
    subcategory: 'cheese',
  },
  { phrases: ['сметана', 'сливки', 'cream'], category: 'dairy_eggs', subcategory: 'cream' },
  { phrases: ['творог', 'сырок'], category: 'dairy_eggs', subcategory: 'cottage' },
  { phrases: ['яйцо', 'яйца'], category: 'dairy_eggs', subcategory: 'eggs' },
  { phrases: ['сок', 'juice'], category: 'water_beverages', subcategory: 'juice' },
  { phrases: ['вода', 'water'], category: 'water_beverages', subcategory: 'water' },
  {
    phrases: ['газировка', 'кола', 'cola', 'coca cola', 'coca-cola', 'pepsi', 'fanta', 'sprite'],
    category: 'water_beverages',
    subcategory: 'soda',
  },
  { phrases: ['чай', 'tea'], category: 'tea_coffee', subcategory: 'tea' },
  { phrases: ['кофе', 'coffee'], category: 'tea_coffee', subcategory: 'coffee' },
  {
    phrases: ['чипсы', 'чипс', 'doritos', 'доритос', 'chips'],
    category: 'snacks',
    subcategory: 'chips',
  },
  { phrases: ['сухарики', 'сухарик', 'crackers'], category: 'snacks', subcategory: 'crackers' },
  {
    phrases: ['орехи', 'орех', 'арахис', 'миндаль', 'nuts'],
    category: 'snacks',
    subcategory: 'nuts',
  },
  {
    phrases: ['гречка', 'гречневая крупа', 'крупа гречневая'],
    category: 'grocery',
    subcategory: 'cereals',
  },
  { phrases: ['рис', 'басмати', 'жасмин', 'rice'], category: 'grocery', subcategory: 'rice' },
  {
    phrases: ['макароны', 'спагетти', 'паста', 'pasta'],
    category: 'grocery',
    subcategory: 'pasta',
  },
  { phrases: ['мука', 'flour'], category: 'grocery', subcategory: 'flour' },
  { phrases: ['сахар', 'sugar'], category: 'grocery', subcategory: 'sugar' },
  { phrases: ['соль'], category: 'grocery', subcategory: 'salt' },
  {
    phrases: ['пельмени', 'вареники', 'наггетсы', 'котлеты'],
    category: 'frozen',
    subcategory: 'semi_finished',
  },
  { phrases: ['мороженое', 'пломбир', 'эскимо'], category: 'frozen', subcategory: 'ice_cream' },
  { phrases: ['колбаса', 'сосиски', 'сардельки'], category: 'deli', subcategory: 'sausage' },
  { phrases: ['курица', 'индейка'], category: 'meat', subcategory: 'poultry' },
  { phrases: ['говядина', 'фарш', 'мясо'], category: 'meat', subcategory: 'raw' },
  { phrases: ['рыба', 'форель'], category: 'fish', subcategory: 'fish' },
  { phrases: ['тунец', 'сайра'], category: 'fish', subcategory: 'canned_fish' },
  {
    phrases: ['креветки', 'крабовые палочки', 'морепродукты'],
    category: 'fish',
    subcategory: 'seafood',
  },
  {
    phrases: ['без сахара', 'сахарозаменитель'],
    category: 'healthy',
    subcategory: 'sugar_free',
    attribute: 'sugar_free',
  },
  {
    phrases: ['без глютена', 'безглютен'],
    category: 'healthy',
    subcategory: 'gluten_free',
    attribute: 'gluten_free',
  },
  {
    phrases: ['протеин', 'белковый батончик'],
    category: 'healthy',
    subcategory: 'protein',
    attribute: 'protein',
  },
]

const STOP_WORDS = new Set(['и', 'с', 'со', 'в', 'во', 'на', 'для', 'без', 'with', 'and', 'the'])

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/([0-9]+(?:[.,][0-9]+)?)\s*(кг|гр|г|мл|л|kg|ml|g|l)(?![a-zа-я0-9])/giu, '$1 $2')
    .replace(/[-–—_/.,;:()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value) {
  const normalized = normalizeText(value)
  if (!normalized) return []
  return normalized.split(' ').filter((token) => token && !STOP_WORDS.has(token))
}

function normalizeQuantityToken(token) {
  if (!token) return null
  if (token.unitType === 'volume') {
    const baseValue = token.unit === 'л' ? token.value * 1000 : token.value
    return { unitType: 'volume', baseValue, display: `${baseValue} мл` }
  }
  if (token.unitType === 'weight') {
    const baseValue = token.unit === 'кг' ? token.value * 1000 : token.value
    return { unitType: 'weight', baseValue, display: `${baseValue} г` }
  }
  if (token.unitType === 'pieces') {
    return { unitType: 'pieces', baseValue: token.value, display: `${token.value} ${token.unit}` }
  }
  return null
}

function findQuantity(value) {
  const tokens = parseQuantityTokens(normalizeText(value))
  if (!tokens?.length) return null
  return normalizeQuantityToken(tokens[0])
}

function includesPhrase(text, phrase) {
  return ` ${text} `.includes(` ${normalizeText(phrase)} `)
}

function findAttribute(normalized) {
  for (const attribute of ATTRIBUTE_ALIASES) {
    if (attribute.phrases.some((phrase) => includesPhrase(normalized, phrase))) return attribute.key
  }
  return null
}

function findAliasMatches(normalized) {
  const aliasTokens = []
  let intent = null
  for (const alias of QUERY_ALIASES) {
    if (alias.phrases.some((phrase) => includesPhrase(normalized, phrase))) {
      aliasTokens.push(...alias.tokens)
      intent = intent || alias.intent
    }
  }
  return { aliasTokens: [...new Set(aliasTokens.map(normalizeText).flatMap(tokenize))], intent }
}

function findIntent(normalized, aliasIntent) {
  if (aliasIntent) return aliasIntent
  for (const rule of INTENT_RULES) {
    if (rule.phrases.some((phrase) => includesPhrase(normalized, phrase))) {
      return { category: rule.category, subcategory: rule.subcategory }
    }
  }
  return null
}

function classifyMode(attribute, intent, digitsOnly) {
  if (digitsOnly.length >= 6) return 'ean'
  if (attribute && intent) return 'mixed'
  if (attribute) return 'attribute'
  if (intent) return 'product'
  return 'mixed'
}

export function analyzeCatalogSearchQuery(query) {
  const normalized = normalizeText(query)
  const quantity = findQuantity(normalized)
  const digitsOnly = normalized.replace(/\D/g, '')
  const aliasMatches = findAliasMatches(normalized)
  const attribute = findAttribute(normalized)
  const intent = findIntent(normalized, aliasMatches.intent)
  const tokens = tokenize(normalized).filter(
    (token) => !/^\d/.test(token) && !['мл', 'л', 'г', 'кг'].includes(token)
  )
  return {
    original: String(query || ''),
    normalized,
    tokens,
    aliasTokens: aliasMatches.aliasTokens,
    allTokens: [...new Set([...tokens, ...aliasMatches.aliasTokens])],
    quantity,
    intent,
    attribute,
    mode: classifyMode(attribute, intent, digitsOnly),
    ean: digitsOnly.length >= 6 ? digitsOnly : null,
  }
}

function getProductText(product) {
  return normalizeText(
    [
      product?.name,
      product?.nameKz,
      product?.brand,
      product?.quantity,
      product?.ingredients,
      product?.ingredientsKz,
      ...(Array.isArray(product?.tags) ? product.tags : []),
      ...(Array.isArray(product?.dietTags) ? product.dietTags : []),
      ...(Array.isArray(product?.categoriesTags) ? product.categoriesTags : []),
    ]
      .filter(Boolean)
      .join(' ')
  )
}

function tokenDistance(a, b) {
  if (a === b) return 0
  if (!a || !b) return Math.max(a.length, b.length)
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

function isTokenMatch(queryToken, productToken) {
  if (productToken.includes(queryToken) || queryToken.includes(productToken)) return true
  if (queryToken.length < 4 || productToken.length < 4) return false
  const distance = tokenDistance(queryToken, productToken)
  return distance <= (queryToken.length >= 8 ? 2 : 1)
}

function countMatchedTokens(queryTokens, productTokens) {
  return queryTokens.filter((token) =>
    productTokens.some((productToken) => isTokenMatch(token, productToken))
  ).length
}

function getProductQuantity(product) {
  return product?.quantityParsed
    ? normalizeQuantityToken(product.quantityParsed)
    : findQuantity([product?.quantity, product?.name, product?.nameKz].filter(Boolean).join(' '))
}

function hasAttributeMatch(query, product, productText) {
  if (!query.attribute) return false
  if (query.attribute === 'halal')
    return (
      ['yes', 'halal'].includes(String(product?.halalStatus || '').toLowerCase()) ||
      productText.includes('халал') ||
      productText.includes('halal')
    )
  const values = [
    ...(Array.isArray(product?.tags) ? product.tags : []),
    ...(Array.isArray(product?.dietTags) ? product.dietTags : []),
    ...(Array.isArray(product?.categoriesTags) ? product.categoriesTags : []),
    product?.name,
    product?.ingredients,
  ].map(normalizeText)
  if (query.attribute === 'sugar_free')
    return values.some(
      (value) =>
        value.includes('без сахара') || value.includes('sugar_free') || value.includes('sugar free')
    )
  if (query.attribute === 'gluten_free')
    return values.some(
      (value) =>
        value.includes('без глютен') ||
        value.includes('gluten_free') ||
        value.includes('gluten free')
    )
  if (query.attribute === 'lactose_free')
    return values.some(
      (value) =>
        value.includes('без лактоз') ||
        value.includes('lactose_free') ||
        value.includes('lactose free')
    )
  if (query.attribute === 'protein')
    return values.some(
      (value) => value.includes('протеин') || value.includes('белков') || value.includes('protein')
    )
  return false
}

export function scoreCatalogSearchProduct(queryInput, product) {
  const query = typeof queryInput === 'string' ? analyzeCatalogSearchQuery(queryInput) : queryInput
  const productText = getProductText(product)
  const productTokens = tokenize(productText)
  const matchedTokens = countMatchedTokens(query.allTokens, productTokens)
  const hasAllTokens = query.allTokens.length > 0 && matchedTokens === query.allTokens.length
  const categoryMatch = query.intent?.category && product?.category === query.intent.category
  const subcategoryMatch =
    categoryMatch && query.intent?.subcategory && product?.subcategory === query.intent.subcategory
  const attributeMatch = hasAttributeMatch(query, product, productText)
  const productQuantity = getProductQuantity(product)
  const matchedQuantity = Boolean(
    query.quantity &&
    productQuantity &&
    query.quantity.unitType === productQuantity.unitType &&
    query.quantity.baseValue === productQuantity.baseValue
  )
  const brandText = normalizeText(product?.brand)
  const brandMatched = Boolean(
    brandText &&
    query.tokens.some((token) => isTokenMatch(token, brandText) || brandText.includes(token))
  )

  let score = 0
  let relevanceTier = 9
  let matchType = null

  if (
    query.ean &&
    [product?.ean, ...(Array.isArray(product?.alternateEans) ? product.alternateEans : [])]
      .map(String)
      .includes(query.ean)
  ) {
    score += 10000
    relevanceTier = 0
    matchType = 'ean_exact'
  }

  if (attributeMatch) {
    score += 1600
    relevanceTier = Math.min(relevanceTier, query.intent ? 2 : 1)
    matchType = 'attribute_tag'
  }

  if (subcategoryMatch) {
    score += 2500
    relevanceTier = Math.min(relevanceTier, 1)
    matchType = matchType || 'intent_subcategory'
  } else if (categoryMatch) {
    score += 1400
    relevanceTier = Math.min(relevanceTier, 2)
    matchType = matchType || 'intent_category'
  }

  if (hasAllTokens) {
    score += 1000 + matchedTokens * 120
    relevanceTier = Math.min(relevanceTier, subcategoryMatch ? 1 : 3)
    matchType = matchType || 'all_tokens_name'
  } else if (matchedTokens > 0) {
    score += matchedTokens * 180
    relevanceTier = Math.min(relevanceTier, subcategoryMatch ? 2 : 5)
    matchType = matchType || 'token_fuzzy'
  }

  if (brandMatched && (subcategoryMatch || categoryMatch)) {
    score += 700
    relevanceTier = Math.min(relevanceTier, 1)
    matchType = 'brand_product'
  }

  if (matchedQuantity) score += 350
  if (query.intent && !categoryMatch && matchedTokens > 0) score -= 250
  if (score <= 0) relevanceTier = 99

  return {
    score,
    relevanceTier,
    matchType: matchType || (score > 0 ? 'local_fallback' : null),
    matchedTokens,
    matchedQuantity,
    attributeMatch,
  }
}

export function sortCatalogSearchProducts(products, queryInput, getFitScore = () => 0) {
  const query = typeof queryInput === 'string' ? analyzeCatalogSearchQuery(queryInput) : queryInput
  return [...products]
    .map((product, index) => ({
      product,
      index,
      search: scoreCatalogSearchProduct(query, product),
    }))
    .filter((item) => item.search.score > 0)
    .sort((a, b) => {
      if (a.search.relevanceTier !== b.search.relevanceTier)
        return a.search.relevanceTier - b.search.relevanceTier
      if (b.search.score !== a.search.score) return b.search.score - a.search.score
      const aFit = getFitScore(a.product)
      const bFit = getFitScore(b.product)
      if (aFit !== bFit) return aFit - bFit
      return a.index - b.index
    })
    .map((item) => ({
      ...item.product,
      searchRank: item.search.score,
      matchType: item.search.matchType,
    }))
}
