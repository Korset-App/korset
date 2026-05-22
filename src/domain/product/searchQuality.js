import { parseQuantityTokens } from '../../utils/parseQuantity.js'
import { NAME_KEYWORDS, DEACTIVATE } from './categoryMap.js'

const CATEGORY_MAP_DEACTIVATE = DEACTIVATE || '__deactivate__'

const ATTRIBUTE_ALIASES = [
  { key: 'sugar_free', phrases: ['без сахара', 'б сах', 'б.сах', 'sugar free', 'sugar-free'] },
  {
    key: 'gluten_free',
    phrases: ['без глютена', 'без глютен', 'безглютен', 'gluten free', 'gluten-free'],
  },
  { key: 'lactose_free', phrases: ['без лактозы', 'безлактоз', 'lactose free', 'lactose-free'] },
  { key: 'halal', phrases: ['халал', 'halal'] },
  { key: 'protein', phrases: ['протеин', 'белковый', 'protein'] },
  { key: 'vegan', phrases: ['веган', 'vegan', 'растительный'] },
  { key: 'organic', phrases: ['органик', 'organic', 'органика', 'био'] },
  { key: 'keto', phrases: ['кето', 'keto', 'кетогенный'] },
  { key: 'palm_oil', phrases: ['пальмовое масло', 'пальмовый жир', 'palm oil'] },
  { key: 'low_calorie', phrases: ['низкокалорийный', 'низкая калорийность', 'low calorie'] },
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
    phrases: ['твикс'],
    tokens: ['twix'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['twix'],
    tokens: ['твикс'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['баунти'],
    tokens: ['bounty'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['bounty'],
    tokens: ['баунти'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['кит кат', 'кит-кат', 'киткат'],
    tokens: ['kitkat'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['kitkat'],
    tokens: ['киткат'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['милка'],
    tokens: ['milka'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['milka'],
    tokens: ['милка'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['нутелла'],
    tokens: ['nutella'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['nutella'],
    tokens: ['нутелла'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['виспа'],
    tokens: ['wispa'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['wispa'],
    tokens: ['виспа'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['тофифи'],
    tokens: ['toffifee'],
    intent: { category: 'sweets', subcategory: 'candy' },
  },
  {
    phrases: ['toffifee'],
    tokens: ['тофифи'],
    intent: { category: 'sweets', subcategory: 'candy' },
  },
  { phrases: ['рошен'], tokens: ['roshen'], intent: { category: 'sweets', subcategory: 'candy' } },
  { phrases: ['roshen'], tokens: ['рошен'], intent: { category: 'sweets', subcategory: 'candy' } },
  {
    phrases: ['баян сулу'],
    tokens: ['баян сулу'],
    intent: { category: 'sweets', subcategory: 'candy' },
  },
  {
    phrases: ['альпен голд', 'альпенголд'],
    tokens: ['alpen gold'],
    intent: { category: 'sweets', subcategory: 'chocolate' },
  },
  {
    phrases: ['alpen gold'],
    tokens: ['альпен голд'],
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
    phrases: ['лейс', 'лейз'],
    tokens: ['lays'],
    intent: { category: 'snacks', subcategory: 'chips' },
  },
  {
    phrases: ['lays', "lay's"],
    tokens: ['лейс'],
    intent: { category: 'snacks', subcategory: 'chips' },
  },
  {
    phrases: ['принглс'],
    tokens: ['pringles'],
    intent: { category: 'snacks', subcategory: 'chips' },
  },
  {
    phrases: ['pringles'],
    tokens: ['принглс'],
    intent: { category: 'snacks', subcategory: 'chips' },
  },
  {
    phrases: ['кока кола', 'кока-кола', 'coca cola', 'coca-cola'],
    tokens: ['coca cola'],
    intent: { category: 'water_beverages', subcategory: 'soda' },
  },
  {
    phrases: ['пепси'],
    tokens: ['pepsi'],
    intent: { category: 'water_beverages', subcategory: 'soda' },
  },
  {
    phrases: ['pepsi'],
    tokens: ['пепси'],
    intent: { category: 'water_beverages', subcategory: 'soda' },
  },
  {
    phrases: ['фанта'],
    tokens: ['fanta'],
    intent: { category: 'water_beverages', subcategory: 'soda' },
  },
  {
    phrases: ['fanta'],
    tokens: ['фанта'],
    intent: { category: 'water_beverages', subcategory: 'soda' },
  },
  {
    phrases: ['спрайт'],
    tokens: ['sprite'],
    intent: { category: 'water_beverages', subcategory: 'soda' },
  },
  {
    phrases: ['sprite'],
    tokens: ['спрайт'],
    intent: { category: 'water_beverages', subcategory: 'soda' },
  },
  {
    phrases: ['ред булл', 'ред бул'],
    tokens: ['red bull'],
    intent: { category: 'water_beverages', subcategory: 'energy' },
  },
  {
    phrases: ['red bull'],
    tokens: ['ред булл'],
    intent: { category: 'water_beverages', subcategory: 'energy' },
  },
  {
    phrases: ['нескафе'],
    tokens: ['nescafe'],
    intent: { category: 'tea_coffee', subcategory: 'coffee' },
  },
  {
    phrases: ['nescafe'],
    tokens: ['нескафе'],
    intent: { category: 'tea_coffee', subcategory: 'coffee' },
  },
  {
    phrases: ['якобс'],
    tokens: ['jacobs'],
    intent: { category: 'tea_coffee', subcategory: 'coffee' },
  },
  {
    phrases: ['jacobs'],
    tokens: ['якобс'],
    intent: { category: 'tea_coffee', subcategory: 'coffee' },
  },
  { phrases: ['ахмад'], tokens: ['ahmad'], intent: { category: 'tea_coffee', subcategory: 'tea' } },
  { phrases: ['ahmad'], tokens: ['ахмад'], intent: { category: 'tea_coffee', subcategory: 'tea' } },
  {
    phrases: ['липтон'],
    tokens: ['lipton'],
    intent: { category: 'tea_coffee', subcategory: 'tea' },
  },
  {
    phrases: ['lipton'],
    tokens: ['липтон'],
    intent: { category: 'tea_coffee', subcategory: 'tea' },
  },
  {
    phrases: ['гринфилд'],
    tokens: ['greenfield'],
    intent: { category: 'tea_coffee', subcategory: 'tea' },
  },
  {
    phrases: ['greenfield'],
    tokens: ['гринфилд'],
    intent: { category: 'tea_coffee', subcategory: 'tea' },
  },
  {
    phrases: ['дилма'],
    tokens: ['dilmah'],
    intent: { category: 'tea_coffee', subcategory: 'tea' },
  },
  {
    phrases: ['dilmah'],
    tokens: ['дилма'],
    intent: { category: 'tea_coffee', subcategory: 'tea' },
  },
  {
    phrases: ['эмил', 'эмиль'],
    tokens: ['эмиль'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['простоквашино'],
    tokens: ['простоквашино'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['даниссимо'],
    tokens: ['danissimo'],
    intent: { category: 'dairy_eggs', subcategory: 'fermented' },
  },
  {
    phrases: ['danissimo'],
    tokens: ['даниссимо'],
    intent: { category: 'dairy_eggs', subcategory: 'fermented' },
  },
  {
    phrases: ['президент'],
    tokens: ['president'],
    intent: { category: 'dairy_eggs', subcategory: 'cheese' },
  },
  {
    phrases: ['president'],
    tokens: ['президент'],
    intent: { category: 'dairy_eggs', subcategory: 'cheese' },
  },
  {
    phrases: ['пармалат'],
    tokens: ['parmalat'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['parmalat'],
    tokens: ['пармалат'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['лактел'],
    tokens: ['lactel'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['lactel'],
    tokens: ['лактел'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['боржоми'],
    tokens: ['borjomi'],
    intent: { category: 'water_beverages', subcategory: 'water' },
  },
  {
    phrases: ['borjomi'],
    tokens: ['боржоми'],
    intent: { category: 'water_beverages', subcategory: 'water' },
  },
  {
    phrases: ['фейри'],
    tokens: ['fairy'],
    intent: { category: 'household', subcategory: 'cleaning' },
  },
  {
    phrases: ['fairy'],
    tokens: ['фейри'],
    intent: { category: 'household', subcategory: 'cleaning' },
  },
  {
    phrases: ['доместос'],
    tokens: ['domestos'],
    intent: { category: 'household', subcategory: 'cleaning' },
  },
  {
    phrases: ['domestos'],
    tokens: ['доместос'],
    intent: { category: 'household', subcategory: 'cleaning' },
  },
  {
    phrases: ['тайд'],
    tokens: ['tide'],
    intent: { category: 'household', subcategory: 'laundry' },
  },
  {
    phrases: ['tide'],
    tokens: ['тайд'],
    intent: { category: 'household', subcategory: 'laundry' },
  },
  {
    phrases: ['барилла'],
    tokens: ['barilla'],
    intent: { category: 'grocery', subcategory: 'pasta' },
  },
  {
    phrases: ['barilla'],
    tokens: ['барилла'],
    intent: { category: 'grocery', subcategory: 'pasta' },
  },
  { phrases: ['макфа'], tokens: ['makfa'], intent: { category: 'grocery', subcategory: 'pasta' } },
  { phrases: ['makfa'], tokens: ['макфа'], intent: { category: 'grocery', subcategory: 'pasta' } },
  {
    phrases: ['увелка'],
    tokens: ['увелка'],
    intent: { category: 'grocery', subcategory: 'cereals' },
  },
  {
    phrases: ['мистраль'],
    tokens: ['мистраль'],
    intent: { category: 'grocery', subcategory: 'rice' },
  },
  {
    phrases: ['мираторг'],
    tokens: ['мираторг'],
    intent: { category: 'frozen', subcategory: 'semi_finished' },
  },
  {
    phrases: ['алпро'],
    tokens: ['alpro'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['alpro'],
    tokens: ['алпро'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['немолоко'],
    tokens: ['nemoloko'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['nemoloko'],
    tokens: ['немолоко'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['фрутоняня'],
    tokens: ['фрутоняня'],
    intent: { category: 'baby_food', subcategory: 'puree' },
  },
  {
    phrases: ['агуша'],
    tokens: ['агуша'],
    intent: { category: 'baby_food', subcategory: 'puree' },
  },
  {
    phrases: ['нестожен'],
    tokens: ['nestogen'],
    intent: { category: 'baby_food', subcategory: 'formula' },
  },
  {
    phrases: ['nestogen'],
    tokens: ['нестожен'],
    intent: { category: 'baby_food', subcategory: 'formula' },
  },
  {
    phrases: ['кабрита'],
    tokens: ['kabrita'],
    intent: { category: 'baby_food', subcategory: 'formula' },
  },
  {
    phrases: ['kabrita'],
    tokens: ['кабрита'],
    intent: { category: 'baby_food', subcategory: 'formula' },
  },
  {
    phrases: ['нутрилон'],
    tokens: ['nutrilon'],
    intent: { category: 'baby_food', subcategory: 'formula' },
  },
  {
    phrases: ['nutrilon'],
    tokens: ['нутрилон'],
    intent: { category: 'baby_food', subcategory: 'formula' },
  },
  {
    phrases: ['сүт'],
    tokens: ['молоко', 'milk'],
    intent: { category: 'dairy_eggs', subcategory: 'milk' },
  },
  {
    phrases: ['симилак'],
    tokens: ['similac'],
    intent: { category: 'baby_food', subcategory: 'formula' },
  },
  {
    phrases: ['similac'],
    tokens: ['симилак'],
    intent: { category: 'baby_food', subcategory: 'formula' },
  },
  { phrases: ['деп'], tokens: ['dep'], intent: { category: 'dairy_eggs', subcategory: 'cream' } },
  { phrases: ['dep'], tokens: ['деп'], intent: { category: 'dairy_eggs', subcategory: 'cream' } },
  { phrases: ['адаль'], tokens: ['adal'], intent: { category: 'dairy_eggs', subcategory: 'milk' } },
  { phrases: ['adal'], tokens: ['адаль'], intent: { category: 'dairy_eggs', subcategory: 'milk' } },
  {
    phrases: ['фудмастер'],
    tokens: ['foodmaster'],
    intent: { category: 'dairy_eggs', subcategory: 'fermented' },
  },
  {
    phrases: ['foodmaster'],
    tokens: ['фудмастер'],
    intent: { category: 'dairy_eggs', subcategory: 'fermented' },
  },
  {
    phrases: ['ляззат'],
    tokens: ['ляззат'],
    intent: { category: 'dairy_eggs', subcategory: 'fermented' },
  },
  { phrases: ['цесна'], tokens: ['цесна'], intent: { category: 'grocery', subcategory: 'flour' } },
]

const INTENT_RULES = NAME_KEYWORDS.filter((kw) => kw.cat !== CATEGORY_MAP_DEACTIVATE).map((kw) => ({
  phrases: [kw.pattern],
  category: kw.cat,
  subcategory: kw.sub,
}))

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
    if (attribute.phrases.some((phrase) => normalized.includes(phrase.toLowerCase())))
      return attribute.key
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
    if (rule.phrases.some((phrase) => normalized.includes(phrase.toLowerCase()))) {
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

function buildAliasOriginSet(normalized) {
  const set = new Set()
  for (const alias of QUERY_ALIASES) {
    if (alias.phrases.some((p) => includesPhrase(normalized, p))) {
      for (const phrase of alias.phrases) {
        for (const t of tokenize(phrase)) set.add(t)
      }
    }
  }
  return set
}

export function analyzeCatalogSearchQuery(query) {
  const normalized = normalizeText(query)
  const quantity = findQuantity(normalized)
  const digitsOnly = normalized.replace(/\D/g, '')
  const aliasMatches = findAliasMatches(normalized)
  const attribute = findAttribute(normalized)
  let intent = findIntent(normalized, aliasMatches.intent)
  if (attribute && intent) {
    intent = null
  }
  const tokens = tokenize(normalized).filter(
    (token) => !/^\d/.test(token) && !['мл', 'л', 'г', 'кг'].includes(token)
  )
  const aliasedOriginSet = buildAliasOriginSet(normalized)
  const unaliasedTokens = tokens.filter((t) => !aliasedOriginSet.has(t))
  const allTokens =
    aliasMatches.aliasTokens.length > 0
      ? [...new Set([...unaliasedTokens, ...aliasMatches.aliasTokens])]
      : tokens
  return {
    original: String(query || ''),
    normalized,
    tokens,
    aliasTokens: aliasMatches.aliasTokens,
    allTokens,
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
  if (query.attribute === 'vegan')
    return values.some((value) => value.includes('веган') || value.includes('vegan'))
  if (query.attribute === 'organic')
    return values.some(
      (value) => value.includes('органик') || value.includes('organic') || value.includes('био')
    )
  if (query.attribute === 'keto')
    return values.some((value) => value.includes('кето') || value.includes('keto'))
  if (query.attribute === 'palm_oil')
    return values.some((value) => value.includes('пальмов') || value.includes('palm oil'))
  if (query.attribute === 'low_calorie')
    return values.some((value) => value.includes('низкокалорийн') || value.includes('low calorie'))
  return false
}

const MIN_RELEVANCE_SCORE = 200

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
    query.allTokens.some((token) => isTokenMatch(token, brandText) || brandText.includes(token))
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
  } else if (
    query.ean &&
    [product?.ean, ...(Array.isArray(product?.alternateEans) ? product.alternateEans : [])]
      .map(String)
      .some((ean) => ean.startsWith(query.ean))
  ) {
    score += 800
    relevanceTier = Math.min(relevanceTier, 2)
    matchType = 'ean_prefix'
  }

  if (attributeMatch) {
    score += 1600
    relevanceTier = Math.min(relevanceTier, query.intent ? 2 : 1)
    matchType = 'attribute_tag'
  }

  if (subcategoryMatch && matchedTokens > 0) {
    score += 2500
    relevanceTier = Math.min(relevanceTier, 1)
    matchType = matchType || 'intent_subcategory'
  } else if (categoryMatch && matchedTokens > 0) {
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
  if (score < MIN_RELEVANCE_SCORE) score = 0
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
    .filter((item) => item.search.score >= MIN_RELEVANCE_SCORE)
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
      relevanceTier: item.search.relevanceTier,
    }))
}
