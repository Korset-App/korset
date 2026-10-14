import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'
import { UNKNOWN_EAN } from '../pilot/consumerFixtures.js'

const id = '11111111-1111-4111-8111-111111111111'
const labels = {
  ru: { price: 'Розничная цена (₸)', old: 'Цена до скидки (₸)', featured: 'Закрепить в «Хитах»', stock: 'Товар есть в наличии?' },
  kz: { price: 'Бөлшек баға (₸)', old: 'Жеңілдікке дейінгі баға (₸)', featured: '«Үздіктерге» бекіту', stock: 'Тауар дүкенде бар ма?' },
}

async function openEditor(page, { mode = 'list', theme = 'light', delayed = false } = {}) {
  await openRetail(page, { theme })
  await signInRetail(page)
  await page.evaluate((mode) => globalThis.localStorage.setItem('retail_view_mode', mode), mode)
  const row = {
    id, ean: UNKNOWN_EAN, local_name: 'Pilot unknown ingredients', price_kzt: 420,
    old_price_kzt: null, discount_percent: null, is_featured: false,
    is_active: true, stock_status: 'unknown', sync_integration_id: null,
    global_products: { name: 'Pilot unknown ingredients', category: 'dairy_eggs' },
  }
  const writes = []
  let release
  const pending = new Promise((resolve) => { release = resolve })
  await page.route('**/rest/v1/store_products**', async (route) => {
    if (route.request().method() === 'PATCH') {
      writes.push(route.request().postDataJSON())
      if (delayed) await pending
      Object.assign(row, writes.at(-1))
      return route.fulfill({ json: [row] })
    }
    return route.fulfill({ json: [row], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
  })
  await page.goto('/retail/audit/products')
  await page.getByText(row.local_name, { exact: true }).first().click()
  return { writes, release }
}

async function expectEditorLanguage(page, lang) {
  await expect(page.getByRole('spinbutton').first()).toHaveAccessibleName(labels[lang].price)
  await expect(page.getByRole('spinbutton').nth(1)).toHaveAccessibleName(labels[lang].old)
  await expect(page.getByRole('switch').last()).toHaveAccessibleName(labels[lang].featured)
  await expect(page.getByRole('switch').first()).toHaveAccessibleName(new RegExp(labels[lang].stock.replace('?', '\\?')))
}

for (const theme of ['light', 'dark']) {
  for (const width of [360, 390, 768, 1440]) {
    test(`account language round-trip updates the open catalog editor without reopening (${width}/${theme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const { writes } = await openEditor(page, { theme })
      await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
      await page.getByRole('button', { name: 'KZ', exact: true }).click()
      await page.keyboard.press('Escape')
      await expectEditorLanguage(page, 'kz')
      await expect.poll(() => page.locator('.retail-screen-canvas').evaluate((canvas) => canvas.scrollWidth <= canvas.clientWidth + 1)).toBe(true)
      await expect.poll(() => page.getByRole('spinbutton').evaluateAll((inputs) => inputs.some((input) => {
        const bounds = input.getBoundingClientRect()
        return bounds.left < 0 || bounds.right > globalThis.innerWidth + 1
      }))).toBe(false)
      if (width === 360 || width === 768) {
        await page.screenshot({ path: `scratch/pilot-closure-2026-10-14/catalog-${width}-${theme}-kz.png` })
      }
      await expect(page.getByRole('spinbutton').first()).toHaveValue('420')
      await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
      await page.getByRole('button', { name: 'RU', exact: true }).click()
      await page.keyboard.press('Escape')
      await expectEditorLanguage(page, 'ru')
      expect(writes).toEqual([])
      await expect(page).toHaveURL(/\/retail\/audit\/products$/)
    })
  }
  for (const mode of ['list', 'grid']) {
    test(`an app language event preserves the pending price operation (${mode}/${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 })
      const { writes, release } = await openEditor(page, { theme, mode, delayed: true })
      const price = page.getByRole('spinbutton').first()
      try {
        await price.fill('550')
        await price.blur()
        await expect.poll(() => writes.length).toBe(1)
        await expect(price).toHaveAttribute('aria-readonly', 'true')
        await page.evaluate(async () => (await import('/src/i18n/index.js')).setLang('kz'))
        await expectEditorLanguage(page, 'kz')
        await expect(price).toHaveValue('550')
        await expect(price).toHaveAttribute('aria-readonly', 'true')
        release()
        await expect(price).toHaveAttribute('aria-readonly', 'false')
        await expect(price).toHaveValue('550')
        expect(writes).toHaveLength(1)
        expect(writes[0].price_kzt).toBe(550)
        await expect(page).toHaveURL(/\/retail\/audit\/products$/)
      } finally { release() }
    })
  }
}
