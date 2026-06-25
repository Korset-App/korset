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
    tone: 'green',
    image: '/stories/store.png',
    cta: 'store',
    slides: ['store.0', 'store.1', 'store.2'],
  },
  {
    key: 'catalog',
    icon: 'auto_stories',
    tone: 'moon',
    image: '/stories/catalog.png',
    cta: 'catalog',
    slides: ['catalog.0', 'catalog.1', 'catalog.2'],
  },
  {
    key: 'scan',
    icon: 'barcode_scanner',
    tone: 'ember',
    image: '/stories/scan.png',
    cta: 'scan',
    slides: ['scan.0', 'scan.1', 'scan.2'],
  },
  {
    key: 'ai',
    icon: 'auto_awesome',
    tone: 'violet',
    image: '/stories/ai.png',
    cta: 'ai',
    slides: ['ai.0', 'ai.1', 'ai.2'],
  },
  {
    key: 'fit',
    icon: 'tune',
    tone: 'blue',
    image: '/stories/fit.png',
    cta: 'fit',
    slides: ['fit.0', 'fit.1', 'fit.2'],
  },
]

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
