import { getCategoryShowcase } from '../product/catalogShowcase.js'
import { DIET_PREFERENCES } from '../../constants/dietGoals.js'

export const HOME_SCREEN_SECTIONS = [
  'header',
  'banners',
  'scan',
  'fitCheck',
  'quickActions',
  'install',
  'store',
]

export const BANNER_IMAGE_SCAN = '/banners/banner-scan.webp'
export const BANNER_IMAGE_FIT = '/banners/banner-fit.webp'
export const BANNER_IMAGE_STORE = '/banners/banner-store.webp'
export const BANNER_IMAGE_AI = '/banners/banner-ai.webp'

export const DEFAULT_PROTOTYPE_BANNER_IMAGE = BANNER_IMAGE_SCAN

export const HOME_BANNERS = [
  {
    id: 'scan',
    tone: 'purple',
    image: BANNER_IMAGE_SCAN,
    kickerKey: 'home.banners.scan.kicker',
    headlineKey: 'home.banners.scan.headline',
    badgeKey: 'home.banners.scan.badge',
    descriptionKey: 'home.banners.scan.description',
    ctaKey: 'home.banners.scan.cta',
    ctaIcon: 'scan',
    actionType: 'scan',
  },
  {
    id: 'fitCheck',
    tone: 'teal',
    image: BANNER_IMAGE_FIT,
    kickerKey: 'home.banners.fitCheck.kicker',
    headlineKey: 'home.banners.fitCheck.headline',
    descriptionKey: 'home.banners.fitCheck.description',
    ctaKey: 'home.banners.fitCheck.cta',
    ctaConfiguredKey: 'home.banners.fitCheck.ctaConfigured',
    ctaIcon: 'fit',
    actionType: 'fitCheck',
  },
  {
    id: 'ai',
    tone: 'violet',
    image: BANNER_IMAGE_AI,
    kickerKey: 'home.banners.ai.kicker',
    headlineKey: 'home.banners.ai.headline',
    bubbleKey: 'home.banners.ai.bubble',
    descriptionKey: 'home.banners.ai.description',
    ctaKey: 'home.banners.ai.cta',
    ctaIcon: 'ai',
    actionType: 'ai',
  },
  {
    id: 'store',
    tone: 'blue',
    image: BANNER_IMAGE_STORE,
    kickerKey: 'home.banners.store.kicker',
    headlineKey: 'home.banners.store.headline',
    badgeKey: 'home.banners.store.badge',
    descriptionKey: 'home.banners.store.description',
    ctaKey: 'home.banners.store.cta',
    ctaIcon: 'store',
    actionType: 'catalog',
  },
]

export function getHomeBanners({ isFitConfigured = false } = {}) {
  return HOME_BANNERS.map((banner) => {
    if (banner.id === 'fitCheck' && isFitConfigured && banner.ctaConfiguredKey) {
      return {
        ...banner,
        ctaKey: banner.ctaConfiguredKey,
      }
    }
    return banner
  })
}

export const HOME_DEPT_SHORT_LABELS = {
  dairy_eggs: { ru: 'Молочные продукты', kz: 'Сүт өнімдері' },
  water_beverages: { ru: 'Вода и напитки', kz: 'Су және сусындар' },
  fruits_veg: { ru: 'Фрукты и овощи', kz: 'Жемістер мен көкөністер' },
  bread: { ru: 'Хлеб и выпечка', kz: 'Нан өнімдері' },
  grocery: { ru: 'Бакалея', kz: 'Бакалея' },
  ready_meals: { ru: 'Кулинария', kz: 'Аспаздық' },
  snacks: { ru: 'Снеки и орехи', kz: 'Снектер мен жаңғақтар' },
  sweets: { ru: 'Сладости', kz: 'Тәттілер' },
  tea_coffee: { ru: 'Чай и кофе', kz: 'Шай және кофе' },
  fish: { ru: 'Рыба и морепродукты', kz: 'Балық және теңіз өнімдері' },
  meat: { ru: 'Мясо и птица', kz: 'Ет және құс' },
  deli: { ru: 'Колбасы и деликатесы', kz: 'Шұжықтар мен деликатестер' },
  frozen: { ru: 'Заморозка', kz: 'Мұздатылған өнімдер' },
}

