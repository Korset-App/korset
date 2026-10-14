import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'
import { UNKNOWN_EAN } from '../pilot/consumerFixtures.js'

const id = '11111111-1111-4111-8111-111111111111'
const storeId = '00000000-0000-4000-8000-000000000001'
const labels = {
  ru: { price: 'Розничная цена (₸)', featured: 'Закрепить в «Хитах»', error: 'Ошибка сохранения' },
  kz: { price: 'Бөлшек баға (₸)', featured: '«Үздіктерге» бекіту', error: 'Сақтау қатесі' },
}

async function openPricePromotion(page, { lang = 'ru', theme = 'light', mode = 'list', fail = null, delayed = false, managed = false, oldPriceKzt = null, discountPercent = null, noPromoColumns = false } = {}) {
  await openRetail(page, { lang, theme })
  await signInRetail(page)
  await page.evaluate((mode) => globalThis.localStorage.setItem('retail_view_mode', mode), mode)
  const row = {
    id, ean: UNKNOWN_EAN, local_name: 'Pilot unknown ingredients', price_kzt: 420,
    old_price_kzt: oldPriceKzt, discount_percent: discountPercent, is_featured: false,
    stock_status: 'in_stock', is_active: true,
    sync_integration_id: managed ? '22222222-2222-4222-8222-222222222222' : null,
    global_products: { name: 'Pilot unknown ingredients', category: 'dairy_eggs' },
  }
  const writes = []
  if (noPromoColumns) {
    delete row.old_price_kzt
    delete row.discount_percent
  }
  let release
  const pending = new Promise((resolve) => { release = resolve })
  await page.route('**/rest/v1/store_products**', async (route) => {
    const request = route.request()
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON()
      writes.push({ body, url: new globalThis.URL(request.url()) })
      if (noPromoColumns && /old_price_kzt|discount_percent/.test(new globalThis.URL(request.url()).searchParams.get('select'))) {
        return route.fulfill({ status: 400, json: { code: '42703', message: 'Test-only optional columns missing' } })
      }
      if (delayed) await pending
      if (fail === 'refused') return route.fulfill({ status: 403, json: { message: 'Test-only refusal detail' } })
      if (fail === 'empty') return route.fulfill({ json: [] })
      Object.assign(row, body)
      return route.fulfill({ json: [row] })
    }
    return route.fulfill({
      headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' },
      json: [row],
    })
  })
  await page.goto('/retail/audit/products')
  await page.getByText(row.local_name, { exact: true }).first().click()
  return {
    price: page.getByRole('spinbutton').first(),
    oldPrice: page.getByRole('spinbutton').nth(1),
    featured: page.getByRole('switch').last(), writes, release,
  }
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    for (const mode of ['list', 'grid']) {
      test(`price and featured placement accept sequential confirmed changes (${lang}/${theme}/${mode})`, async ({ page }) => {
        await page.setViewportSize({ width: mode === 'grid' ? 390 : 1440, height: 900 })
        const { price, featured, writes } = await openPricePromotion(page, { lang, theme, mode })
        await expect(price).toHaveAccessibleName(labels[lang].price)
        await price.fill('550')
        await price.blur()
        await expect.poll(() => writes.length).toBe(1)
        expect(writes[0].body.price_kzt).toBe(550)
        expect(writes[0].url.searchParams.get('id')).toBe(`eq.${id}`)
        expect(writes[0].url.searchParams.get('store_id')).toBe(`eq.${storeId}`)
        await expect(price).toHaveAttribute('aria-readonly', 'false')
        await expect(price).toHaveValue('550')
        await expect(featured).toHaveAccessibleName(labels[lang].featured)
        await featured.focus()
        await featured.press('Space')
        await expect.poll(() => writes.length).toBe(2)
        expect(writes[1].body.is_featured).toBe(true)
        await expect(featured).toBeEnabled()
        await expect(featured).toHaveAttribute('aria-checked', 'true')
        await featured.click()
        await expect.poll(() => writes.length).toBe(3)
        expect(writes[2].body.is_featured).toBe(false)
        await expect(featured).toHaveAttribute('aria-checked', 'false')
        await expect(featured).toBeEnabled()
        if ((lang === 'ru' && theme === 'light' && mode === 'list') ||
          (lang === 'kz' && theme === 'dark' && mode === 'grid')) {
          await price.scrollIntoViewIfNeeded()
          const bounds = await price.boundingBox()
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width)
          await page.screenshot({ path: `scratch/retail-price-promotion-2026-10-14/${lang}-${theme}-${mode}.png` })
        }
      })
    }
  }
}

for (const draft of ['', '1e309', '-1']) {
  test(`an invalid price draft ${JSON.stringify(draft)} cannot replace the existing price`, async ({ page }) => {
    const { price, writes } = await openPricePromotion(page)
    await price.fill(draft)
    await price.blur()
    await expect(price).toHaveValue('420')
    expect(writes).toEqual([])
  })
}

test('an explicitly entered zero retains the existing supported price behavior', async ({ page }) => {
  const { price, writes } = await openPricePromotion(page)
  await price.fill('0')
  await price.blur()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.price_kzt).toBe(0)
  await expect(price).toHaveValue('0')
})

