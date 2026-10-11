import { mkdirSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'

const output = 'scratch/retail-chrome'
mkdirSync(output, { recursive: true })

for (const theme of ['light', 'dark']) for (const lang of ['ru', 'kz']) {
  test(`brand and store have distinct roles inside aligned glass chrome ${theme} ${lang}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 })
    await openRetail(page, { snapshot: 'mars', theme, lang })
    const brand = page.locator('.rc-side__brand')
    const header = page.locator('.rc-topbar')
    const brandBox = await brand.boundingBox()
    const headerBox = await header.boundingBox()
    expect(Math.abs(brandBox.y + brandBox.height - headerBox.y - headerBox.height)).toBeLessThan(1)
    await expect(brand.getByRole('link')).toHaveCount(0)
    await expect(page.locator('.rc-side__store-copy')).toContainText('MARS')
    await expect(page.locator('.rc-side__store')).not.toHaveCSS('cursor', 'pointer')
    await expect.poll(() => header.evaluate(element => getComputedStyle(element).backdropFilter)).toContain('blur(')
    await expect(page.locator('.rc-brand-mark')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const expandedOverflow = await page.locator('.rc-side').evaluate(element => element.scrollWidth > element.clientWidth + 1)
    expect(expandedOverflow).toBe(false)
    await page.screenshot({ path: `${output}/${theme}-${lang}.png` })
    await page.locator('.rc-side__collapse').click()
    await expect(page.locator('.rc-side__store-mini')).toHaveCSS('opacity', '1')
    const collapsedBrand = await brand.boundingBox()
    expect(Math.abs(collapsedBrand.height - headerBox.height)).toBeLessThan(1)
    await page.screenshot({ path: `${output}/${theme}-${lang}-collapsed.png` })
  })
}

test('long store name remains readable at compact desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await openRetail(page, { large: true, lang: 'kz' })
  const name = page.locator('.rc-side__store-copy strong')
  expect(await name.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await page.screenshot({ path: `${output}/compact-long-name.png` })
})
