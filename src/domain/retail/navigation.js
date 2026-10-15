export const RETAIL_NAVIGATION = Object.freeze([
  { id: 'dashboard', labelKey: 'retail.nav.dashboard', group: 'workspace' },
  { id: 'products', labelKey: 'retail.nav.products', group: 'workspace' },
  { id: 'storefront', labelKey: 'retail.nav.storefront', group: 'workspace' },
  { id: 'integration', labelKey: 'retail.nav.integration', group: 'management' },
  { id: 'settings', labelKey: 'retail.nav.settings', group: 'management' },
])

export function getRetailSection(pathname = '') {
  const section = pathname.split('/')[3]
  if (section === 'import' || section === 'ean-recovery') return 'products'
  return RETAIL_NAVIGATION.some((item) => item.id === section) ? section : 'dashboard'
}

export function getRetailPath(storeSlug, section = 'dashboard') {
  return storeSlug ? `/retail/${encodeURIComponent(storeSlug)}/${section}` : '/retail'
}
