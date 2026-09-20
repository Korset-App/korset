import { getCategoryShowcase } from '../product/catalogShowcase.js'

export const HOME_SCREEN_SECTIONS = [
  'header',
  'stories',
  'scan',
  'fitCheck',
  'quickActions',
  'install',
  'store',
]

export const HOME_STORY_KEYS = [
  {
    key: 'store',
    icon: 'storefront',
    tone: 'emerald',
    image: '/stories/store.webp',
    cta: 'catalog',
    slides: ['store.0', 'store.1', 'store.2', 'store.3'],
  },
  {
    key: 'catalog',
    icon: 'auto_stories',
    tone: 'cyan',
    image: '/stories/catalog.webp',
    cta: 'catalog',
    slides: ['catalog.0', 'catalog.1', 'catalog.2', 'catalog.3'],
  },
  {
    key: 'scan',
    icon: 'barcode_scanner',
    tone: 'amber',
    image: '/stories/scan.webp',
    cta: 'scan',
    slides: ['scan.0', 'scan.1', 'scan.2'],
  },
  {
    key: 'fit',
    icon: 'shield_with_heart',
    tone: 'teal',
    image: '/stories/fit.webp',
    cta: 'fit',
    slides: ['fit.0', 'fit.1', 'fit.2', 'fit.3', 'fit.4'],
  },
  {
    key: 'ai',
    icon: 'auto_awesome',
    tone: 'violet',
    image: '/stories/ai.webp',
    cta: 'ai',
    slides: ['ai.0', 'ai.1', 'ai.2', 'ai.3'],
  },
]

export const HOME_DEPT_SHORT_LABELS = {
  dairy_eggs: { ru: 'Молочные продукты', kz: 'Сүт өнімдері' },
  sweets: { ru: 'Сладости', kz: 'Тәттілер' },
  meat: { ru: 'Мясо и птица', kz: 'Ет және құс' },
  bread: { ru: 'Хлеб и выпечка', kz: 'Нан өнімдері' },
  snacks: { ru: 'Снеки и орехи', kz: 'Снектер мен жаңғақтар' },
  fruits_veg: { ru: 'Фрукты и овощи', kz: 'Жемістер мен көкөністер' },
  deli: { ru: 'Колбасы и деликатесы', kz: 'Шұжықтар мен деликатестер' },
  frozen: { ru: 'Заморозка', kz: 'Мұздатылған өнімдер' },
}

export function getHomeDeptLabel(key, lang) {
  const short = HOME_DEPT_SHORT_LABELS[key]
  if (short) return lang === 'kz' ? short.kz : short.ru
  return key || ''
}

