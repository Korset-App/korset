export const STORES = [
  {
    id: 'store-one',
    slug: 'store-one',
    name: 'Магазин 1',
    city: 'Усть-Каменогорск',
    address: 'Тестовый магазин Körset',
    logo: '/logo.png',
    description:
      'Тестовый магазин Körset с реальными продуктовыми SKU для демонстрации и дальнейшей обкатки магазинного сценария.',
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
  'store-one': STORE_ONE_EANS,
}

export const ALLOW_GLOBAL_SCAN_FOR_NOW = true

export function getStoreBySlug(slug) {
  if (!slug) return null
  return STORES.find((store) => store.slug === slug) || null
}

export function getStores() {
  return STORES.filter((store) => store.isActive)
}
