import { test, expect } from '@playwright/test'
import { openConsumer, UNKNOWN_EAN, MILK_EAN } from './consumerFixtures.js'

const target = {
  ean: MILK_EAN, name: 'Pilot identity target', name_kz: 'Pilot identity target',
  category: 'dairy_eggs', ingredients_raw: 'Рис, вода', allergens_json: [],
  price_kzt: 500, stock_status: 'in_stock', halal_status: 'unknown',
}

async function openComparison(page, { lang, theme, polluted = false, state = null, resolvedAlias = false }) {
  await openConsumer(page, { lang, theme })
  await page.route('**/rpc/fn_get_store_catalog_page', (route) => route.fulfill({
    json: route.request().postDataJSON().p_after_ean ? [] : [
      { ...target, alternate_eans: polluted ? [UNKNOWN_EAN] : [] },
    ],
  }))
  if (resolvedAlias) {
    await page.route('**/rpc/fn_resolve_product_by_ean', (route) => route.fulfill({
      json: route.request().postDataJSON().p_ean === UNKNOWN_EAN ? {
        ...target, name: 'RPC trusted product', name_kz: 'RPC trusted product', is_verified: true,
        _ean_alias_ean: UNKNOWN_EAN, _ean_alias_status: 'trusted', _ean_alias_confidence: 90,
      } : null,
    }))
  }
  if (state) {
    await page.addInitScript((productA) => {
      globalThis.history.replaceState({ usr: { productA }, key: 'identity-test', idx: 0 }, '', globalThis.location.href)
    }, state)
  }
  await page.goto(`/s/pilot-a/product/${UNKNOWN_EAN}/compare/${MILK_EAN}`)
  await expect.poll(() => page.evaluate(async () => {
    const { getCatalogFromIndexedDB } = await import('/src/utils/offlineDB.js')
    return (await getCatalogFromIndexedDB()).some((product) => product.name === 'Pilot identity target')
  })).toBe(true)
}

for (const [lang, theme] of [['ru', 'light'], ['kz', 'dark']]) {
  test(`unverified catalog alias cannot substitute comparison identity (${lang}/${theme})`, async ({ page }) => {
    await openComparison(page, { lang, theme, polluted: true })
    await expect(page.locator('.compare-product--a')).toHaveCount(0)
    await expect(page.locator('.compare-empty')).toBeVisible()
  })

  test(`unrelated navigation state cannot substitute comparison identity (${lang}/${theme})`, async ({ page }) => {
    await openComparison(page, { lang, theme, state: { ean: MILK_EAN, name: 'Unrelated navigation product' } })
    await expect(page.locator('.compare-product--a')).toHaveCount(0)
    await expect(page.locator('.compare-empty')).toBeVisible()
  })

  test(`trusted resolved alias remains available in comparison (${lang}/${theme})`, async ({ page }) => {
    await openComparison(page, {
      lang, theme,
      state: {
        ean: MILK_EAN, name: 'Trusted resolved product', nameKz: 'Trusted resolved product',
        category: 'dairy_eggs', ingredients: 'Рис, вода', priceKzt: 500,
        sourceMeta: { resolvedAliasEan: UNKNOWN_EAN, resolvedAliasStatus: 'trusted', resolvedAliasConfidence: 90 },
      },
    })
    await expect(page.locator('.compare-product--a .compare-product-name')).toHaveText('Trusted resolved product')
    await expect(page.locator('.compare-product--b .compare-product-name')).toHaveText('Pilot identity target')
  })

  test(`review-only resolved alias cannot substitute comparison identity (${lang}/${theme})`, async ({ page }) => {
    await openComparison(page, {
      lang, theme,
      state: {
        ean: MILK_EAN, name: 'Review-only product',
        sourceMeta: { resolvedAliasEan: UNKNOWN_EAN, resolvedAliasStatus: 'review', resolvedAliasConfidence: 90 },
      },
    })
    await expect(page.locator('.compare-product--a')).toHaveCount(0)
    await expect(page.locator('.compare-empty')).toBeVisible()
  })

  test(`trusted resolver response remains available in comparison (${lang}/${theme})`, async ({ page }) => {
    await openComparison(page, { lang, theme, resolvedAlias: true })
    await expect(page.locator('.compare-product--a .compare-product-name')).toHaveText('RPC trusted product')
    await expect(page.locator('.compare-product--b .compare-product-name')).toHaveText('Pilot identity target')
  })
}

test('pilot fixture blocks unmatched local API while allowing an explicit mock', async ({ page }) => {
  await openConsumer(page)
  const blocked = await page.evaluate(async () => {
    const response = await fetch('/api/pilot-isolation-probe')
    return { status: response.status, body: await response.json() }
  })
  expect(blocked).toEqual({ status: 503, body: { error: 'Unmocked pilot API' } })
  await page.route('**/api/pilot-isolation-probe', (route) => route.fulfill({ json: { local: true } }))
  await expect.poll(() => page.evaluate(async () => (await fetch('/api/pilot-isolation-probe')).json())).toEqual({ local: true })
})
