import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'
import { UNKNOWN_EAN } from '../pilot/consumerFixtures.js'

const name = 'Pilot milk (A+B) 3.2% [x]_* "q" \\'
const storeId = '00000000-0000-4000-8000-000000000001'

async function openSearch(page, { lang = 'ru', theme = 'light' } = {}) {
  await openRetail(page, { lang, theme })
  await signInRetail(page)
  const queries = []
  await page.route('**/rest/v1/global_products**', (route) => {
    queries.push(new globalThis.URL(route.request().url()))
    return route.fulfill({ json: [{ id: '22222222-2222-4222-8222-222222222222' }] })
  })
  await page.route('**/rest/v1/store_products**', (route) => {
    queries.push(new globalThis.URL(route.request().url()))
    return route.fulfill({
      headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' },
      json: [{
        id: '11111111-1111-4111-8111-111111111111',
        ean: UNKNOWN_EAN,
        local_name: name,
        price_kzt: 420,
        stock_status: 'unknown',
        sync_integration_id: null,
        is_active: true,
        global_products: { name, brand: 'Pilot, Brand', category: 'dairy_eggs' },
      }],
    })
  })
  await page.goto('/retail/audit/products')
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
  return { input: page.getByRole('searchbox'), queries }
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`an opening parenthesis stays a literal search and leaves the catalog usable (${lang}/${theme})`, async ({ page }) => {
      const { input } = await openSearch(page, { lang, theme })
      await input.fill('(')
      await expect(input).toHaveValue('(')
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
      await expect(page.locator('span').filter({ hasText: /^\($/u }).first()).toBeVisible()
      await input.fill('Pilot')
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
    })
  }
}

for (const query of ['+', '[', '3.2%', '_', '*', '"q"', '\\', ',price_kzt.gt.0']) {
  test(`the server filter keeps ${JSON.stringify(query)} inside a literal value`, async ({ page }) => {
    const { input, queries } = await openSearch(page)
    await input.fill(query)
    await expect(input).toHaveValue(query)
    await expect.poll(() => queries.filter((url) => url.pathname.endsWith('/store_products') && url.searchParams.has('or')).length).toBeGreaterThan(0)
    const global = queries.findLast((url) => url.pathname.endsWith('/global_products') && url.searchParams.has('or'))
    const local = queries.findLast((url) => url.pathname.endsWith('/store_products') && url.searchParams.has('or'))
    expect(global.searchParams.get('or')).toMatch(/^\(name\.imatch\.".*",brand\.imatch\.".*"\)$/u)
    expect(local.searchParams.get('or')).toMatch(/^\(local_name\.imatch\.".*",ean\.imatch\.".*",global_product_id\.in\.\(22222222-2222-4222-8222-222222222222\)\)$/u)
    expect(local.searchParams.get('store_id')).toBe(`eq.${storeId}`)
    expect(local.searchParams.get('is_active')).toBe('eq.true')
    for (const url of [global, local]) {
      const values = [...url.searchParams.get('or').matchAll(/(?:name|brand|local_name|ean)\.imatch\.("(?:\\.|[^"\\])*")/gu)]
      expect(values).toHaveLength(2)
      for (const [, quoted] of values) {
        const pattern = new RegExp(JSON.parse(quoted), 'iu')
        expect(pattern.test(`before ${query} after`)).toBe(true)
        expect(pattern.test('a completely different product')).toBe(false)
      }
    }
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
  })
}