export function getHomeDeptLabel(key, lang) {
  const short = HOME_DEPT_SHORT_LABELS[key]
  if (short) return lang === 'kz' ? short.kz : short.ru
  return key || ''
}

export const HOME_DEPARTMENTS = [
  {
    key: 'dairy_eggs',
    shape: 'square',
    image: '/catalog-categories/category-dairy-eggs-square.webp',
  },
  {
    key: 'water_beverages',
    shape: 'square',
    image: '/catalog-categories/category-water-beverages-square.webp',
  },
  {
    key: 'fruits_veg',
    shape: 'square',
    image: '/catalog-categories/category-fruits-veg-square.webp',
  },
  {
    key: 'bread',
    shape: 'square',
    image: '/catalog-categories/category-bread-square.webp',
  },
  {
    key: 'grocery',
    shape: 'square',
    image: '/catalog-categories/category-grocery-square.webp',
  },
  {
    key: 'ready_meals',
    shape: 'square',
    image: '/catalog-categories/category-ready-meals-square.webp',
  },
  {
    key: 'snacks',
    shape: 'square',
    image: '/catalog-categories/category-snacks-square.webp',
  },
  {
    key: 'sweets',
    shape: 'square',
    image: '/catalog-categories/category-sweets-square.webp',
  },
  {
    key: 'tea_coffee',
    shape: 'square',
    image: '/catalog-categories/category-tea-coffee-square.webp',
  },
  {
    key: 'fish',
    shape: 'square',
    image: '/catalog-categories/category-fish-square.webp',
  },
].map((dept) => {
  const showcase = getCategoryShowcase(dept.key)
  return {
    ...dept,
    image: dept.image || showcase.image,
    tone: dept.key,
  }
})

export const AI_PROMPT_SETS = [
  [
    {
      key: 'burger',
      promptKey: 'home.aiPromptBurger',
      icon: 'burger',
    },
    {
      key: 'dinner',
      promptKey: 'home.aiPromptDinner',
      icon: 'wallet',
    },
  ],
  [
    {
      key: 'breakfast',
      promptKey: 'home.aiPromptBreakfast',
      icon: 'breakfast',
    },
    {
      key: 'halal_sweets',
      promptKey: 'home.aiPromptHalalSweets',
      icon: 'halal',
    },
  ],
  [
    {
      key: 'soup',
      promptKey: 'home.aiPromptSoup',
      icon: 'soup',
    },
    {
      key: 'school_snack',
      promptKey: 'home.aiPromptSchoolSnack',
      icon: 'sugar_free',
    },
  ],
  [
    {
      key: 'tea_pastry',
      promptKey: 'home.aiPromptTeaPastry',
      icon: 'tea',
    },
    {
      key: 'fit_dinner',
      promptKey: 'home.aiPromptFitDinner',
      icon: 'salad',
    },
  ],
]

export const AI_PROMPT_CHIPS = AI_PROMPT_SETS.flat()

export function getRotatedAIPrompts(setIndex = 0) {
  const index = Math.abs(Number(setIndex) || 0) % AI_PROMPT_SETS.length
  return AI_PROMPT_SETS[index]
}

