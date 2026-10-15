import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'

const labels = {
  ru: { alternatives: 'Сигналы альтернатив', comparisons: 'Сравнения товаров', error: 'Ошибка загрузки', retry: 'Повторить' },
  kz: { alternatives: 'Балама сигналдары', comparisons: 'Тауарларды салыстыру', error: 'Жүктеу қатесі', retry: 'Қайталау' },
}
const zero = {
  alternatives: { total_count: 0, compare_count: 0, ai_help_count: 0, open_count: 0, scenario_select_count: 0, top_scenario_count: 0, top_source_count: 0 },
  comparisons: { total_count: 0, winner_count: 0, draw_count: 0, blocked_count: 0, top_pair_count: 0 },
}

for (const kind of ['alternatives', 'comparisons']) {
  test(`a partial positive summary is unknown until all count facts are present (${kind})`, async ({ page }) => {
    await openRetail(page)
    await signInRetail(page)
    let recovered = false
    const endpoint = kind === 'alternatives' ? 'fn_get_alternative_events_summary' : 'fn_get_compare_events_summary'
    const complete = kind === 'alternatives'
      ? { ...zero[kind], total_count: 3, compare_count: 1, ai_help_count: 1, open_count: 1 }
      : { ...zero[kind], total_count: 3, winner_count: 2, draw_count: 1 }
    await page.route(`**/rpc/${endpoint}`, (route) => route.fulfill({ json: [recovered ? complete : { total_count: 3 }] }))
    await page.reload()
    const signal = page.locator('.ov-signal').filter({ has: page.getByText(labels.ru[kind], { exact: true }) })
    await expect(signal.getByRole('alert')).toBeVisible({ timeout: 15000 })
    await expect(signal.locator('.ov-signal__total')).toHaveText('—')
    recovered = true
    await signal.getByRole('button', { name: labels.ru.retry, exact: true }).click()
    await expect(signal.locator('.ov-signal__total')).toHaveText('3')
    await expect(signal.getByRole('alert')).toHaveCount(0)
    await expect(signal.locator('.ov-signal__hint--empty')).toHaveCount(0)
  })
}

for (const [lang, theme] of [['ru', 'light'], ['kz', 'dark']]) {
  for (const kind of ['alternatives', 'comparisons']) {
    test(`an absent signal row is unknown until an explicit zero response (${lang}/${theme}/${kind})`, async ({ page }) => {
      await page.setViewportSize({ width: lang === 'ru' ? 1440 : 390, height: 900 })
      await openRetail(page, { lang, theme })
      await signInRetail(page)
      let recovered = false
      const endpoint = kind === 'alternatives' ? 'fn_get_alternative_events_summary' : 'fn_get_compare_events_summary'
      await page.route(`**/rpc/${endpoint}`, (route) => route.fulfill({ json: recovered ? [zero[kind]] : [] }))
      await page.reload()
      const signal = page.locator('.ov-signal').filter({ has: page.getByText(labels[lang][kind], { exact: true }) })
      await expect(signal.getByRole('alert')).toContainText(labels[lang].error, { timeout: 15000 })
      await expect(signal.locator('.ov-signal__total')).toHaveText('—')
      await expect(signal.locator('.ov-signal__hint--empty')).toHaveCount(0)
      if ((lang === 'ru' && kind === 'comparisons') || (lang === 'kz' && kind === 'alternatives')) {
        await signal.scrollIntoViewIfNeeded()
        await page.screenshot({ path: `scratch/dashboard-signal-facts-2026-10-14/${lang}-${theme}-${kind}.png` })
      }
      recovered = true
      await signal.getByRole('button', { name: labels[lang].retry, exact: true }).click()
      await expect(signal.locator('.ov-signal__total')).toHaveText('0')
      await expect(signal.getByRole('alert')).toHaveCount(0)
      await expect(signal.locator('.ov-signal__hint--empty')).toBeVisible()
    })
  }
}
