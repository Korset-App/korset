import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'
import { UNKNOWN_EAN } from '../pilot/consumerFixtures.js'

const productId = '11111111-1111-4111-8111-111111111111'
const storeId = '00000000-0000-4000-8000-000000000001'
const labels = { ru: 'Рекомендовать к списку покупок', kz: 'Сатып алу тізіміне ұсыну' }

async function openRecommendation(page, { lang = 'ru', theme = 'light', viewMode = 'list', fail = null, delayed = false, supported = true, initialRecommended = false } = {}) {
  await openRetail(page, { lang, theme })
  await signInRetail(page)
  await page.evaluate((mode) => globalThis.localStorage.setItem('retail_view_mode', mode), viewMode)
  let recommended = initialRecommended
  let release
  const pending = new Promise((resolve) => { release = resolve })
  const writes = []
  await page.route('**/rest/v1/store_products**', async (route) => {
    const request = route.request()
    if (request.method() === 'PATCH') {
      writes.push({ body: request.postDataJSON(), url: new globalThis.URL(request.url()) })
      if (delayed) await pending
      if (fail === 'limit') return route.fulfill({ status: 400, json: { message: 'Maximum 10 shopping recommendation candidates per store' } })
      if (fail === 'refused') return route.fulfill({ status: 403, json: { message: 'Test-only refusal detail' } })
      if (fail === 'empty') return route.fulfill({ json: [] })
      recommended = request.postDataJSON().is_shopping_recommended
      return route.fulfill({ json: [{ id: productId, is_shopping_recommended: recommended }] })
    }
    return route.fulfill({
      headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' },
      json: [{
        id: productId, ean: UNKNOWN_EAN, local_name: 'Pilot unknown ingredients', price_kzt: 420,
        stock_status: 'in_stock', is_active: true, sync_integration_id: null,
        ...(supported && new globalThis.URL(request.url()).searchParams.get('select')?.includes('is_shopping_recommended') ? { is_shopping_recommended: recommended } : {}),
        global_products: { name: 'Pilot unknown ingredients', category: 'dairy_eggs' },
      }],
    })
  })
  await page.goto('/retail/audit/products')
  await page.getByText('Pilot unknown ingredients', { exact: true }).first().click()
  return { control: page.getByRole('switch', { name: labels[lang], exact: true }), writes, release }
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    for (const viewMode of ['list', 'grid']) {
      test(`an owner can confirm and then remove a shopping recommendation (${lang}/${theme}/${viewMode})`, async ({ page }) => {
        await page.setViewportSize({ width: viewMode === 'grid' ? 390 : 1440, height: 900 })
        const { control, writes } = await openRecommendation(page, { lang, theme, viewMode })
        await expect(control).toHaveAttribute('aria-checked', 'false')
        const saved = page.waitForResponse((response) => response.request().method() === 'PATCH')
        await control.focus()
        await control.press('Space')
        await saved
        await expect(control).toBeEnabled()
        await expect(control).toHaveAttribute('aria-checked', 'true')
        expect(writes).toHaveLength(1)
        expect(writes[0].body.is_shopping_recommended).toBe(true)
        expect(writes[0].url.searchParams.get('id')).toBe(`eq.${productId}`)
        expect(writes[0].url.searchParams.get('store_id')).toBe(`eq.${storeId}`)
        await control.click()
        await expect.poll(() => writes.length).toBe(2)
        expect(writes[1].body.is_shopping_recommended).toBe(false)
        await expect(control).toHaveAttribute('aria-checked', 'false')
        await expect(control).toBeEnabled()
      })
    }
  }
}

for (const fail of ['refused', 'limit', 'empty']) {
  test(`a ${fail} recommendation write restores the previous selection`, async ({ page }) => {
    const { control, writes } = await openRecommendation(page, { fail })
    await control.click()
    await expect.poll(() => writes.length).toBe(1)
    await expect(page.getByText(fail === 'limit' ? 'В одном магазине можно рекомендовать не более 10 товаров.' : 'Не удалось сохранить рекомендацию', { exact: true }).first()).toBeVisible()
    await expect(control).toHaveAttribute('aria-checked', 'false')
    await expect(control).toBeEnabled()
    await expect(page.locator('body')).not.toContainText('Test-only refusal detail')
    await expect(page.locator('body')).not.toContainText('Update blocked: RLS or row not found')
  })
}

test('an in-flight recommendation write remains single and unlocks after its response', async ({ page }) => {
  const { control, writes, release } = await openRecommendation(page, { delayed: true })
  try {
    await control.click()
    await expect.poll(() => writes.length).toBe(1)
    await expect(control).toBeDisabled()
    await control.press('Space')
    const saved = page.waitForResponse((response) => response.request().method() === 'PATCH')
    release()
    await saved
    await expect(control).toBeEnabled()
    expect(writes).toHaveLength(1)
  } finally {
    release()
  }
})

test('a missing recommendation column does not present a working control', async ({ page }) => {
  const { control, writes } = await openRecommendation(page, { supported: false })
  await expect(control).toHaveCount(0)
  expect(writes).toEqual([])
})


test('a persisted shopping recommendation survives reopening the catalog', async ({ page }) => {
  const { control, writes } = await openRecommendation(page, { initialRecommended: true })
  await expect(control).toHaveAttribute('aria-checked', 'true')
  await page.reload()
  await page.getByText('Pilot unknown ingredients', { exact: true }).first().click()
  await expect(control).toHaveAttribute('aria-checked', 'true')
  expect(writes).toEqual([])
})
