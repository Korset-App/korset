export function buildStoreAppBase(storeSlug) {
  return `/s/${storeSlug}`
}

export function buildStoreHomePath(storeSlug = null) {
  return storeSlug ? buildStoreAppBase(storeSlug) : '/'
}

export function buildStorePublicPath(storeSlug) {
  return `/stores/${storeSlug}`
}

export function buildRetailBasePath() {
  return '/retail'
}

export function buildRetailDashboardPath(storeSlug = null) {
  return storeSlug ? `${buildRetailBasePath()}/${storeSlug}/dashboard` : buildRetailBasePath()
}

export function buildCatalogPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/catalog` : '/catalog'
}

export function buildScanPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/scan` : '/scan'
}

export function buildProfilePath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/profile` : '/profile'
}

export function buildProfileEditPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/profile/edit` : '/profile/edit'
}

export function buildAccountPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/account` : '/account'
}

export function buildHistoryPath(storeSlug = null, tab = null) {
  const base = storeSlug ? `${buildStoreAppBase(storeSlug)}/history` : '/history'
  return tab ? `${base}?tab=${tab}` : base
}

export function buildAIHomePath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/ai` : '/ai'
}

export function buildProductPath(storeSlug = null, ean) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/product/${ean}` : `/product/${ean}`
}

export function buildProductAIPath(storeSlug = null, ean) {
  return `${buildProductPath(storeSlug, ean)}/ai`
}

export function buildProductAlternativesPath(storeSlug = null, ean) {
  return `${buildProductPath(storeSlug, ean)}/alternatives`
}

export function buildPrivacyPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/privacy` : '/privacy'
}

export function buildNotificationSettingsPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/notifications` : '/notifications'
}

export function buildComparePath(storeSlug = null, ean1, ean2) {
  return `${buildProductPath(storeSlug, ean1)}/compare/${ean2}`
}

export function buildFaqPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/faq` : '/faq'
}

export function buildAboutPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/about` : '/about'
}

export function buildTermsPath(storeSlug = null) {
  return storeSlug ? `${buildStoreAppBase(storeSlug)}/terms` : '/terms'
}
