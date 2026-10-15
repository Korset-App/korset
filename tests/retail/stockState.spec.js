import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'
import { UNKNOWN_EAN } from '../pilot/consumerFixtures.js'

const productId = '11111111-1111-4111-8111-111111111111'
const storeId = '00000000-0000-4000-8000-000000000001'

async function openStock(page, { status = 'unknown', managed = false, fail = false, delayed = false, lang = 'ru', theme = 'light', viewMode = 'list' } = {}) {
  await openRetail(page, { lang, theme })
  await signInRetail(page)
  await page.evaluate((viewMode) => globalThis.localStorage.setItem('retail_view_mode', viewMode), viewMode)
  let stock = status
  let release
  const writes = []
  const pending = new Promise((resolve) => { release = resolve })
  await page.route('**/rest/v1/store_products**', async (route) => {
    const request = route.request()
    if (request.method() === 'PATCH') {
      writes.push({ body: request.postDataJSON(), url: request.url() })
      if (delayed) await pending
      if (fail) return route.fulfill({ status: 403, json: { message: 'Test-only refusal detail' } })
      stock = request.postDataJSON().stock_status
      return route.fulfill({ json: [{ id: productId }] })
    }
    return route.fulfill({
      headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' },
      json: [{
        id: productId,
        ean: UNKNOWN_EAN,
        local_name: 'Pilot unknown ingredients',
        stock_status: stock,
        price_kzt: 420,
        is_active: true,
        sync_integration_id: managed ? '22222222-2222-4222-8222-222222222222' : null,
        global_products: { name: 'Pilot unknown ingredients', category: 'dairy_eggs' },
      }],
    })
  })
  await page.goto('/retail/audit/products')
  await page.getByText('Pilot unknown ingredients', { exact: true }).first().click()
  const control = page.getByRole('switch').first()
  await expect(control).toBeVisible()
  return { control, writes, release }
}

for (const width of [390, 1440]) {
  for (const lang of ['ru', 'kz']) {
    for (const theme of ['light', 'dark']) {
      test(`unknown stock is explicit and an owner confirms availability (${width}/${lang}/${theme})`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        const { control, writes } = await openStock(page, { lang, theme })
        await expect(control).toHaveAttribute('aria-checked', 'false')
        await expect(control).toHaveAccessibleName(new RegExp(lang === 'ru' ? 'Наличие требует уточнения' : 'Қолда барын нақтылау қажет', 'iu'))
        await page.screenshot({ path: test.info().outputPath(`unknown-stock-${width}-${lang}-${theme}.png`), animations: 'disabled' })
        await control.focus()
        await control.press('Space')
        await expect.poll(() => writes.length).toBe(1)
        expect(writes[0].body.stock_status).toBe('in_stock')
        const url = new globalThis.URL(writes[0].url)
        expect(url.searchParams.get('id')).toBe(`eq.${productId}`)
        expect(url.searchParams.get('store_id')).toBe(`eq.${storeId}`)
        await expect(control).toHaveAttribute('aria-checked', 'true')
      })
    }
  }
}

test('a refused stock change restores unknown state and shows a safe error', async ({ page }) => {
  const { control, writes } = await openStock(page, { fail: true })
  await control.click()
  await expect.poll(() => writes.length).toBe(1)
  await expect(control).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('alert')).toContainText('Не удалось изменить наличие')
  await expect(page.getByRole('alert')).not.toContainText('Test-only refusal detail')
})

test('an in-flight stock change cannot be submitted twice', async ({ page }) => {
  const { control, writes, release } = await openStock(page, { status: 'out_of_stock', delayed: true })
  try {
    await control.click()
    await expect.poll(() => writes.length).toBe(1)
    await expect(control).toBeDisabled()
    await control.press('Space')
    expect(writes).toHaveLength(1)
    const saved = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes('/rest/v1/store_products'))
    release()
    await saved
    await expect(control).toBeEnabled({ timeout: 10000 })
    await expect(control).toHaveAttribute('aria-checked', 'true')
    expect(writes).toHaveLength(1)
  } finally {
    release()
  }
})

test('stock managed by an integration stays locked', async ({ page }) => {
  const { control, writes } = await openStock(page, { managed: true })
  await expect(control).toBeDisabled()
  await control.press('Space')
  expect(writes).toEqual([])
})

for (const status of [null, 'in_stock', 'low_stock', 'out_of_stock']) {
  test(`stock transition preserves the explicit ${status} state`, async ({ page }) => {
    const { control, writes } = await openStock(page, { status })
    const on = status === 'in_stock' || status === 'low_stock'
    await expect(control).toHaveAttribute('aria-checked', String(on))
    await control.click()
    await expect.poll(() => writes.length).toBe(1)
    expect(writes[0].body.stock_status).toBe(on ? 'out_of_stock' : 'in_stock')
    await expect(control).toHaveAttribute('aria-checked', String(!on))
  })
}

test('the mobile grid editor confirms unknown stock with its keyboard control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  const { control, writes } = await openStock(page, { viewMode: 'grid', lang: 'kz', theme: 'dark' })
  await expect(control).toHaveAccessibleName(/Қолда барын нақтылау қажет/u)
  await expect(control).toHaveAttribute('aria-checked', 'false')
  await control.focus()
  await control.press('Space')
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.stock_status).toBe('in_stock')
  await expect(control).toBeEnabled()
  await expect(control).toHaveAttribute('aria-checked', 'true')
})

test('the grid editor preserves unknown stock after a refused change', async ({ page }) => {
  const { control, writes } = await openStock(page, { viewMode: 'grid', fail: true })
  await control.click()
  await expect.poll(() => writes.length).toBe(1)
  await expect(page.getByRole('alert')).toContainText('Не удалось изменить наличие')
  await expect(control).toHaveAttribute('aria-checked', 'false')
})
