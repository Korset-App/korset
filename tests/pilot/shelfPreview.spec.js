import { test, expect } from '@playwright/test'
import { openConsumer } from './consumerFixtures.js'

test.use({ serviceWorkers: 'allow' })

test('shelf demonstration loads local graphics and exposes no invented barcodes', async ({ page }) => {
  const errors = []
  const missingLibraries = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.url().includes('/vendor/') && response.status() >= 400) {
      missingLibraries.push(response.url())
    }
  })
  await openConsumer(page)
  await page.goto('/3d-preview')
  const frame = page.frameLocator('iframe')
  await expect(frame.getByRole('note')).toContainText('вымышлены')
  await expect(frame.getByRole('note')).toContainText('ойдан шығарылған')
  await expect(frame.locator('#webgl-canvas')).toBeVisible()
  await expect.poll(() => frame.locator('#webgl-canvas').evaluate((canvas) => canvas.width)).toBeGreaterThan(0)
  await expect(frame.locator('#sidebar-ean')).toHaveText(/^DEMO-\d{2}$/u)
  expect(await frame.locator('body').innerText()).not.toMatch(/\b\d{13}\b/u)
  expect(missingLibraries).toEqual([])
  expect(errors).toEqual([])
})
