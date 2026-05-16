import { buildFitPriority, compareFitPriority } from './fitPriority.js'

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
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word))
}

const STOP_WORDS = new Set([
  'есть',
  'что',
  'для',
  'мне',
  'могу',
  'можно',
  'покажи',
  'покажите',
  'собери',
  'продукты',
  'товары',
  'магазине',
  'купить',
  'какие',
  'какой',
  'какая',
  'бар',
  'барма',
])

const DINNER_EXCLUDED_CATEGORIES = new Set(['snacks', 'healthy', 'household', 'personal_care'])
const CHILD_EXCLUDED_SUBCATEGORIES = new Set(['energy'])
const NON_FOOD_CATEGORIES = new Set(['household', 'personal_care'])
const MEAT_CATEGORIES = new Set(['meat', 'fish', 'deli'])
const RECIPE_EXCLUDED_CATEGORIES = new Set([
  'snacks',
  'healthy',
  'household',
  'personal_care',
  'bread',
])

function extractBudget(text) {
  const match = text.match(/(?:до|дейін|under)\s*(\d[\d\s]{1,8})/)
  if (!match) return null
  const value = Number(match[1].replace(/\s+/g, ''))
  return Number.isFinite(value) && value > 0 ? value : null
}

function getQueryIntent(query) {
  const text = normalizeText(query)
  const recipeKeywords = []
  const childSnack = hasAny(text, ['ребен', 'ребён', 'детск', 'бала', 'балалар', 'перекус'])
  const meatFreeProtein =
    hasAny(text, ['без мяса', 'етсіз', 'no meat']) && hasAny(text, ['белк', 'ақуыз', 'protein'])
  const breakfast = hasAny(text, ['завтрак', 'таңғы ас', 'breakfast'])
  if (hasAny(text, ['плов', 'палау'])) {
    recipeKeywords.push(
      { id: 'rice', terms: ['рис', 'rice'], subcategories: ['rice'], score: 14 },
      { id: 'carrot', terms: ['морковь', 'сәбіз'], subcategories: ['vegetables'], score: 10 },
      { id: 'oil', terms: ['масло', 'oil'], subcategories: ['cooking_oil'], score: 9 },
      {
        id: 'meat',
        terms: ['мясо', 'говядина', 'баранина', 'курица'],
        categories: ['meat'],
        score: 8,
      }
    )
  }
  if (hasAny(text, ['ужин', 'кешкі ас'])) {
    recipeKeywords.push(
      {
        id: 'ready',
        terms: ['готов', 'разогреть'],
        categories: ['ready_meals', 'frozen'],
        score: 10,
      },
      {
        id: 'protein',
        terms: ['кур', 'говядин', 'мяс', 'рыб', 'meat'],
        categories: ['meat', 'fish', 'deli'],
        score: 8,
      },
      {
        id: 'side',
        terms: ['рис', 'гречка', 'круп', 'grains'],
        subcategories: ['rice', 'cereals'],
        score: 6,
      },
      { id: 'veg', terms: ['овощ', 'көкөніс'], categories: ['fruits_veg'], score: 5 }
    )
  }
  if (breakfast) {
    recipeKeywords.push(
      {
        id: 'breakfast_base',
        terms: ['овсян', 'хлоп', 'каша', 'гранола', 'мюсли'],
        categories: ['grocery', 'grains'],
        subcategories: ['breakfast', 'cereals'],
        score: 11,
      },
      {
        id: 'breakfast_fruit',
        terms: ['банан', 'яблок', 'фрукт'],
        categories: ['fruits_veg'],
        subcategories: ['fruits'],
        score: 8,
      },
      {
        id: 'breakfast_dairy',
        terms: ['йогурт', 'молоко', 'творог'],
        categories: ['dairy', 'dairy_eggs'],
        score: 7,
      }
    )
  }
  if (childSnack) {
    recipeKeywords.push(
      {
        id: 'child_drink',
        terms: ['детск', 'сок', 'вода', 'компот'],
        categories: ['water_beverages'],
        subcategories: ['juice', 'water'],
        score: 12,
      },
      {
        id: 'child_fruit',
        terms: ['банан', 'яблок', 'фрукт'],
        categories: ['fruits_veg'],
        subcategories: ['fruits'],
        score: 10,
      },
      {
        id: 'child_snack',
        terms: ['пастила', 'печенье', 'йогурт'],
        categories: ['sweets', 'dairy', 'dairy_eggs'],
        score: 6,
      }
    )
  }
  if (meatFreeProtein) {
    recipeKeywords.push(
      {
        id: 'eggs',
        terms: ['яйц', 'egg'],
        categories: ['dairy_eggs'],
        subcategories: ['eggs'],
        score: 12,
      },
      {
        id: 'legumes',
        terms: ['нут', 'фасол', 'чечев', 'боб'],
        categories: ['grocery', 'healthy'],
        subcategories: ['beans', 'legumes'],
        score: 11,
      },
      {
        id: 'dairy_protein',
        terms: ['творог', 'йогурт', 'сыр'],
        categories: ['dairy', 'dairy_eggs'],
        score: 7,
      }
    )
  }

  const category = hasAny(text, ['сладост', 'конфет', 'шоколад', 'печень', 'десерт'])
    ? 'sweets'
    : null
  const freshFruitOnly = hasAny(text, ['фрукт манго', 'свежий манго', 'свежее манго'])

  return {
    budget: extractBudget(text),
    halal: hasAny(text, ['халал', 'halal']),
    lactoseFree: hasAny(text, ['без лактоз', 'лактозасыз', 'lactose free']),
    sugarFree: hasAny(text, ['без сахар', 'без сахара', 'қантсыз', 'sugar free']),
    category,
    childSnack,
    meatFreeProtein,
    breakfast,
    freshFruitOnly,
    dinner: hasAny(text, ['ужин', 'кешкі ас']),
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
      product.quantity,
      product.halalStatus === 'yes' ? 'halal халал' : '',
      ...(product.dietTags || []),
    ].join(' ')
  )
}

