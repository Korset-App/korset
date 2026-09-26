import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const fixture = JSON.parse(
  await readFile(
    new URL('../fixtures/product-card-normalization-samples.json', import.meta.url),
    'utf8'
  )
)
const rows = fixture.samples.map((product) => ({
  ...product.facts,
  ean: product.ean,
  name: product.name,
  brand: product.brand,
  category: product.category,
  subcategory: product.subcategory,
  price_kzt: product.priceKzt,
}))

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    const data = path.endsWith('/stores')
      ? { ...fixture.store, code: 'mars', is_active: true, is_published: true }
      : path.endsWith('/fn_get_store_catalog_page')
        ? rows
        : []
    return route.fulfill({ json: data })
  })
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: { user: null } }))
})

for (const lang of ['ru', 'kz'])
  for (const theme of ['light', 'dark']) {
    test(`category names and artwork stay separate: ${lang}, ${theme}`, async ({ page }) => {
      await page.addInitScript(
        ({ lang, theme }) => {
          localStorage.setItem('korset_lang', lang)
          localStorage.setItem('korset_theme', theme)
        },
        { lang, theme }
      )
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/s/mars/catalog')
      await expect(page.locator('.catalog-category-card')).toHaveCount(18)
      for (const width of [320, 360, 390, 430, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 })
        const violations = await page.locator('.catalog-category-card').evaluateAll((cards) =>
          cards
            .filter((card) => {
              const rect = card.getBoundingClientRect()
              const title = card.querySelector('.catalog-category-title')
              const text = title.getBoundingClientRect()
              const media = card.querySelector('.catalog-category-media').getBoundingClientRect()
              return (
                (text.bottom > media.top && text.top < media.bottom) ||
                text.right > rect.right ||
                media.bottom > rect.bottom + 1 ||
                title.scrollHeight > title.clientHeight + 1 ||
                title.scrollWidth > title.clientWidth + 1
              )
            })
            .map((card) => card.textContent.trim())
        )
        expect(violations, `width ${width}`).toEqual([])
      }
    })
  }

test('returning from a category restores position; filters remain below the header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/s/mars/catalog')
  const scroll = page.locator('.catalog-showcase-scroll')
  await scroll.evaluate((element) => {
    element.scrollTop = 650
  })
  const category = page.locator('[data-category="deli"]')
  await category.scrollIntoViewIfNeeded()
  const position = await scroll.evaluate((element) => element.scrollTop)
  await category.click()
  await page.locator('.catalog-topbar__back-btn').click()
  await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBe(position)
  await scroll.evaluate((element) => {
    element.scrollTop = 0
  })
  await page.locator('[data-category="dairy_eggs"]').click()
  await expect(page.locator('.catalog-subcategory-controls button')).toHaveCount(2)
  const gap = await page.evaluate(
    () =>
      document.querySelector('.catalog-subcategory-controls').getBoundingClientRect().top -
      document.querySelector('.catalog-topbar').getBoundingClientRect().bottom
  )
  expect(gap).toBeGreaterThanOrEqual(12)
  const firstVisibleIndex = () =>
    page.locator('[data-virtuoso-scroller]').evaluate((scroller) => {
      const top = scroller.getBoundingClientRect().top
      const item = [...scroller.querySelectorAll('[data-index]')].find(
        (element) => element.getBoundingClientRect().bottom > top + 1
      )
      return item ? Number(item.dataset.index) : -1
    })
  await page.locator('[data-virtuoso-scroller]').evaluate((element) => {
    element.scrollTop = 550
  })
  await expect.poll(firstVisibleIndex).toBeGreaterThan(0)
  const productIndex = await firstVisibleIndex()
  await page.locator('.catalog-view-btn').nth(1).click()
  await expect(page.locator('.catalog-view-btn').nth(1)).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(firstVisibleIndex).toBe(productIndex)
  await page.locator('.catalog-topbar__composition').click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
