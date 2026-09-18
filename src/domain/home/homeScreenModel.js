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
    cta: 'catalog',
    slides: ['store.0', 'store.1', 'store.2'],
  },
  {
    key: 'scan',
    icon: 'barcode_scanner',
    tone: 'amber',
    cta: 'scan',
    slides: ['scan.0', 'scan.1', 'scan.2'],
  },
  {
    key: 'halal',
    icon: 'verified',
    tone: 'teal',
    cta: 'fit',
    slides: ['halal.0', 'halal.1', 'halal.2'],
  },
  {
    key: 'safety',
    icon: 'shield_with_heart',
    tone: 'rose',
    cta: 'fit',
    slides: ['safety.0', 'safety.1', 'safety.2'],
  },
  {
    key: 'ai',
    icon: 'auto_awesome',
    tone: 'violet',
    cta: 'ai',
    slides: ['ai.0', 'ai.1', 'ai.2'],
  },
]

export const HOME_DEPARTMENTS = [
  { key: 'dairy_eggs', labelKey: 'home.deptDairy', icon: 'egg', tone: 'amber' },
  { key: 'bakery', labelKey: 'home.deptBakery', icon: 'bakery_dining', tone: 'orange' },
  { key: 'meat', labelKey: 'home.deptMeat', icon: 'kebab_dining', tone: 'red' },
  { key: 'drinks', labelKey: 'home.deptDrinks', icon: 'local_cafe', tone: 'cyan' },
  { key: 'fruits_veg', labelKey: 'home.deptFruitsVeg', icon: 'nutrition', tone: 'green' },
  { key: 'sweets', labelKey: 'home.deptSweets', icon: 'cookie', tone: 'pink' },
  { key: 'grocery', labelKey: 'home.deptGrocery', icon: 'shopping_bag', tone: 'yellow' },
  { key: 'frozen', labelKey: 'home.deptFrozen', icon: 'ac_unit', tone: 'blue' },
]

export const AI_PROMPT_CHIPS = [
  { key: 'plov', promptKey: 'home.aiPromptPlov', icon: 'restaurant' },
  { key: 'dinner', promptKey: 'home.aiPromptDinner', icon: 'schedule' },
  { key: 'snack', promptKey: 'home.aiPromptSnack', icon: 'cookie' },
]

export function getShowcaseProducts(catalogProducts = [], limit = 8) {
  if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) return []
  const withImages = catalogProducts.filter(
    (p) => p && p.image && typeof p.priceKzt === 'number' && p.priceKzt > 0
  )
  if (withImages.length === 0) {
    return catalogProducts.filter((p) => p && p.priceKzt > 0).slice(0, limit)
  }
  const categoriesSeen = new Set()
  const diverse = []
  for (const item of withImages) {
    const cat = item.category || 'other'
    if (!categoriesSeen.has(cat)) {
      categoriesSeen.add(cat)
      diverse.push(item)
    }
    if (diverse.length >= limit) break
  }
  if (diverse.length < limit) {
    for (const item of withImages) {
      if (!diverse.some((d) => d.ean === item.ean)) {
        diverse.push(item)
      }
      if (diverse.length >= limit) break
    }
  }
  return diverse
}

const STORY_SEEN_PREFIX = 'korset_story_seen_'

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

export function markStorySeen(slug, storyKey) {
  const seen = loadSeenStories(slug)
  if (seen.has(storyKey)) return seen
  seen.add(storyKey)
  saveSeenStories(slug, seen)
  return seen
}

export function sortStoriesBySeen(stories, seenSet) {
  const unseen = []
  const seen = []
  for (const story of stories) {
    if (seenSet.has(story.key)) {
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
