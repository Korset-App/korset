const DEFAULT_STORE_TYPE = 'minimarket'
const STORE_TYPES = new Set(['supermarket', 'minimarket', 'halal', 'specialty', 'other'])
const STORE_STATUSES = new Set(['available', 'soon'])
const STORE_LOGOS = {
  mars: '/store-logos/mars.svg',
  nurly: '/store-logos/nurly.svg',
  kalina: '/store-logos/kalina.svg',
}

function cleanText(value) {
  return String(value || '').trim()
}

function makeSearchText(parts) {
  return parts.map(cleanText).filter(Boolean).join(' ').toLocaleLowerCase('ru-RU')
}

function normalizeStoreAddress(address) {
  return cleanText(address).replace(/,\s*левобережный район$/iu, '')
}

export function normalizeStoreListing(store = {}) {
  const slug = cleanText(store.slug || store.code || store.id)
  const name = cleanText(store.name) || 'Körset'
  const city = cleanText(store.city)
  const address = normalizeStoreAddress(store.address)
  const rawType = cleanText(store.type) || DEFAULT_STORE_TYPE
  const type = STORE_TYPES.has(rawType) ? rawType : 'other'
  const description = cleanText(store.short_description || store.description)
  const rawStatus = store.status || (store.is_active === false ? 'soon' : 'available')
  const status = STORE_STATUSES.has(rawStatus) ? rawStatus : 'available'

  return {
    ...store,
    slug,
    name,
    city,
    address,
    type,
    description,
    status,
    initial: name[0]?.toLocaleUpperCase('ru-RU') || 'K',
    logoUrl: STORE_LOGOS[slug] || cleanText(store.logo_url || store.logo),
    searchText: makeSearchText([slug, name, city, address, type, description, status]),
  }
}

export function filterStoreListings(stores, query) {
  const normalizedQuery = cleanText(query).toLocaleLowerCase('ru-RU')
  if (!normalizedQuery) return stores
  return stores.filter((store) => store.searchText.includes(normalizedQuery))
}
