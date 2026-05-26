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
    key: 'what',
    icon: 'auto_stories',
    tone: 'moon',
    image: '/landing/how_step_1.png',
    cta: 'learn',
    slides: ['what.0', 'what.1', 'what.2'],
  },
  {
    key: 'scan',
    icon: 'barcode_scanner',
    tone: 'ember',
    image: '/landing/how_step_2.png',
    cta: 'scan',
    slides: ['scan.0', 'scan.1', 'scan.2'],
  },
  {
    key: 'fit',
    icon: 'tune',
    tone: 'violet',
    image: '/landing/audience_diet.png',
    cta: 'fit',
    slides: ['fit.0', 'fit.1', 'fit.2'],
  },
  {
    key: 'safety',
    icon: 'health_and_safety',
    tone: 'blue',
    image: '/landing/audience_halal.png',
    cta: 'fit',
    slides: ['safety.0', 'safety.1', 'safety.2'],
  },
  {
    key: 'store',
    icon: 'storefront',
    tone: 'green',
    image: '/catalog-categories/category-grocery.webp',
    cta: 'store',
    slides: ['store.0', 'store.1', 'store.2'],
  },
]

export function buildHomeQuickActions({ routes = {} } = {}) {
  return [
    {
      key: 'ai',
      icon: 'auto_awesome',
      titleKey: 'home.ai',
      textKey: 'home.aiProductSub',
      path: routes.ai,
      tone: 'plum',
      featured: true,
    },
    {
      key: 'catalog',
      icon: 'search',
      titleKey: 'home.catalog',
      textKey: 'home.catalogSub',
      path: routes.catalog,
      tone: 'teal',
    },
  ].filter((action) => Boolean(action.path))
}

export function buildHomeStoreFacts(store = {}) {
  const address = [store.city, store.address].filter(Boolean).join(' · ')
  return [
    address ? { key: 'address', icon: 'location_on', text: address } : null,
    store.opening_hours
      ? { key: 'opening_hours', icon: 'schedule', text: store.opening_hours }
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