for (const kind of ['price', 'oldPrice', 'featured']) {
  for (const fail of ['refused', 'empty']) {
    test(`${kind} ${fail} preserves the previous state and exposes a safe failure`, async ({ page }) => {
      const { price, oldPrice, featured, writes } = await openPricePromotion(page, { fail })
      if (kind === 'price') {
        await price.fill('550')
        await price.blur()
      } else if (kind === 'oldPrice') {
        await oldPrice.fill('600')
        await oldPrice.blur()
      } else await featured.click()
      await expect.poll(() => writes.length).toBe(1)
      await expect(page.getByText(labels.ru.error, { exact: true }).first()).toBeVisible()
      await expect(page.locator('body')).not.toContainText('Test-only refusal detail')
      if (kind === 'price') {
        await page.waitForTimeout(3200)
        await expect(page.getByText(labels.ru.error, { exact: true }).first()).toBeVisible()
        await expect(price).toHaveAttribute('aria-readonly', 'false')
        await expect(price).toHaveValue('420')
      } else if (kind === 'oldPrice') {
        await expect(oldPrice).toHaveValue('')
      } else {
        await expect(featured).toHaveAttribute('aria-checked', 'false')
        await expect(featured).toBeEnabled()
      }
    })
  }
}

for (const kind of ['price', 'featured']) {
  test(`a pending ${kind} change blocks duplicates and releases its control after the answer`, async ({ page }) => {
    const { price, featured, writes, release } = await openPricePromotion(page, { delayed: true })
    try {
      if (kind === 'price') {
        await price.fill('550')
        await price.blur()
      } else await featured.click()
      await expect.poll(() => writes.length).toBe(1)
      if (kind === 'price') {
        await expect(price).toHaveAttribute('aria-readonly', 'true')
        await price.focus()
        await price.blur()
      } else {
        await expect(featured).toBeDisabled()
        await featured.press('Space')
      }
      const saved = page.waitForResponse((response) => response.request().method() === 'PATCH')
      release()
      await saved
      if (kind === 'price') await expect(price).toHaveAttribute('aria-readonly', 'false')
      else await expect(featured).toBeEnabled()
      expect(writes).toHaveLength(1)
    } finally {
      release()
    }
  })
}

test('a managed product permits placement while retaining both source prices', async ({ page }) => {
  const { price, oldPrice, featured, writes } = await openPricePromotion(page, { managed: true })
  await expect(price).toHaveAttribute('readonly', '')
  await expect(oldPrice).toHaveAttribute('readonly', '')
  await featured.click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.is_featured).toBe(true)
  expect(writes[0].body).not.toHaveProperty('price_kzt')
  expect(writes[0].body).not.toHaveProperty('old_price_kzt')
  expect(writes[0].body).not.toHaveProperty('discount_percent')
})

test('featured placement is directly named and operable with the keyboard', async ({ page }) => {
  const { featured, writes } = await openPricePromotion(page)
  await expect(featured).toHaveAccessibleName(labels.ru.featured)
  await featured.focus()
  await featured.press('Space')
  await expect.poll(() => writes.length).toBe(1)
})

test('raising a price above its old reference cannot retain a fictional discount', async ({ page }) => {
  const { price, oldPrice, writes } = await openPricePromotion(page, { oldPriceKzt: 525, discountPercent: 20 })
  await price.fill('550')
  await price.blur()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.price_kzt).toBe(550)
  expect(writes[0].body.old_price_kzt).toBe(null)
  expect(writes[0].body.discount_percent).toBe(null)
  await expect(oldPrice).toHaveValue('')
  await expect(page.getByText('-20%', { exact: true })).toHaveCount(0)
})

test('featured placement changes no financial fields on an ordinary promoted product', async ({ page }) => {
  const { featured, oldPrice, writes } = await openPricePromotion(page, { oldPriceKzt: 525, discountPercent: 20 })
  await featured.click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.is_featured).toBe(true)
  for (const field of ['price_kzt', 'old_price_kzt', 'discount_percent']) {
    expect(writes[0].body).not.toHaveProperty(field)
  }
  await expect(featured).toBeEnabled()
  await expect(oldPrice).toHaveValue('525')
  await expect(page.getByText('-20%', { exact: true }).last()).toBeVisible()
})

test('changing a still-discounted price recalculates the percentage from its original reference', async ({ page }) => {
  const { price, oldPrice, writes } = await openPricePromotion(page, { oldPriceKzt: 525, discountPercent: 20 })
  await price.fill('450')
  await price.blur()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.old_price_kzt).toBe(525)
  expect(writes[0].body.discount_percent).toBe(14)
  await expect(oldPrice).toHaveValue('525')
  await expect(page.getByText('-14%', { exact: true }).last()).toBeVisible()
})

test('a newly saved reference is cleared when the following regular price overtakes it', async ({ page }) => {
  const { price, oldPrice, writes } = await openPricePromotion(page)
  await oldPrice.fill('600')
  await oldPrice.blur()
  await expect.poll(() => writes.length).toBe(1)
  await expect(price).toHaveAttribute('aria-readonly', 'false')
  await price.fill('650')
  await price.blur()
  await expect.poll(() => writes.length).toBe(2)
  expect(writes[1].body.old_price_kzt).toBe(null)
  await expect(oldPrice).toHaveValue('')
})

test('placement and regular price work when optional discount columns are not available', async ({ page }) => {
  const { price, featured, writes } = await openPricePromotion(page, { noPromoColumns: true })
  await featured.click()
  await expect(featured).toHaveAttribute('aria-checked', 'true')
  await expect(featured).toBeEnabled()
  expect(writes[0].url.searchParams.get('select')).toBe('id,is_featured')
  await price.fill('450')
  await price.blur()
  await expect(price).toHaveAttribute('aria-readonly', 'false')
  expect(writes[1].body.price_kzt).toBe(450)
  expect(writes[1].body).not.toHaveProperty('old_price_kzt')
  expect(writes[1].body).not.toHaveProperty('discount_percent')
  await expect(page.getByText(labels.ru.error, { exact: true })).toHaveCount(0)
})
