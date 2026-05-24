export const STORES = [
  {
    id: 'mars',
    slug: 'mars',
    name: 'Марс',
    city: 'Усть-Каменогорск',
    address: 'ул. Абая, левобережный район',
    type: 'minimarket',
    isActive: true,
    defaultLanguage: 'ru',
  },
  {
    id: 'nurly',
    slug: 'nurly',
    name: 'Нұрлы',
    city: 'Усть-Каменогорск',
    address: 'пр. Абылай хана, район Ушанова',
    type: 'minimarket',
    isActive: true,
    defaultLanguage: 'ru',
  },
  {
    id: 'kalina',
    slug: 'kalina',
    name: 'Калина',
    city: 'Усть-Каменогорск',
    address: 'ул. Мира, район Стройка',
    type: 'minimarket',
    isActive: true,
    defaultLanguage: 'ru',
  },
]

export const STORE_ONE_EANS = [
  '4008400404127',
  '4600680010360',
  '4600000102452',
  '5000112546326',
  '4005800431326',
  '4810200003011',
  '8005800431350',
  '4607000001001',
  '4607000001002',
  '4607000001003',
  '4607000001004',
  '4607000001005',
  '4607000001006',
  '4607000001007',
  '4607000001008',
  '4607000001009',
  '4607000001010',
  '4607000001011',
  '4607000001012',
  '4607000001013',
]

export const STORE_PRODUCT_MAP = {
  mars: STORE_ONE_EANS,
  nurly: STORE_ONE_EANS,
  kalina: STORE_ONE_EANS,
}

export const ALLOW_GLOBAL_SCAN_FOR_NOW = true

export function getStoreBySlug(slug) {
  if (!slug) return null
  return STORES.find((store) => store.slug === slug) || null
}

export function getStores() {
  return STORES.filter((store) => store.isActive)
}
