import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
  'base64'
)

for (const refused of [false, true]) {
test(`photo autosave preserves the draft and reports refusals (refused=${refused})`, async ({ page }) => {
  await openRetail(page)
  await signInRetail(page)
  await page.goto('/retail/audit/storefront')

  const slogan = page.locator('input[placeholder^="Например: Свежая выпечка"]')
  await expect(slogan).toBeVisible()
  await slogan.fill('Несохранённый слоган')

  const writes = []
  await page.route('**/rest/v1/stores**', async (route) => {
    if (route.request().method() === 'PATCH') {
      writes.push(route.request().postDataJSON())
      if (refused) return route.fulfill({ status: 403, json: { message: 'Test-only denied media save' } })
      return route.fulfill({ json: {} })
    }
    return route.fallback()
  })

  await page.getByRole('button', { name: 'Управление фото' }).click()
  const fileChooser = page.waitForEvent('filechooser')
  await page.getByText('+ Загрузить').first().click()
  await (await fileChooser).setFiles({ name: 'store.png', mimeType: 'image/png', buffer: onePixelPng })

  await expect.poll(() => writes.filter((write) => Object.hasOwn(write, 'images')).length).toBe(1)
  await expect(slogan).toHaveValue('Несохранённый слоган')
  if (refused) {
    await expect(page.locator('.retail-save-bar')).toContainText('Ошибка сохранения. Попробуйте ещё раз.')
    await expect(page.locator('.retail-save-bar')).not.toContainText('Test-only')
  }
  await page.getByRole('button', { name: 'Сбросить' }).click()
  await expect(slogan).toHaveValue('')
  await expect(page.getByText(refused ? '0 / 12' : '1 / 12')).toBeVisible()
})
}
