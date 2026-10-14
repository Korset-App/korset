import { mkdirSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'

const output = 'scratch/retail-redesign'
mkdirSync(output, { recursive: true })
for (const width of [1440, 1024, 768, 390, 360, 320]) {
  for (const theme of ['light', 'dark']) {
    for (const lang of ['ru', 'kz']) {
      test(`layout ${width} ${theme} ${lang}`, async ({ page }) => {
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.setViewportSize({ width, height: 960 })
        await openRetail(page, { theme, lang, large: true })
        await expect(page.locator('.ov .retail-skel')).toHaveCount(0)
        const overflow = await page
          .locator('.ov, .rc-side, .rc-mhead, .rc-mnav')
          .evaluateAll((elements) =>
            elements.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className)
          )
        expect(overflow).toEqual([])
        await expect(page.locator('.ov')).not.toContainText('⚠retail.')
        expect(errors).toEqual([])
        await page.screenshot({ path: `${output}/${width}-${theme}-${lang}.png`, fullPage: true })
      })
    }
  }
}

test('empty overview gives useful next steps without invented activity', async ({ page }) => {
  await openRetail(page, { mode: 'empty' })
  await expect(page.locator('.ov .retail-skel')).toHaveCount(0)
  await expect(page.locator('.ov-attn')).toHaveCount(0)
  await expect(page.locator('.ov-insight')).toHaveCount(0)
  await expect(page.locator('.ov-kpi__value').first()).toHaveText('0')
  await expect(page.locator('.ov')).not.toContainText('⚠retail.')
  await page.screenshot({ path: `${output}/empty.png`, fullPage: true })
})

test('failed overview offers retries and shows unavailable metrics', async ({ page }) => {
  await openRetail(page, { mode: 'error' })
  await expect(page.locator('.ov .retail-skel')).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('.ov-kpi__value').first()).toHaveText('—')
  await expect(page.locator('.ov-advice').getByRole('alert')).toBeVisible()
  await expect(page.locator('.ov-insight')).toHaveCount(0)
  await page.screenshot({ path: `${output}/error.png`, fullPage: true })
})

test('draft store status is consistent in the header and overview', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openRetail(page, { draft: true })
  await expect(page.locator('.rc-mhead .rc-status')).toHaveText('Не опубликован')
  await expect(page.locator('.ov-banner')).toBeVisible()
})
