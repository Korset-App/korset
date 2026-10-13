import { test, expect } from '@playwright/test'
import { openConsumer, stores } from './consumerFixtures.js'

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`a first QR-link visit opens the store home and its catalog (${lang}, ${theme})`, async ({ page }) => {
      const pageErrors = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await page.setViewportSize({ width: 390, height: 844 })
      await openConsumer(page, { lang, theme, cachedStores: false, cachedProfile: false, screen: 'home' })
      await expect(page.getByRole('heading', { level: 1, name: stores['pilot-a'].name, exact: true })).toBeVisible()
      await expect(page.locator('main.home-screen')).toBeVisible()
      await expect(page).toHaveURL(/\/s\/pilot-a$/u)
      await page.screenshot({ path: test.info().outputPath(`first-home-${lang}-${theme}.png`), fullPage: true })
      await page.locator('.home-departments-section .home-section-header__link').click()
      await expect(page).toHaveURL(/\/s\/pilot-a\/catalog$/u)
      await expect(page.locator('.catalog-category-card').first()).toBeVisible()
      expect(pageErrors).toEqual([])
    })
  }
}
