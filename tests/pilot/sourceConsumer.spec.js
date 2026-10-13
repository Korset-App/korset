import { test, expect } from '@playwright/test'
import { openConsumer, stores } from './consumerFixtures.js'

const sourceId = '11111111-1111-4111-8111-111111111111'
const sourceRef = `si:${sourceId}`
const row = {
  store_source_item_id: sourceId,
  store_id: stores['pilot-a'].id,
  name: 'Pilot weighted food',
  ean: null,
  unit: 'kg',
  regular_minor: 123456,
  stock_status: 'in_stock',
  observed_at: '2020-01-01T00:00:00Z',
  global_product: null,
  needs_enrichment: true,
}

for (const [lang, theme] of [['ru', 'light'], ['kz', 'dark']]) {
  test(`a weighted item without EAN keeps its guest shopping-list identity on reload (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openConsumer(page, { lang, theme })
    const requests = []
    await page.route('**/rest/v1/rpc/korset_get_store_source_cards', (route) => {
      const body = route.request().postDataJSON()
      requests.push(body)
      return route.fulfill({ json: body.p_store_id === row.store_id && body.p_source_id === sourceId ? [row] : [] })
    })
    await page.goto(`/s/pilot-a/product/${sourceRef}`)
    await expect(page.getByRole('heading', { name: row.name, exact: true })).toBeVisible()
    await expect(page.locator('.store-source-product__price')).toHaveText(/1\s?234,56\s?₸\s*\/\s*кг/u)
    await expect(page.getByText(lang === 'ru' ? 'Наличие требует уточнения' : 'Қолда барын нақтылау қажет', { exact: true })).toBeVisible()
    await expect(page.locator('.store-source-product .shopping-list-button')).toBeEnabled()
    await page.locator('.store-source-product .shopping-list-button').click()
    await expect(page.locator('.store-source-product .shopping-list-button')).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.locator('.store-source-product .shopping-list-button')).toHaveAttribute('aria-pressed', 'true')
    await page.screenshot({ path: test.info().outputPath(`weighted-source-${lang}.png`), fullPage: true })
    await page.getByRole('button', { name: lang === 'ru' ? 'К каталогу магазина' : 'Дүкен каталогына', exact: true }).click()
    await expect(page).toHaveURL(/\/s\/pilot-a\/catalog$/u)
    expect(requests.every((body) => body.p_store_id === row.store_id && (!body.p_source_id || body.p_source_id === sourceId))).toBe(true)
  })

  test(`a source reference from another store cannot reveal its product or price (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openConsumer(page, { lang, theme })
    const requests = []
    await page.route('**/rest/v1/rpc/korset_get_store_source_cards', (route) => {
      const body = route.request().postDataJSON()
      requests.push(body)
      return route.fulfill({ json: body.p_store_id === row.store_id && body.p_source_id === sourceId ? [row] : [] })
    })
    await page.goto(`/s/pilot-b/product/${sourceRef}`)
    await expect(page.locator('.store-source-product [role="status"]')).toBeVisible()
    await expect.poll(() => requests.some((body) => body.p_store_id === stores['pilot-b'].id && body.p_source_id === sourceId)).toBe(true)
    await expect(page.getByText(lang === 'ru' ? 'Товар сейчас недоступен в этом магазине.' : 'Тауар қазір бұл дүкенде қолжетімсіз.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: row.name, exact: true })).toHaveCount(0)
    await expect(page.locator('.store-source-product__price')).toHaveCount(0)
  })

  test(`sharing a weighted shopping item preserves its price unit (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openConsumer(page, { lang, theme })
    await page.route('**/rest/v1/rpc/korset_get_store_source_cards', (route) => {
      const body = route.request().postDataJSON()
      return route.fulfill({ json: body.p_store_id === row.store_id && body.p_source_id === sourceId ? [row] : [] })
    })
    await page.goto(`/s/pilot-a/product/${sourceRef}`)
    await expect(page.locator('.store-source-product .shopping-list-button')).toBeEnabled()
    await page.locator('.store-source-product .shopping-list-button').click()
    await expect(page.locator('.store-source-product .shopping-list-button')).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/s/pilot-a/shopping-list')
    await expect(page.getByText(row.name, { exact: true })).toBeVisible()
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ text }) => { globalThis.sharedListText = text } })
    })
    await page.locator('.shopping-page__share').click()
    await expect.poll(() => page.evaluate(() => globalThis.sharedListText)).toMatch(/1\s?234,56\s?₸\s*\/\s*кг/u)
    expect(await page.evaluate(() => globalThis.sharedListText)).toMatch(/0\s?₸$/u)
  })
}