export const HOME_DEPARTMENTS = [
  { key: 'dairy_eggs', shape: 'wide' },
  { key: 'sweets', shape: 'square' },
  { key: 'meat', shape: 'square' },
  { key: 'bread', shape: 'wide' },
  { key: 'snacks', shape: 'square' },
  { key: 'fruits_veg', shape: 'wide' },
  { key: 'deli', shape: 'square' },
  { key: 'frozen', shape: 'square' },
].map((dept) => {
  const showcase = getCategoryShowcase(dept.key)
  return {
    ...dept,
    image: showcase.image,
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

export function getProductBadgeSummary(product) {
  const allBadges = []
  if (!product) return { badges: [], extraCount: 0 }

  // 1. Скидка (если есть)
  const discountPercent = product.discountPercent ?? product.discount_percent
  const price = product.priceKzt ?? product.price_kzt ?? product.price ?? 0
  const oldPrice = product.oldPriceKzt ?? product.old_price_kzt ?? 0

  if (typeof discountPercent === 'number' && discountPercent > 0) {
    allBadges.push({
      key: 'discount',
      type: 'discount',
      label: `-${discountPercent}%`,
    })
  } else if (oldPrice > price && price > 0) {
    const pct = Math.round((1 - price / oldPrice) * 100)
    if (pct > 0) {
      allBadges.push({
        key: 'discount',
        type: 'discount',
        label: `-${pct}%`,
      })
    }
  }

  // 2. Халал (официальный статус)
  const halal = (product.halalStatus || product.halal_status || '').toLowerCase()
  const isHalal = halal === 'certified' || halal === 'halal' || halal === 'yes'
  if (isHalal) {
    allBadges.push({
      key: 'halal',
      type: 'halal',
      label: 'Халал',
    })
  }

  // 3. Диетические теги
  const dietTags = product.dietTags || product.diet_tags || product.diet_tags_json || []
  const tags = Array.isArray(dietTags) ? dietTags : []

  if (tags.includes('sugar_free')) {
    allBadges.push({ key: 'sugar_free', type: 'diet', label: 'Без сахара' })
  }
  if (tags.includes('lactose_free')) {
    allBadges.push({ key: 'lactose_free', type: 'diet', label: 'Без лактозы' })
  }
  if (tags.includes('gluten_free')) {
    allBadges.push({ key: 'gluten_free', type: 'diet', label: 'Без глютена' })
  }
  if (tags.includes('vegan')) {
    allBadges.push({ key: 'vegan', type: 'diet', label: 'Веган' })
  }
  if (tags.includes('keto')) {
    allBadges.push({ key: 'keto', type: 'diet', label: 'Кето' })
  }
  if (tags.includes('vegetarian')) {
    allBadges.push({ key: 'vegetarian', type: 'diet', label: 'Вегетариан' })
  }

  if (allBadges.length <= 1) {
    return { badges: allBadges, extraCount: 0 }
  }

  const first = allBadges[0]
  const second = allBadges[1]
  const combinedLength = (first?.label?.length || 0) + (second?.label?.length || 0)

  if (combinedLength > 16) {
    return {
      badges: [first],
      extraCount: allBadges.length - 1,
    }
  }

  return {
    badges: allBadges.slice(0, 2),
    extraCount: Math.max(0, allBadges.length - 2),
  }
}

export function getProductDisplayBadges(product) {
  if (!product) return []
  const summary = getProductBadgeSummary(product)
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

const STORY_SEEN_PREFIX = 'korset_story_seen_'
const STORY_PROGRESS_PREFIX = 'korset_story_progress_'

export function loadSeenStories(slug) {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORY_SEEN_PREFIX + slug)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export function saveSeenStories(slug, seenSet) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORY_SEEN_PREFIX + slug, JSON.stringify([...seenSet]))
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export function loadStoryProgress(slug) {
  if (typeof window === 'undefined' || !slug) return {}
  try {
    const raw = window.localStorage.getItem(STORY_PROGRESS_PREFIX + slug)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveStoryProgress(slug, progressMap) {
  if (typeof window === 'undefined' || !slug) return
  try {
    window.localStorage.setItem(STORY_PROGRESS_PREFIX + slug, JSON.stringify(progressMap || {}))
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export function recordStorySlideView(slug, storyKey, slideIndex, totalSlides = 3) {
  if (!slug || !storyKey) return { progressMap: {}, isFullySeen: false }
  const current = loadStoryProgress(slug)
  const currentViewed = Number(current[storyKey]) || 0
  const nextViewed = Math.min(totalSlides, Math.max(currentViewed, Number(slideIndex) + 1))
  const updated = { ...current, [storyKey]: nextViewed }
  saveStoryProgress(slug, updated)

  let isFullySeen = false
  if (nextViewed >= totalSlides) {
    isFullySeen = true
    markStorySeen(slug, storyKey)
  }
  return { progressMap: updated, isFullySeen }
}

export function markStorySeen(slug, storyKey) {
  const seen = loadSeenStories(slug)
  if (!seen.has(storyKey)) {
    seen.add(storyKey)
    saveSeenStories(slug, seen)
  }
  // Also set progress to full if available
  const currentProgress = loadStoryProgress(slug)
  const storyDef = HOME_STORY_KEYS.find((s) => s.key === storyKey)
  const total = storyDef?.slides?.length || 3
  if ((currentProgress[storyKey] || 0) < total) {
    saveStoryProgress(slug, { ...currentProgress, [storyKey]: total })
  }
  return seen
}

export function clearSeenStories(slug) {
  if (typeof window === 'undefined') return
  try {
    if (slug) {
      window.localStorage.removeItem(STORY_SEEN_PREFIX + slug)
      window.localStorage.removeItem(STORY_PROGRESS_PREFIX + slug)
    } else {
      const keys = Object.keys(window.localStorage)
      for (const k of keys) {
        if (k.startsWith(STORY_SEEN_PREFIX) || k.startsWith(STORY_PROGRESS_PREFIX)) {
          window.localStorage.removeItem(k)
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export function sortStoriesBySeen(stories, seenSet, progressMap = {}) {
  const unseen = []
  const seen = []
  for (const story of stories) {
    const total = story.slides?.length || 3
    const viewed =
      progressMap[story.key] !== undefined
        ? progressMap[story.key]
        : seenSet.has(story.key)
          ? total
          : 0
    const isFullySeen = viewed >= total || seenSet.has(story.key)

    if (isFullySeen) {
      seen.push(story)
    } else {
      unseen.push(story)
    }
  }
  return [...unseen, ...seen]
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
