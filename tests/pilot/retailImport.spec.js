import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { openRetail } from '../retail/fixtures.js'

const validCsv = (ean = '4870207654321') => ({
  name: 'pilot.csv', mimeType: 'text/csv',
  buffer: Buffer.from(`EAN,Цена,Наличие\n${ean},200,аз`),
})

test('a successful known-product import requests a fresh catalog for its store', async ({ page }) => {
  await openRetail(page)
  const catalogRequests = []
  await page.route('**/rest/v1/store_products*', (route) => route.fulfill({ json: [{ id: 'fixture-product', ean: '4870201234567' }] }))
  await page.route('**/rest/v1/rpc/bulk_update_store_products', (route) => route.fulfill({ json: 1 }))
  await page.route('**/rest/v1/rpc/fn_get_store_catalog_page', (route) => {
    catalogRequests.push(route.request().postDataJSON())
    return route.fulfill({ json: [] })
  })
  await page.goto('/retail/audit/import?preview')
  await page.locator('input[type="file"]').setInputFiles(validCsv('4870201234567'))
  await page.getByRole('button', { name: 'Применить изменения', exact: true }).click()
  await expect.poll(() => catalogRequests.length).toBe(1)
  expect(catalogRequests[0].p_store_id).toBe('00000000-0000-4000-8000-000000000001')
})

