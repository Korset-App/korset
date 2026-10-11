// EANs are copied from tests/e2e/productCompositionMocked.spec.js and tests/unit/aiContext.test.mjs.
export const MILK_EAN = '4870204070018'
export const UNKNOWN_EAN = '4870204070094'

export const stores = {
  'pilot-a': {
    id: '00000000-0000-4000-8000-000000000001',
    code: 'pilot-a',
    slug: 'pilot-a',
    name: 'Pilot A',
    is_active: true,
    is_published: true,
  },
  'pilot-b': {
    id: '00000000-0000-4000-8000-000000000002',
    code: 'pilot-b',
    slug: 'pilot-b',
    name: 'Pilot B',
    is_active: true,
    is_published: true,
  },
}

const rows = {
  'pilot-a': [
    {
      ean: MILK_EAN,
      name: 'Pilot milk yoghurt',
      name_kz: 'Pilot сүт йогурты',
      brand: 'Pilot',
      category: 'dairy_eggs',
      ingredients_raw: 'Молоко нормализованное, сахар.',
      allergens_json: ['milk'],
      halal_status: 'unknown',
      price_kzt: 890,
      stock_status: 'in_stock',
    },
    {
      ean: UNKNOWN_EAN,
      name: 'Pilot unknown ingredients',
      name_kz: 'Pilot құрамы белгісіз',
      brand: 'Pilot',
      category: 'dairy_eggs',
      ingredients_raw: null,
      allergens_json: [],
      halal_status: 'unknown',
      price_kzt: 420,
      stock_status: 'unknown',
    },
  ],
  'pilot-b': [
    {
      ean: UNKNOWN_EAN,
      name: 'Pilot B product',
      name_kz: 'Pilot B өнімі',
      brand: 'Pilot B',
      category: 'dairy_eggs',
      ingredients_raw: null,
      allergens_json: [],
      halal_status: 'unknown',
      price_kzt: 710,
      stock_status: 'in_stock',
    },
  ],
}

export async function openConsumer(page, { lang = 'ru', theme = 'light', slug = 'pilot-a' } = {}) {
  await page.addInitScript(({ stores, lang, theme }) => {
    globalThis.localStorage.setItem('korset_lang', lang)
    globalThis.localStorage.setItem('korset_theme', theme)
    globalThis.localStorage.setItem('korset_profile', JSON.stringify({
      halal: false,
      dietGoals: [],
      allergens: ['milk'],
      customAllergens: [],
    }))
    for (const store of Object.values(stores)) {
      globalThis.localStorage.setItem(`korset_store_data_${store.slug}`, JSON.stringify(store))
    }
  }, { stores, lang, theme })

  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new globalThis.URL(request.url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      return route.continue()
    }
    if (url.hostname !== 'pilot.invalid') {
      return route.abort()
    }
    if (url.pathname.startsWith('/auth/v1/')) {
      return route.fulfill({ status: 401, json: { message: 'No pilot session' } })
    }
    if (url.pathname === '/rest/v1/stores') {
      const code = url.searchParams.get('code')?.replace(/^eq\./, '')
      return route.fulfill({ json: stores[code] || null })
    }
    if (url.pathname.endsWith('/fn_get_store_catalog_page')) {
      const body = request.postDataJSON()
      const store = Object.values(stores).find((item) => item.id === body.p_store_id)
      const products = rows[store?.slug] || []
      return route.fulfill({ json: body.p_after_ean ? [] : products })
    }
    if (url.pathname.endsWith('/korset_get_store_source_cards')) {
      return route.fulfill({ json: [] })
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      return route.fulfill({ json: request.method() === 'HEAD' ? null : [] })
    }
    return route.fulfill({ status: 404, json: { message: 'Unmocked pilot endpoint' } })
  })

  await page.goto(`/s/${slug}/catalog`)
}
