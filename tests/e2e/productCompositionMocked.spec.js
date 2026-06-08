import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 390, height: 844 }

const product = {
  ean: '4870204070018',
  name: 'Йогурт с наполнителем',
  brand: 'Demo',
  category: 'dairy_eggs',
  ingredients:
    'Молоко нормализованное, сахар, стабилизатор каррагинан, эмульгатор E471, ароматизатор.',
  allergens: ['milk'],
  halalStatus: 'unknown',
  priceKzt: 890,
  stockStatus: 'in_stock',
  nutritionPer100: { kcal: 96, protein: 4, fat: 2.5, carbs: 14, sugar: 12 },
}

async function seedProductState(page, key) {
  await page.addInitScript(
    ({ product, key }) => {
      window.history.replaceState(
        {
          usr: { product },
          key,
          idx: 0,
        },
        '',
        window.location.href
      )
    },
    { product, key }
  )
}

test('product composition flow opens full analysis, ingredient sheet, and prepared AI prompt', async ({
  page,
}) => {
  await page.setViewportSize(MOBILE_VIEWPORT)
  await seedProductState(page, 'composition-product-smoke')

  await page.goto('/s/store-one/product/4870204070018', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Йогурт с наполнителем')).toBeVisible()
  await expect(page.getByText('Разобрать')).toBeVisible()
  await page.getByText('Разобрать').click()

  await expect(page).toHaveURL(/\/s\/store-one\/product\/4870204070018\/composition/)
  await expect(page.getByText('Что означают цвета')).toBeVisible()
  await expect(page.getByRole('button', { name: 'E471', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'E471', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Спросить ИИ', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Спросить ИИ', exact: true }).click()

  await expect(page).toHaveURL(/\/s\/store-one\/product\/4870204070018\/ai/)
  await expect(page.getByPlaceholder('Спросить о продукте...')).toHaveValue(/E471/)
})
