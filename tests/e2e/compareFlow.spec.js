import { test, expect } from '@playwright/test'

const yogurt = {
  ean: '4601751002907',
  name: 'Йогурт тестовый 180 г',
  brand: 'Demo',
  category: 'dairy_eggs',
  categoryId: 'dairy_eggs',
  priceKzt: 520,
  stockStatus: 'in_stock',
  ingredients: 'молоко, закваска',
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
  stockStatus: 'in_stock',
  ingredients: 'молоко, закваска',
  allergens: ['milk'],
  nutrition: { kcal: 90, sugar: 4, protein: 5, fat: 2, salt: 0.1, fiber: 0 },
}

const shampoo = {
  ean: '4601751002999',
  name: 'Шампунь 250 мл',
  brand: 'NonFood',
  category: 'household',
  categoryId: 'household',
  priceKzt: 990,
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

async function openCompare(page, { productA, productB, lang = 'ru' } = {}) {
  await page.addInitScript(
    ({ productA, productB, lang }) => {
      window.localStorage.setItem('korset_lang', lang)
      window.history.replaceState(
        { usr: { productA, productB }, key: 'compare-flow', idx: 0 },
        '',
        window.location.href
      )
    },
    { productA, productB, lang }
  )

  await page.goto('/s/store-one/product/4601751002907/compare/4870209471118', {
    waitUntil: 'domcontentloaded',
  })
}

test.describe('compare flow', () => {
  test('renders both products with data rows and a verdict', async ({ page }) => {
    await mockBackend(page)
    await openCompare(page, { productA: yogurt, productB: kefir })

    const names = page.locator('.compare-product-name')
    await expect(names).toHaveCount(2)
    await expect(names.first()).toContainText('Йогурт тестовый 180 г')
    await expect(names.nth(1)).toContainText('Кефир тестовый 180 г')

    const rows = page.locator('.compare-data-grid .compare-data-row')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThan(3)

    await expect(page.locator('.compare-verdict-card')).toBeVisible()
    await expect(page.locator('.compare-primary-action')).toBeVisible()
  })

  test('different categories block the comparison and point to alternatives', async ({ page }) => {
    await mockBackend(page)
    await openCompare(page, { productA: yogurt, productB: shampoo })

    await expect(page.locator('.compare-notes').getByText(/разных категорий/).first()).toBeVisible()
    await page.locator('.compare-primary-action').click()
    await expect(page).toHaveURL(/\/s\/store-one\/product\/\d+\/alternatives/)
  })

  test('unknown second product shows the not-found state, not a crash', async ({ page }) => {
    await mockBackend(page)
    await openCompare(page, { productA: yogurt, productB: null })

    await expect(page.locator('.compare-empty')).toBeVisible()
    await expect(page.locator('.compare-verdict-card')).toHaveCount(0)
  })

  test('renders in Kazakh when the language is kz', async ({ page }) => {
    await mockBackend(page)
    await openCompare(page, { productA: yogurt, productB: kefir, lang: 'kz' })

    await expect(page.locator('.compare-title')).toContainText('Салыстыру')
    await expect(page.locator('.compare-data-grid')).toBeVisible()
  })
})
