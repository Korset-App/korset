import { test, expect } from '@playwright/test'
import { openConsumer, stores } from './consumerFixtures.js'

const sourceId = '11111111-1111-4111-8111-111111111111'
const ref = `si:${sourceId}`
const text = {
  ru: { stock: 'Есть в наличии', unknown: 'Наличие требует уточнения', saved: 'Показаны сохранённые данные. Текущую цену и наличие уточните в магазине.' },
  kz: { stock: 'Қолда бар', unknown: 'Қолда барын нақтылау қажет', saved: 'Сақталған деректер көрсетілген. Ағымдағы баға мен қолда барын дүкеннен нақтылаңыз.' },
}

async function openSource(page, options = {}) {
  await openConsumer(page, options)
  const now = Date.now()
  const row = {
    store_source_item_id: sourceId, store_id: stores['pilot-a'].id,
    name: 'Pilot weighted food', ean: null, unit: 'kg', regular_minor: 100000,
    sale_minor: 80000, valid_from: new Date(now - 60000).toISOString(),
    valid_until: new Date(now + 3600000).toISOString(), observed_at: new Date(now).toISOString(),
    stock_status: 'in_stock', global_product: null, needs_enrichment: true,
  }
  const requests = []
  let fail = false
  let hold = false
  let release
  const pending = new Promise((resolve) => { release = resolve })
  await page.route('**/rest/v1/rpc/korset_get_store_source_cards', async (route) => {
    const body = route.request().postDataJSON()
    if (!body.p_source_id) return route.fulfill({ json: [] })
    requests.push(body)
    if (hold) await pending
    if (fail) return route.fulfill({ status: 503, json: { message: 'Test-only source unavailable' } })
    return route.fulfill({ json: body.p_store_id === row.store_id && body.p_source_id === sourceId ? [row] : [] })
  })
  await page.goto(`/s/pilot-a/product/${ref}`)
  await expect(page.locator('.store-source-product__price')).toHaveText(/800\s*₸\s*\/\s*кг/u)
  return { row, requests, release, setFail: (value) => { fail = value }, setHold: (value) => { hold = value } }
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`an open source card drops unverified sale and stock immediately and restores only after confirmation (${lang}/${theme})`, async ({ page, context }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      const { requests, setHold, release } = await openSource(page, { lang, theme })
      const card = page.locator('.store-source-product')
      await expect(card.getByText(text[lang].stock, { exact: true })).toBeVisible()
      const count = requests.length
      await context.setOffline(true)
      await expect.poll(() => page.evaluate(() => globalThis.navigator.onLine)).toBe(false)
      await expect(card.getByText(text[lang].unknown, { exact: true })).toBeVisible()
      await expect(card.locator('.store-source-product__price')).toHaveText(/1\s?000\s*₸\s*\/\s*кг/u)
      await expect(card.getByText(text[lang].saved, { exact: true })).toBeVisible()
      await expect(card.locator('.shopping-list-button')).toBeEnabled()
      expect(requests).toHaveLength(count)
      if ((lang === 'ru' && theme === 'light') || (lang === 'kz' && theme === 'dark')) {
        await page.screenshot({ path: `scratch/source-offline-2026-10-14/${lang}-${theme}.png` })
      }
      setHold(true)
      try {
        await context.setOffline(false)
        await expect.poll(() => requests.length).toBe(count + 1)
        await expect(card.getByText(text[lang].unknown, { exact: true })).toBeVisible()
        await expect(card.locator('.store-source-product__price')).toHaveText(/1\s?000\s*₸\s*\/\s*кг/u)
        release()
        await expect(card.getByText(text[lang].stock, { exact: true })).toBeVisible()
        await expect(card.locator('.store-source-product__price')).toHaveText(/800\s*₸\s*\/\s*кг/u)
      } finally { release() }
      expect(requests.every((body) => body.p_store_id === stores['pilot-a'].id && body.p_source_id === sourceId)).toBe(true)
    })
  }
}

test('a failed reconnect keeps this source card as saved information instead of losing it', async ({ page, context }) => {
  const { requests, setFail } = await openSource(page)
  const card = page.locator('.store-source-product')
  await context.setOffline(true)
  await expect.poll(() => page.evaluate(() => globalThis.navigator.onLine)).toBe(false)
  await expect(card.getByText(text.ru.unknown, { exact: true })).toBeVisible()
  const count = requests.length
  setFail(true)
  await context.setOffline(false)
  await expect.poll(() => requests.length).toBe(count + 1)
  await expect(card.getByRole('heading', { name: 'Pilot weighted food', exact: true })).toBeVisible()
  await expect(card.getByText(text.ru.unknown, { exact: true })).toBeVisible()
  await expect(card.locator('.store-source-product__price')).toHaveText(/1\s?000\s*₸\s*\/\s*кг/u)
  await expect(card).not.toContainText('Test-only source unavailable')
})

test('a late reconnect response cannot confirm stock after another network loss', async ({ page, context }) => {
  const { requests, setHold, release } = await openSource(page)
  const card = page.locator('.store-source-product')
  await context.setOffline(true)
  await expect(card.getByText(text.ru.unknown, { exact: true })).toBeVisible()
  const count = requests.length
  setHold(true)
  try {
    await context.setOffline(false)
    await expect.poll(() => requests.length).toBe(count + 1)
    await context.setOffline(true)
    await expect.poll(() => page.evaluate(() => globalThis.navigator.onLine)).toBe(false)
    release()
    await expect(card.getByText(text.ru.unknown, { exact: true })).toBeVisible()
    await expect(card.locator('.store-source-product__price')).toHaveText(/1\s?000\s*₸\s*\/\s*кг/u)
    await expect(card.getByText(text.ru.saved, { exact: true })).toBeVisible()
  } finally { release() }
})