function matchesRecipeKeyword(product, text, keywordGroup) {
  if (RECIPE_EXCLUDED_CATEGORIES.has(product.category)) return false
  if (keywordGroup.categories?.includes(product.category)) return true
  if (keywordGroup.subcategories?.includes(product.subcategory)) return true
  return keywordGroup.terms.some((term) => text.includes(normalizeText(term)))
}

function hasDietTag(product, tag) {
  return Array.isArray(product?.dietTags) && product.dietTags.includes(tag)
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
      if (NON_FOOD_CATEGORIES.has(product.category)) return false
      if (intent.budget && product.priceKzt && product.priceKzt > intent.budget) return false
      if (intent.category && product.category !== intent.category) return false
      if (intent.freshFruitOnly && product.subcategory !== 'fruits') return false
      if (intent.dinner && DINNER_EXCLUDED_CATEGORIES.has(product.category)) return false
      if (intent.childSnack && CHILD_EXCLUDED_SUBCATEGORIES.has(product.subcategory)) return false
      if (intent.meatFreeProtein && MEAT_CATEGORIES.has(product.category)) return false
      if (intent.sugarFree && product.category === 'sweets' && !hasDietTag(product, 'sugar_free')) {
        return false
      }
      return true
    })
    .map((product) => {
      const text = productSearchText(product)
      const matchScore = tokens.reduce((sum, token) => sum + (text.includes(token) ? 10 : 0), 0)
      const recipeScore = intent.recipeKeywords.reduce((sum, keywordGroup) => {
        const matched = matchesRecipeKeyword(product, text, keywordGroup)
        return sum + (matched ? keywordGroup.score : 0)
      }, 0)
      const categoryScore = intent.category && product.category === intent.category ? 8 : 0
      const dietScore =
        (intent.halal && product.halalStatus === 'yes' ? 6 : 0) +
        (intent.lactoseFree && product.dietTags?.includes('lactose_free') ? 8 : 0) +
        (intent.sugarFree && product.dietTags?.includes('sugar_free') ? 6 : 0)
      const availableBoost = product.stockStatus === 'out_of_stock' ? -6 : 2
      const priceBoost = product.priceKzt ? Math.max(0, 1500 - product.priceKzt) / 1000 : 0
      const fitPriority = buildFitPriority(product, { profile, intent })
      const intentScore = recipeScore + dietScore + categoryScore
      return {
        product,
        matchScore,
        intentScore,
        fitPriority,
        score: matchScore + intentScore + availableBoost + priceBoost + fitPriority.sortScore / 100,
      }
    })
    .filter((item) => item.matchScore > 0 || item.intentScore > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        compareFitPriority(a.product, b.product, { profile, intent }) ||
        (a.product.priceKzt || Infinity) - (b.product.priceKzt || Infinity)
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
    subcategory: product.subcategory || '',
    group: product.group || '',
    priceKzt: product.priceKzt ?? null,
    stockStatus: product.stockStatus || 'unknown',
    halalStatus: product.halalStatus || 'unknown',
    dietTags: Array.isArray(product.dietTags) ? product.dietTags : [],
    allergens: Array.isArray(product.allergens) ? product.allergens : [],
    image: product.image || product.imageUrl || null,
    quantity: product.quantity || '',
  }))
}
