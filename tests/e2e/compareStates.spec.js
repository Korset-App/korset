import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT = 'screenshots/compare-stage3'
const URL = '/s/store-one/product/4601751002907/compare/4870209471118'

const yogurt = {
  ean: '4601751002907',
  name: 'Йогурт тестовый 180 г',
  brand: 'Demo',
  category: 'dairy_eggs',
  categoryId: 'dairy_eggs',
  priceKzt: 520,
  price_kzt: 520,
  stockStatus: 'in_stock',
  ingredients: 'молоко, закваска, сахар',
  allergens: ['milk'],
  nutrition: { kcal: 120, sugar: 8, protein: 4, fat: 3, salt: 0.1, fiber: 0 },
}

const kefir = {
  ean: '4870209471118',
  name: 'Кефир тестовый 180 г',
  brand: 'DemoAlt',
  category: 'dairy_eggs',
  categoryId: 'dairy_eggs',
  priceKzt: 480,
  price_kzt: 480,
  stockStatus: 'in_stock',
  ingredients: 'молоко, закваска',
  allergens: ['milk'],
  nutrition: { kcal: 90, sugar: 4, protein: 5, fat: 2, salt: 0.1, fiber: 0 },
}

const sparse = {
  ean: '4870209471118',
  name: 'Кефир без данных 180 г',
  brand: 'Sparse',
  category: 'dairy_eggs',
  categoryId: 'dairy_eggs',
  priceKzt: 470,
  price_kzt: 470,
  stockStatus: 'in_stock',
}

async function mockBackend(page) {
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

async function open(page, { productA, productB, lang = 'ru', theme = 'dark' } = {}) {
  await page.addInitScript(
    ({ productA, productB, lang, theme }) => {
      window.localStorage.setItem('korset_lang', lang)
      window.localStorage.setItem('korset_theme', theme)
      window.history.replaceState(
        { usr: { productA, productB }, key: 'compare-states', idx: 0 },
        '',
        window.location.href
      )
    },
    { productA, productB, lang, theme }
  )
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.locator('.compare-screen').waitFor()
}

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true })
})

test('captures the comparison states for review', async ({ page }) => {
  await mockBackend(page)
  await page.setViewportSize({ width: 390, height: 1400 })

  await open(page, { productA: yogurt, productB: kefir })
  await expect(page.locator('.compare-outcome')).toBeVisible()
  await page.screenshot({ path: `${OUT}/01-winner-dark.png`, fullPage: true })

  await open(page, { productA: yogurt, productB: sparse })
  await expect(page.locator('.compare-chip--data')).toBeVisible()
  await page.screenshot({ path: `${OUT}/02-sparse-data-dark.png`, fullPage: true })

  await open(page, { productA: yogurt, productB: { ...kefir, sourceMeta: { aiEnriched: true } } })
  await expect(page.locator('.compare-chip--ai')).toBeVisible()
  await page.screenshot({ path: `${OUT}/03-ai-estimated-dark.png`, fullPage: true })

  await open(page, {
    productA: yogurt,
    productB: { ...kefir, category: 'household', categoryId: 'household', name: 'Шампунь 250 мл' },
  })
  await expect(page.locator('.compare-outcome--blocked')).toBeVisible()
  await page.screenshot({ path: `${OUT}/04-blocked-dark.png`, fullPage: true })

  await open(page, { productA: yogurt, productB: kefir, lang: 'kz' })
  await expect(page.locator('.compare-title')).toContainText('Салыстыру')
  await page.screenshot({ path: `${OUT}/05-kazakh-dark.png`, fullPage: true })
})

test('captures the light theme for review', async ({ page }) => {
  await mockBackend(page)
  await page.setViewportSize({ width: 390, height: 1400 })

  await open(page, { productA: yogurt, productB: kefir, theme: 'light' })
  await expect(page.locator('.compare-outcome')).toBeVisible()
  await page.screenshot({ path: `${OUT}/06-winner-light.png`, fullPage: true })

  await open(page, { productA: yogurt, productB: sparse, theme: 'light' })
  await expect(page.locator('.compare-chip--data')).toBeVisible()
  await page.screenshot({ path: `${OUT}/07-sparse-data-light.png`, fullPage: true })

  await open(page, {
    productA: yogurt,
    productB: { ...kefir, category: 'household', categoryId: 'household', name: 'Шампунь 250 мл' },
    theme: 'light',
  })
  await expect(page.locator('.compare-outcome--blocked')).toBeVisible()
  await page.screenshot({ path: `${OUT}/08-blocked-light.png`, fullPage: true })

  await open(page, { productA: yogurt, productB: kefir, lang: 'kz', theme: 'light' })
  await expect(page.locator('.compare-title')).toContainText('Салыстыру')
  await page.screenshot({ path: `${OUT}/09-kazakh-light.png`, fullPage: true })
})