export function hasValidProductImage(product) {
  if (!product) return false
  const img = product.image || product.image_url
  if (typeof img !== 'string') return false
  const trimmed = img.trim()
  if (
    trimmed.includes('placeholder') ||
    trimmed.includes('default-product') ||
    trimmed.includes('no-image') ||
    trimmed.includes('null') ||
    trimmed.includes('undefined')
  ) {
    return false
  }
  return (
    trimmed.length > 5 &&
    (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/'))
  )
}

export const KZ_POPULAR_BRAND_KEYWORDS = [
  'рахат',
  'rahat',
  'tassay',
  'тассай',
  'samal',
  'самал',
  'цесна',
  'coca-cola',
  'кока-кола',
  'cola',
  'пепси',
  'pepsi',
  'lactel',
  'лактель',
  'пиала',
  'piala',
  'султан',
  'sultan',
  'фудмастер',
  'foodmaster',
  'dizzy',
  'диззи',
  'asu',
  'асу',
  'borjomi',
  'боржоми',
  'шедевр',
  'bekker',
  'беккер',
  'snickers',
  'сникерс',
  'twix',
  'твикс',
  'lays',
  'лейс',
  'doritos',
  'доритос',
  'хруsteam',
  'хрустим',
  'tuc',
  'тук',
  'merci',
  'мерси',
  'mileo',
  'милео',
  'president',
  'президент',
  'adal',
  'адал',
  'солнечный',
  'казгер',
  'первомайск',
  'чай',
  'липтон',
  'lipton',
  'greenfield',
  'гринфилд',
  'tess',
  'тесс',
  'jacobs',
  'якобс',
  'nescafe',
  'нескафе',
  'chudo',
  'чудо',
  'activia',
  'активиа',
  'danone',
  'данон',
]

export function getProductBadgeSummary(product, lang = 'ru') {
  const allBadges = []
  if (!product) return { badges: [], extraCount: 0, discountBadge: null }

  const discountPercent = product.discountPercent ?? product.discount_percent
  const price = product.priceKzt ?? product.price_kzt ?? product.price ?? 0
  const oldPrice = product.oldPriceKzt ?? product.old_price_kzt ?? 0
  const calculatedDiscount =
    oldPrice > price && price > 0 ? Math.round((1 - price / oldPrice) * 100) : 0
  const discount =
    typeof discountPercent === 'number' && discountPercent > 0
      ? discountPercent
      : calculatedDiscount
  const discountBadge =
    discount > 0 ? { key: 'discount', type: 'discount', label: `-${discount}%` } : null

  const halal = (product.halalStatus || product.halal_status || '').toLowerCase()
  const isHalal = halal === 'certified' || halal === 'halal' || halal === 'yes'
  if (isHalal) {
    allBadges.push({
      key: 'halal',
      type: 'halal',
      label: 'Халал',
    })
  }

  const dietTags = product.dietTags || product.diet_tags || product.diet_tags_json || []
  const tags = Array.isArray(dietTags) ? dietTags : []

  const knownDietKeys = DIET_PREFERENCES.map((preference) => preference.id).filter(
    (id) => id !== 'halal'
  )
  for (const tagKey of knownDietKeys) {
    if (tags.includes(tagKey)) {
      const pref = DIET_PREFERENCES.find((p) => p.id === tagKey)
      const label = pref?.label?.[lang] || pref?.label?.ru || tagKey
      allBadges.push({ key: tagKey, type: 'diet', label })
    }
  }

  const explicitKey = product.primaryDietTag || product.primaryTag
  const explicit = allBadges.find((badge) => badge.key === explicitKey)
  const name = `${product.name || ''} ${product.nameKz || ''}`.toLocaleLowerCase()
  const focused = allBadges.find((badge) => {
    const terms =
      {
        keto: ['кето', 'keto'],
        vegan: ['веган', 'vegan'],
        gluten_free: ['без глютена', 'gluten free'],
        sugar_free: ['без сахара', 'sugar free'],
        lactose_free: ['без лактозы', 'lactose free'],
        low_fat: ['низкожир', 'маложир', 'low fat'],
        kid_friendly: ['для детей', 'детский', 'балаларға', 'kids'],
        vegetarian: ['вегетариан', 'vegetarian'],
      }[badge.key] || []
    return terms.some((term) => name.includes(term))
  })
  const primary = explicit || focused || allBadges[0]
  return {
    badges: primary ? [primary] : [],
    extraCount: Math.max(0, allBadges.length - 1),
    discountBadge,
  }
}

export function getProductDisplayBadges(product, lang = 'ru') {
  if (!product) return []
  const summary = getProductBadgeSummary(product, lang)
  return summary.badges
}

const POPULARITY_STORAGE_PREFIX = 'korset_store_pop_'

export function getStorePopularityMap(storeSlug) {
  if (typeof window === 'undefined' || !storeSlug) return {}
  try {
    const raw = window.localStorage.getItem(POPULARITY_STORAGE_PREFIX + storeSlug)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function recordProductView(storeSlug, ean) {
  if (typeof window === 'undefined' || !storeSlug || !ean) return
  try {
    const key = POPULARITY_STORAGE_PREFIX + storeSlug
    const map = getStorePopularityMap(storeSlug)
    const cur = map[ean] || { views: 0, favorites: 0 }
    map[ean] = { ...cur, views: cur.views + 1, lastViewAt: Date.now() }
    window.localStorage.setItem(key, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

export function recordProductFavorite(storeSlug, ean) {
  if (typeof window === 'undefined' || !storeSlug || !ean) return
  try {
    const key = POPULARITY_STORAGE_PREFIX + storeSlug
    const map = getStorePopularityMap(storeSlug)
    const cur = map[ean] || { views: 0, favorites: 0 }
    map[ean] = { ...cur, favorites: cur.favorites + 1, lastFavAt: Date.now() }
    window.localStorage.setItem(key, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

export function scoreShowcaseProduct(product, popularityMap = {}) {
  let score = 0

  // 1. Популярные казахстанские FMCG бренды
  const nameLower = (product.name || '').toLowerCase()
  const brandLower = (product.brand || '').toLowerCase()
  const isTopBrand = KZ_POPULAR_BRAND_KEYWORDS.some(
    (kw) => nameLower.includes(kw) || brandLower.includes(kw)
  )
  if (isTopBrand) {
    score += 45
  }

  // 2. Закрепленный ритейлером товар или скидка
  if (product.isFeatured || product.is_featured) score += 100
  const discountPct = product.discountPercent ?? product.discount_percent
  const price = product.priceKzt ?? product.price_kzt ?? product.price ?? 0
  const oldPrice = product.oldPriceKzt ?? product.old_price_kzt ?? 0
  if (discountPct || (oldPrice > price && price > 0)) {
    score += 30
  }

  // 3. Динамические взаимодействия покупателей (просмотры, добавления в корзину)
  const stats = popularityMap[product.ean] || {}
  const views = stats.views || 0
  const favorites = stats.favorites || 0
  score += views * 2 + favorites * 5

  // 4. Потребительские маркеры (Халал, проверенный состав)
  const halal = (product.halalStatus || product.halal_status || '').toLowerCase()
  const isHalal = halal === 'certified' || halal === 'halal' || halal === 'yes'
  if (isHalal) score += 8

  const dietTags = product.dietTags || product.diet_tags || product.diet_tags_json || []
  if (Array.isArray(dietTags) && dietTags.length > 0) score += 4
  if (product.ingredients || product.ingredients_raw) score += 3

  return score
}

export function getShowcaseProducts(catalogProducts = [], limit = 12, popularityMap = {}) {
  if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) return []
  const withImages = catalogProducts.filter((p) => {
    if (!p) return false
    const price = p.priceKzt ?? p.price_kzt ?? p.price
    return typeof price === 'number' && price > 0 && hasValidProductImage(p)
  })
  if (withImages.length === 0) return []

  const scored = withImages.map((p) => ({
    product: p,
    score: scoreShowcaseProduct(p, popularityMap),
  }))

  scored.sort((a, b) => b.score - a.score)

  const selected = []
  const categoryCounts = new Map()
  const namesSeen = new Set()

  function getBaseName(name) {
    return (name || '').toLowerCase().split(/\s+/).slice(0, 2).join(' ')
  }

  // Round 1: Max 1 product per unique category
  for (const { product } of scored) {
    const cat = product.category || product.category_id || 'other'
    const base = getBaseName(product.name)
    const currentCount = categoryCounts.get(cat) || 0

    if (currentCount === 0 && !namesSeen.has(base)) {
      categoryCounts.set(cat, 1)
      namesSeen.add(base)
      selected.push(product)
    }
    if (selected.length >= limit) break
  }

  // Round 2: Fill up to 2 products per category if limit not reached
  if (selected.length < limit) {
    for (const { product } of scored) {
      if (selected.some((d) => d.ean === product.ean)) continue
      const cat = product.category || 'other'
      const base = getBaseName(product.name)
      const currentCount = categoryCounts.get(cat) || 0

      if (currentCount < 2 && !namesSeen.has(base)) {
        categoryCounts.set(cat, currentCount + 1)
        namesSeen.add(base)
        selected.push(product)
      }
      if (selected.length >= limit) break
    }
  }

  // Round 3: Fallback if still under limit
  if (selected.length < limit) {
    for (const { product } of scored) {
      if (!selected.some((d) => d.ean === product.ean)) {
        selected.push(product)
      }
      if (selected.length >= limit) break
    }
  }

  // Демо-выборка для визуальной проверки всех тегов покупателем:
  // гарантируем наличие товаров с каждым типом бейджа среди первых карточек
  const previewTags = ['sugar_free', 'lactose_free', 'gluten_free', 'vegan', 'keto']
  let tagIdx = 0
  return selected.map((p, idx) => {
    const existingTags = p.dietTags || p.diet_tags || []
    if (idx > 0 && tagIdx < previewTags.length && existingTags.length === 0) {
      const demoTag = previewTags[tagIdx++]
      return {
        ...p,
        dietTags: [demoTag],
      }
    }
    return p
  })
}

export function buildHomeQuickActions({ routes = {} } = {}) {
  return [
    {
      key: 'catalog',
      icon: 'storefront',
      titleKey: 'home.quickActionCatalog',
      textKey: 'home.quickActionCatalogSub',
      path: routes.catalog,
    },
    {
      key: 'scan',
      icon: 'barcode_scanner',
      titleKey: 'home.scanBtn',
      textKey: 'home.scanProductSub',
      path: routes.scan,
    },
    {
      key: 'favorites',
      icon: 'checklist',
      titleKey: 'home.quickActionFavorites',
      textKey: 'home.quickActionFavoritesSub',
      path: routes.profile ? `${routes.profile}?tab=favorites` : '',
    },
    {
      key: 'ai',
      icon: 'auto_awesome',
      titleKey: 'home.quickActionAi',
      textKey: 'home.quickActionAiSub',
      path: routes.ai,
    },
    {
      key: 'history',
      icon: 'history',
      titleKey: 'home.quickActionHistory',
      textKey: 'home.quickActionHistorySub',
      path: routes.history || (routes.profile ? `${routes.profile}?tab=history` : ''),
    },
    {
      key: 'profile',
      icon: 'person',
      titleKey: 'home.quickActionProfile',
      textKey: 'home.quickActionProfileSub',
      path: routes.profile,
    },
  ].filter((action) => Boolean(action.path))
}

export function buildHomeStoreFacts(store = {}, fallbackHours = '') {
  const address = [store.city, store.address].filter(Boolean).join(' · ')
  return [
    address ? { key: 'address', icon: 'location_on', text: address } : null,
    store.opening_hours || fallbackHours
      ? { key: 'opening_hours', icon: 'schedule', text: store.opening_hours || fallbackHours }
      : null,
  ].filter(Boolean)
}

export function buildFitCheckSetupState(profile = {}) {
  const hasHalal = Boolean(profile.halal || profile.halalOnly)
  const hasDietGoals = Boolean(profile.dietGoals?.length)
  const hasNoPreferences = Boolean(profile.noDietPreferences)
  const hasPreferenceStep = hasHalal || hasDietGoals || hasNoPreferences
  const hasAllergens = Boolean(profile.allergens?.length || profile.customAllergens?.length)
  const hasNoAllergies = Boolean(profile.noAllergies)
  const hasAllergenStep = hasAllergens || hasNoAllergies
  const completedCount = [hasPreferenceStep, hasAllergenStep].filter(Boolean).length

  return {
    completedCount,
    isComplete: completedCount === 2,
    signals: {
      preferences: hasPreferenceStep,
      allergens: hasAllergenStep,
    },
  }
}
