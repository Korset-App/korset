import { test, expect } from '@playwright/test'
import { openRetail } from '../retail/fixtures.js'

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
