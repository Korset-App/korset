import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'

const storeId = '00000000-0000-4000-8000-000000000001'
const endpoints = [
  'get_unique_customers', 'get_lost_revenue', 'get_scan_coverage',
  'get_top_scanned_products', 'get_missed_opportunities',
  'fn_get_alternative_events_summary', 'fn_get_compare_events_summary',
]
const labels = {
  ru: { group: 'Период статистики', customers: 'Покупателей', scans: 'Сканирований', periods: ['24 часа', '7 дней', '14 дней', '30 дней', '90 дней'] },
  kz: { group: 'Статистика кезеңі', customers: 'Сатып алушылар', scans: 'Сканерлеулер', periods: ['24 сағат', '7 күн', '14 күн', '30 күн', '90 күн'] },
}

async function mockPeriods(page, holdSeven = null) {
  const calls = []
  const scans = []
  await page.route('**/rest/v1/rpc/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname.split('/').at(-1)
    if (!endpoints.includes(endpoint)) return route.fallback()
    const body = route.request().postDataJSON()
    calls.push({ endpoint, body })
    if (endpoint === 'get_unique_customers' && body.p_days_back === 7 && holdSeven) await holdSeven
    const responses = {
      get_unique_customers: body.p_days_back * 10,
      get_lost_revenue: body.p_days_back * 100,
      get_scan_coverage: 80,
      get_top_scanned_products: [], get_missed_opportunities: [],
      fn_get_alternative_events_summary: [{ total_count: 0 }],
      fn_get_compare_events_summary: [{ total_count: 0 }],
    }
    return route.fulfill({ json: responses[endpoint] })
  })
  await page.route('**/rest/v1/scan_events**', (route) => {
    const url = new URL(route.request().url())
    const elapsed = (Date.now() - Date.parse(url.searchParams.get('scanned_at')?.replace(/^gte\./, ''))) / 86400000
    scans.push({ store: url.searchParams.get('store_id'), elapsed })
    return route.fulfill({ body: '', headers: { 'content-range': `*/${Math.round(elapsed) * 10}`, 'access-control-expose-headers': 'content-range' } })
  })
  return { calls, scans }
}

for (const [lang, theme, width] of [['ru', 'light', 1440], ['kz', 'dark', 390]]) {
  test(`malformed dashboard periods keep the bounded seven-day default (${lang}/${theme})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await openRetail(page, { lang, theme })
    await signInRetail(page)
    const { calls } = await mockPeriods(page)
    for (const invalid of ['bad', '-1', '999']) {
      const before = calls.length
      await page.goto(`/retail/audit/dashboard?preview&period=${invalid}`)
      const group = page.getByRole('group', { name: labels[lang].group, exact: true })
      await expect(group.getByRole('button', { name: labels[lang].periods[1], exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(() => new Set(calls.slice(before).map((call) => call.endpoint)).size).toBe(endpoints.length)
      expect(calls.slice(before).every((call) => call.body.p_store_id === storeId && call.body.p_days_back === 7)).toBe(true)
    }
  })

  test(`all dashboard periods scope demand requests and displayed counts (${lang}/${theme})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await openRetail(page, { lang, theme })
    await signInRetail(page)
    const { calls, scans } = await mockPeriods(page)
    await page.reload()
    const group = page.getByRole('group', { name: labels[lang].group, exact: true })
    const customer = page.locator('.ov-kpi').filter({ has: page.getByText(labels[lang].customers, { exact: true }) })
    const scan = page.locator('.ov-kpi').filter({ has: page.getByText(labels[lang].scans, { exact: true }) })
    await expect(customer.locator('.ov-kpi__value')).toHaveText('70')
    for (const [index, days] of [1, 7, 14, 30, 90].entries()) {
      await group.getByRole('button', { name: labels[lang].periods[index], exact: true }).click()
      await expect(customer.locator('.ov-kpi__value')).toHaveText(String(days * 10))
      await expect(scan.locator('.ov-kpi__value')).toHaveText(String(days * 10))
      await expect(group.getByRole('button', { name: labels[lang].periods[index], exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(() => new Set(calls.filter((call) => call.body.p_days_back === days).map((call) => call.endpoint)).size).toBe(endpoints.length)
      expect(calls.filter((call) => call.body.p_days_back === days).every((call) => call.body.p_store_id === storeId)).toBe(true)
      expect(scans.some((call) => call.store === `eq.${storeId}` && Math.abs(call.elapsed - days) < 0.0001)).toBe(true)
      expect(new URL(page.url()).searchParams.get('period')).toBe(days === 7 ? null : String(days))
    }
  })

  test(`a late previous-period response cannot replace the selected dashboard period (${lang}/${theme})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await openRetail(page, { lang, theme })
    await signInRetail(page)
    let release
    const pending = new Promise((resolve) => { release = resolve })
    const { calls } = await mockPeriods(page, pending)
    await page.reload()
    const customer = page.locator('.ov-kpi').filter({ has: page.getByText(labels[lang].customers, { exact: true }) })
    await expect.poll(() => calls.some((call) => call.endpoint === 'get_unique_customers' && call.body.p_days_back === 7)).toBe(true)
    const group = page.getByRole('group', { name: labels[lang].group, exact: true })
    await group.getByRole('button', { name: labels[lang].periods[3], exact: true }).click()
    await expect(customer.locator('.ov-kpi__value')).toHaveText('300')
    const oldResponse = page.waitForResponse((response) => response.url().endsWith('/get_unique_customers') && response.request().postDataJSON().p_days_back === 7)
    release()
    await oldResponse
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await expect(customer.locator('.ov-kpi__value')).toHaveText('300')
    await expect(group.getByRole('button', { name: labels[lang].periods[3], exact: true })).toHaveAttribute('aria-pressed', 'true')
    await group.getByRole('button', { name: labels[lang].periods[1], exact: true }).click()
    await expect(customer.locator('.ov-kpi__value')).toHaveText('70')
  })
}

test('retail fixture blocks unmatched local API while explicit local mocks remain usable', async ({ page }) => {
  await openRetail(page)
  expect(await page.evaluate(async () => (await fetch('/api/retail-isolation-probe')).status)).toBe(503)
  await page.route('**/api/retail-isolation-probe', (route) => route.fulfill({ json: { local: true } }))
  expect(await page.evaluate(async () => (await fetch('/api/retail-isolation-probe')).json())).toEqual({ local: true })
})
