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
  { key: 'what', icon: 'auto_stories', tone: 'amber', cta: 'learn' },
  { key: 'scan', icon: 'barcode_scanner', tone: 'sky', cta: 'scan' },
  { key: 'fit', icon: 'tune', tone: 'violet', cta: 'profile' },
  { key: 'safety', icon: 'health_and_safety', tone: 'mint', cta: 'profile' },
  { key: 'install', icon: 'install_mobile', tone: 'rose', cta: 'install' },
]

export function buildHomeQuickActions({ routes = {} } = {}) {
  return [
    {
      key: 'catalog',
      icon: 'grid_view',
      titleKey: 'home.catalog',
      textKey: 'home.catalogSub',
      path: routes.catalog,
      tone: 'sky',
    },
    {
      key: 'ai',
      icon: 'auto_awesome',
      titleKey: 'home.ai',
      textKey: 'home.aiProductSub',
      path: routes.ai,
      tone: 'violet',
      featured: true,
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
  const hasAllergens = Boolean(profile.allergens?.length || profile.customAllergens?.length)
  const hasSugar = Boolean(
    profile.sugarFree ||
    profile.healthConditions?.includes?.('diabetes') ||
    profile.dietGoals?.includes?.('sugar_free')
  )
  const completedCount = [hasHalal, hasAllergens, hasSugar].filter(Boolean).length

  return {
    completedCount,
    isComplete: completedCount >= 2,
    signals: {
      halal: hasHalal,
      allergens: hasAllergens,
      sugar: hasSugar,
    },
  }
}
