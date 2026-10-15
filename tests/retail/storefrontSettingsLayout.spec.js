import { mkdirSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'

const output = 'scratch/integration-2026-10-15/screens'
mkdirSync(output, { recursive: true })

for (const width of [320, 390, 1024, 1440]) {
  for (const [lang, theme] of [['ru', 'light'], ['kz', 'dark']]) {
    test(`storefront and settings keep their content within ${width} (${lang}/${theme})`, async ({ page }) => {
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: 900 })
      await openRetail(page, { lang, theme })
      await signInRetail(page)
      for (const section of ['storefront', 'settings']) {
        await page.goto(`/retail/audit/${section}`, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('h1')).toBeVisible()
        const canvas = page.locator(section === 'settings' ? '.retail-settings-desktop-container' : '.retail-screen-canvas')
        const overflow = await canvas.evaluate((element) => ({
          width: element.clientWidth,
          overflow: element.scrollWidth - element.clientWidth,
          outside: [...element.querySelectorAll('*')].filter((child) => child.getBoundingClientRect().right > element.getBoundingClientRect().right + 1).slice(0, 12).map((child) => ({ tag: child.tagName, class: child.className, text: child.textContent.slice(0, 50) })),
        }))
        expect(overflow.outside, JSON.stringify({ section, ...overflow })).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth + 1)).toBe(true)
        await expect(canvas).not.toContainText('⚠retail.')
        await page.screenshot({ path: `${output}/${section}-${width}-${lang}-${theme}.png` })
      }
      expect(errors).toEqual([])
    })
  }
}
