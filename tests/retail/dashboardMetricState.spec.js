import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'

const labels = {
  ru: { customers: 'Покупателей', error: 'Ошибка загрузки', retry: 'Повторить' },
  kz: { customers: 'Сатып алушылар', error: 'Жүктеу қатесі', retry: 'Қайталау' },
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`a failed customer metric exposes its own safe retry while other statistics stay usable (${lang}/${theme})`, async ({ page }) => {
      const width = lang === 'kz' && theme === 'dark' ? 320 : lang === 'ru' && theme === 'light' ? 1440 : 390
      await page.setViewportSize({ width, height: 844 })
      await openRetail(page, { lang, theme })
      await signInRetail(page)
      const recovered = theme === 'dark' ? 0 : 48
      let fail = true
      const requests = []
      await page.route('**/rest/v1/rpc/get_unique_customers', (route) => {
        requests.push(route.request().postDataJSON())
        return fail
          ? route.fulfill({ status: 503, json: { message: 'Test-only customer query failure' } })
          : route.fulfill({ json: recovered })
      })
      await page.reload()
      const metric = page.locator('.ov-kpi').filter({ has: page.getByText(labels[lang].customers, { exact: true }) })
      await expect(metric.locator('.ov-kpi__value')).toHaveText('—', { timeout: 15000 })
      await expect(metric.getByRole('alert')).toContainText(labels[lang].error)
      await expect(page.locator('.ov')).not.toContainText('Test-only customer query failure')
      await expect(page.locator('.ov-advice').getByRole('alert')).toHaveCount(0)
      const fits = await metric.getByRole('alert').evaluate((element) => {
        const cell = element.closest('.ov-kpi').getBoundingClientRect()
        return [...element.children].every((child) => child.getBoundingClientRect().right <= cell.right)
      })
      expect(fits).toBe(true)
      if ((lang === 'ru' && theme === 'light') || (lang === 'kz' && theme === 'dark')) {
        await page.screenshot({ path: `scratch/dashboard-metric-2026-10-14/${lang}-${theme}.png` })
      }
      const count = requests.length
      fail = false
      await metric.getByRole('button', { name: labels[lang].retry, exact: true }).click()
      await expect(metric.locator('.ov-kpi__value')).toHaveText(String(recovered))
      await expect(metric.getByRole('alert')).toHaveCount(0)
      expect(requests).toHaveLength(count + 1)
      expect(requests.every((body) => body.p_store_id === '00000000-0000-4000-8000-000000000001' && body.p_days_back === 7)).toBe(true)
    })
  }
}

test('a successful transport response without a customer count is unknown rather than zero', async ({ page }) => {
  await openRetail(page)
  await signInRetail(page)
  await page.route('**/rest/v1/rpc/get_unique_customers', (route) => route.fulfill({ json: null }))
  await page.reload()
  const metric = page.locator('.ov-kpi').filter({ has: page.getByText(labels.ru.customers, { exact: true }) })
  await expect(metric.locator('.ov-kpi__value')).toHaveText('—', { timeout: 15000 })
  await expect(metric.getByRole('alert')).toContainText(labels.ru.error)
})

test('a missing exact scan count does not claim that the store has no scans', async ({ page }) => {
  await openRetail(page)
  await signInRetail(page)
  await page.route('**/rest/v1/scan_events**', (route) => route.fulfill({ body: '' }))
  await page.reload()
  const metric = page.locator('.ov-kpi').filter({ has: page.getByText('Сканирований', { exact: true }) })
  await expect(metric.locator('.ov-kpi__value')).toHaveText('—', { timeout: 15000 })
  await expect(page.locator('.ov-advice').getByRole('alert')).toBeVisible()
  await expect(page.locator('.ov-launch')).toHaveCount(0)
})
