import { test, expect } from '@playwright/test'
import { openConsumer, stores } from './consumerFixtures.js'

// Exact fixture EANs from tests/e2e/compareFlow.spec.js and aiGeneralMocked.spec.js.
const EANS = {
  anchor: '4870204070094',
  organicOne: '4601751002907',
  organicTwo: '4601751002999',
  organicThree: '4870204070018',
  promotedInA: '4870204070019',
}

const products = [
  [EANS.anchor, 'Bread anchor', 'bread'],
  [EANS.organicOne, 'Organic one', 'dairy_eggs'],
  [EANS.organicTwo, 'Organic two', 'deli'],
  [EANS.organicThree, 'Organic three', 'sauces_spices'],
  [EANS.promotedInA, 'A promoted candidate', 'dairy_eggs'],
].map(([ean, name, category]) => ({
  ean,
  name,
  category,
  ingredients_raw: 'Water.',
  allergens_json: [],
  halal_status: 'unknown',
  price_kzt: 100,
  stock_status: 'in_stock',
}))

const organicOrder = ['Organic one', 'Organic two', 'Organic three', 'A promoted candidate']
const aPromotedOrder = ['Organic one', 'A promoted candidate', 'Organic two', 'Organic three']

test('store B recommendations do not inherit store A promotion while B response is pending', async ({ page }) => {
  await openConsumer(page)

  await page.route('**/rest/v1/rpc/fn_get_store_catalog_page', (route) =>
    route.fulfill({ json: route.request().postDataJSON().p_after_ean ? [] : products })
  )

  let releaseB
  let markBRequested
  const bRequested = new Promise((resolve) => { markBRequested = resolve })
  const bResponse = new Promise((resolve) => { releaseB = resolve })
  await page.route('**/rest/v1/store_products*', async (route) => {
    const storeId = new globalThis.URL(route.request().url()).searchParams.get('store_id')
    if (storeId === `eq.${stores['pilot-b'].id}`) {
      markBRequested()
      await bResponse
      return route.fulfill({ json: [] })
    }
    return route.fulfill({ json: [{ ean: EANS.promotedInA }] })
  })

  await page.evaluate(({ stores, anchor }) => {
    globalThis.localStorage.setItem('korset_local_shopping_lists_v1', JSON.stringify({
      [stores['pilot-a'].id]: [anchor],
      [stores['pilot-b'].id]: [anchor],
    }))
  }, { stores, anchor: EANS.anchor })
  await page.goto('/s/pilot-a/shopping-list')
  const recommendations = page.locator('.shopping-page__recommendations .product-mini-card__name')
  await expect(recommendations).toHaveText(aPromotedOrder)

  try {
    await page.evaluate(() => {
      globalThis.history.pushState({}, '', '/s/pilot-b/shopping-list')
      globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'))
    })
    await bRequested
    await expect(page.locator('.shopping-page__eyebrow')).toHaveText('Pilot B')
    await expect(recommendations).toHaveText(organicOrder)
  } finally {
    releaseB()
  }
})