test('new parsing or oversized selection cannot apply previous rows', async ({ page }) => {
  await openRetail(page)
  await page.goto('/retail/audit/import?preview')
  const input = page.locator('input[type="file"]')
  const apply = page.getByRole('button', { name: 'Применить изменения', exact: true })
  await input.setInputFiles(validCsv())
  await expect(apply).toBeEnabled()
  await input.setInputFiles({ name: 'large.csv', mimeType: 'text/csv', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
  await expect(apply).toBeDisabled()
  await input.setInputFiles(validCsv())
  await expect(apply).toBeEnabled()
  await page.evaluate(() => {
    const original = globalThis.File.prototype.text
    globalThis.File.prototype.text = function () {
      if (this.name !== 'slow.csv') return original.call(this)
      return new Promise((resolve) => { globalThis.releaseImportParse = () => resolve('EAN,Цена,Наличие\n4870201234567,300,аз') })
    }
  })
  await input.setInputFiles({ name: 'slow.csv', mimeType: 'text/csv', buffer: Buffer.from('pending') })
  await expect(apply).toBeDisabled()
  await input.setInputFiles(validCsv())
  await expect(page.getByText('4870207654321', { exact: true })).toBeVisible()
  await page.evaluate(() => globalThis.releaseImportParse())
  await expect(page.getByText('4870201234567', { exact: true })).toHaveCount(0)
})

test('pending apply blocks a second write and store switch hides old result', async ({ page }) => {
  await openRetail(page)
  const firstStoreId = '00000000-0000-4000-8000-000000000001'
  const secondStoreId = '00000000-0000-4000-8000-000000000003'
  await page.route('**/rest/v1/stores*', (route) => {
    const code = new globalThis.URL(route.request().url()).searchParams.get('code')
    if (code !== 'eq.other') return route.fallback()
    return route.fulfill({ json: {
      id: secondStoreId, code: 'other', slug: 'other', name: 'Other store',
      is_active: true, is_published: true,
    } })
  })
  let releaseWrite
  let writeStarted
  const pendingWrite = new Promise((resolve) => { releaseWrite = resolve })
  const started = new Promise((resolve) => { writeStarted = resolve })
  const writes = []
  await page.route('**/rest/v1/rpc/stage_unknown_eans', async (route) => {
    writes.push(route.request().postDataJSON())
    writeStarted()
    await pendingWrite
    await route.fulfill({ json: 1 })
  })
  await page.goto('/retail/audit/import?preview')
  await page.locator('input[type="file"]').setInputFiles(validCsv())
  await page.getByRole('button', { name: 'Применить изменения', exact: true }).click()
  await started
  await page.evaluate(() => {
    globalThis.localStorage.setItem('korset_store_data_other', JSON.stringify({
      id: '00000000-0000-4000-8000-000000000003', code: 'other', slug: 'other',
      name: 'Other store', is_active: true, is_published: true,
    }))
    globalThis.history.pushState({}, '', '/retail/other/import?preview')
    globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'))
  })
  await expect(page.getByText('4870207654321', { exact: true })).toHaveCount(0)
  await expect(page.locator('input[type="file"]')).toBeDisabled()
  releaseWrite()
  await expect(page.locator('input[type="file"]')).toBeEnabled()
  await expect(page.getByText('4870207654321', { exact: true })).toHaveCount(0)
  await page.locator('input[type="file"]').setInputFiles(validCsv('4870201234567'))
  await page.getByRole('button', { name: 'Применить изменения', exact: true }).click()
  await expect.poll(() => writes.length).toBe(2)
  expect(writes.map((write) => write.p_store_id)).toEqual([firstStoreId, secondStoreId])
  await expect(page.getByText('4870207654321', { exact: true })).toHaveCount(0)
})

test('late parsing from another store cannot publish rows', async ({ page }) => {
  await openRetail(page)
  await page.route('**/rest/v1/stores*', (route) => {
    const code = new globalThis.URL(route.request().url()).searchParams.get('code')
    if (code !== 'eq.other') return route.fallback()
    return route.fulfill({ json: {
      id: '00000000-0000-4000-8000-000000000003', code: 'other', slug: 'other',
      name: 'Other store', is_active: true, is_published: true,
    } })
  })
  await page.goto('/retail/audit/import?preview')
  await page.evaluate(() => {
    globalThis.File.prototype.text = function () {
      return new Promise((resolve) => {
        globalThis.releaseImportParse = () => resolve('EAN,Цена,Наличие\n4870207654321,200,аз')
      })
    }
  })
  await page.locator('input[type="file"]').setInputFiles({
    name: 'slow.csv', mimeType: 'text/csv', buffer: Buffer.from('pending'),
  })
  await page.evaluate(() => {
    globalThis.localStorage.setItem('korset_store_data_other', JSON.stringify({
      id: '00000000-0000-4000-8000-000000000003', code: 'other', slug: 'other',
      name: 'Other store', is_active: true, is_published: true,
    }))
    globalThis.history.pushState({}, '', '/retail/other/import?preview')
    globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'))
  })
  await page.evaluate(async () => {
    globalThis.releaseImportParse()
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0))
  })
  await expect(page.getByText('4870207654321', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Применить изменения', exact: true })).toBeDisabled()
})

for (const lang of ['ru', 'kz']) {
  test(`missing availability is explained and cannot be applied (${lang})`, async ({ page }) => {
    await openRetail(page, { lang })
    await page.goto('/retail/audit/import?preview')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'missing.csv', mimeType: 'text/csv',
      buffer: Buffer.from('EAN,Цена,Наличие\n4870207654321,200,'),
    })
    await expect(page.getByText(lang === 'ru'
      ? 'Не указано наличие: строка не будет импортирована'
      : 'Қолда бар-жоғы көрсетілмеген: жол импортталмайды', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: lang === 'ru' ? 'Применить изменения' : 'Өзгерістерді қолдану', exact: true })).toBeDisabled()
  })
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`import reports saved queue rows separately from failed automatic processing (${lang}, ${theme})`, async ({ page }) => {
      await openRetail(page, { lang, theme })
      await page.route('**/rest/v1/rpc/stage_unknown_eans', (route) => route.fulfill({ json: 1 }))
      await page.route('**/rest/v1/rpc/resolve_unknown_eans', (route) => route.fulfill({
        status: 503, json: { message: 'Pilot processing unavailable' },
      }))
      await page.goto('/retail/audit/import?preview')
      await page.locator('input[type="file"]').setInputFiles({
        name: 'pilot.csv', mimeType: 'text/csv',
        buffer: Buffer.from('EAN,Цена,Наличие\n4870207654321,200,аз'),
      })
      await page.getByRole('button', { name: lang === 'ru' ? 'Применить изменения' : 'Өзгерістерді қолдану', exact: true }).click()
      await expect(page.getByText(lang === 'ru'
        ? 'Товары сохранены в очереди. Автоматическое сопоставление завершилось ошибкой.'
        : 'Тауарлар кезекте сақталды. Автоматты сәйкестендіру қатемен аяқталды.', { exact: true })).toBeVisible()
      await expect(page.getByText(lang === 'ru'
        ? 'Постановка новых товаров в очередь не подтверждена.'
        : 'Жаңа тауарлардың кезекке қосылғаны расталмады.', { exact: false })).toHaveCount(0)
    })

    test(`import excludes invalid availability and reports a refused staging write (${lang}, ${theme})`, async ({ page }) => {
      await openRetail(page, { lang, theme })
      const writes = []
      await page.route('**/rest/v1/rpc/stage_unknown_eans', async (route) => {
        writes.push(route.request().postDataJSON())
        return route.fulfill({ status: 403, json: { message: 'Pilot staging denied' } })
      })
      await page.goto('/retail/audit/import?preview')
      await page.locator('input[type="file"]').setInputFiles({
        name: 'pilot.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('EAN,Цена,Наличие\n4870201234567,100,typo\n4870207654321,200,аз'),
      })
      await expect(page.getByText(lang === 'ru' ? 'Некорректный статус наличия' : 'Қолда бар-жоғының мәртебесі дұрыс емес', { exact: false })).toBeVisible()
      await page.getByRole('button', { name: lang === 'ru' ? 'Применить изменения' : 'Өзгерістерді қолдану', exact: true }).click()
      await expect(page.getByText('Pilot staging denied', { exact: true })).toBeVisible()
      expect(writes).toHaveLength(1)
      expect(writes[0].p_eans).toEqual(['4870207654321'])
      expect(writes[0].p_stock_statuses).toEqual(['low_stock'])
      await expect(page.getByText(lang === 'ru' ? 'Постановка новых товаров в очередь не подтверждена.' : 'Жаңа тауарлардың кезекке қосылғаны расталмады.', { exact: false })).toBeVisible()
    })
  }
}
