import { test, expect } from '@playwright/test'
import { MILK_EAN, openConsumer } from './consumerFixtures.js'

for (const { lang, theme, report, submit, success } of [
  { lang: 'ru', theme: 'light', report: 'Не тот товар?', submit: 'Отправить исправление', success: 'Товар успешно сохранён!' },
  { lang: 'kz', theme: 'dark', report: 'Басқа тауар ма?', submit: 'Түзетуді жіберу', success: 'Тауар сәтті сақталды!' },
]) {
  test(`guest photo correction uses the server and keeps the photo available after a failed upload (${lang}, ${theme})`, async ({ page }) => {
    const directWrites = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && /pilot\.invalid\/(storage\/v1|rest\/v1\/product_correction_events)/.test(request.url())) {
        directWrites.push(request.url())
      }
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await openConsumer(page, { lang, theme })
    await page.locator('.catalog-category-card[data-category="dairy_eggs"]').click()
    await page.locator('.catalog-product-card').filter({ hasText: lang === 'ru' ? 'Pilot milk yoghurt' : 'Pilot сүт йогурты' }).click()
    await expect(page).toHaveURL(new RegExp(`/product/${MILK_EAN}$`))
    await page.getByRole('button', { name: report, exact: true }).first().click()
    const sheet = page.locator('.korset-sub-sheet')
    await expect(sheet).toBeVisible()
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      canvas.getContext('2d').fillRect(0, 0, 2, 2)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    await sheet.locator('input[type="file"]').last().setInputFiles({
      name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64'),
    })
    const bodies = []
    await page.route('**/api/submit-product', async (route) => {
      bodies.push(route.request().postDataJSON())
      if (bodies.length === 1) {
        return route.fulfill({ status: 500, json: { error: 'Unable to upload photos', errorCode: 'PHOTO_UPLOAD_FAILED' } })
      }
      return route.fulfill({ json: { ok: true, id: 'fixture-event', photoUrls: ['https://pilot.invalid/storage/v1/object/public/public-assets/submissions/fixture.jpg'] } })
    })
    await sheet.getByRole('button', { name: submit, exact: true }).click()
    await expect(sheet.locator('.korset-sub-error-text')).toContainText('PHOTO_UPLOAD_FAILED')
    await expect(sheet.locator('.korset-sub-photo-thumb')).toHaveCount(1)
    await sheet.getByRole('button', { name: submit, exact: true }).click()
    await expect(sheet).toContainText(success)
    expect(bodies).toHaveLength(2)
    for (const body of bodies) {
      expect(body.ean).toBe(MILK_EAN)
      expect(body.storeSlug).toBe('pilot-a')
      expect(body.type).toBe('correction')
      expect(body.images).toHaveLength(1)
      expect(body.images[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/)
      expect(Buffer.from(body.images[0].dataUrl.split(',')[1], 'base64').subarray(0, 3)).toEqual(Buffer.from([255, 216, 255]))
    }
    expect(directWrites).toEqual([])
  })
}
