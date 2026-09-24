import { test, expect } from '@playwright/test'

const productA = {
  ean: '4601751002907',
  name: 'Йогурт тестовый 180 г',
  brand: 'Demo',
  priceKzt: 520,
  ingredients: 'молоко, закваска',
  allergens: ['milk'],
  stockStatus: 'in_stock',
}

const productB = {
  ean: '4870209471118',
  name: 'Йогурт альтернатива 180 г',
  brand: 'DemoAlt',
  priceKzt: 480,
  ingredients: 'молоко, закваска',
  allergens: ['milk'],
  stockStatus: 'in_stock',
}

// Regression guard: the primary CTA used an undefined identifier and threw
// ReferenceError before the fix. It must navigate inside the store context.
test.describe('compare screen primary action', () => {
  test('navigates to product AI or alternatives inside the store', async ({ page }) => {
    await page.route('**/rest/v1/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await page.addInitScript(
      ({ productA, productB }) => {
        window.history.replaceState(
          { usr: { productA, productB }, key: 'compare-smoke', idx: 0 },
          '',
          window.location.href
        )
      },
      { productA, productB }
    )

    await page.goto('/s/store-one/product/4601751002907/compare/4870209471118', {
      waitUntil: 'domcontentloaded',
    })

    const action = page.locator('.compare-primary-action')
    await expect(action).toBeVisible()

    await action.click()

    await expect(page).toHaveURL(/\/s\/store-one\/product\/\d+\/(ai|alternatives)/)
    await expect(page.locator('.error-boundary')).toHaveCount(0)
  })
})
