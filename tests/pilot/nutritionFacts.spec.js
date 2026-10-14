import { test, expect } from '@playwright/test'
import { openConsumer, UNKNOWN_EAN } from './consumerFixtures.js'

const labels = {
  ru: { saturated: 'Насыщенные жиры', protein: 'Белки', carbs: 'Углеводы', whole: 'Весь продукт', name: 'Pilot unknown ingredients' },
  kz: { saturated: 'Қаныққан майлар', protein: 'Ақуыз', carbs: 'Көмірсу', whole: 'Бүкіл өнім', name: 'Pilot құрамы белгісіз' },
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    test(`separate saturated fat scales with the whole pack while missing macros remain unknown (${lang}/${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openConsumer(page, { lang, theme })
      const row = {
        ean: UNKNOWN_EAN, name: labels.ru.name, name_kz: labels.kz.name,
        category: 'dairy_eggs', quantity: '200 г', ingredients_raw: null,
        allergens_json: [], halal_status: 'unknown', price_kzt: 420, stock_status: 'unknown',
        nutriments_json: { kcal: 50, protein: null, fat: null, carbs: 0 }, saturated_fat_100g: 5,
      }
      await page.route('**/rpc/fn_get_store_catalog_page', (route) =>
        route.fulfill({ json: route.request().postDataJSON().p_after_ean ? [] : [row] })
      )
      await page.route('**/rest/v1/store_products**', (route) => route.fulfill({ json: [{
        ean: row.ean, price_kzt: row.price_kzt, stock_status: row.stock_status,
        global_products: row,
      }] }))
      await page.reload()
      await page.locator('.catalog-category-card[data-category="dairy_eggs"]').click()
      await page.locator('.catalog-product-card').filter({ hasText: labels[lang].name }).click()
      await expect(page).toHaveURL(new RegExp(`/product/${UNKNOWN_EAN}$`))
      const saturated = page.getByText(labels[lang].saturated, { exact: true }).locator('..')
      const protein = page.getByText(labels[lang].protein, { exact: true }).locator('..')
      const carbs = page.getByText(labels[lang].carbs, { exact: true }).locator('..')
      await expect(saturated).toHaveText(new RegExp(`${labels[lang].saturated}5\\s*г`))
      await expect(protein).toContainText('—')
      await expect(carbs).toHaveText(new RegExp(`${labels[lang].carbs}0\\s*г`))
      await page.getByRole('tab', { name: new RegExp(labels[lang].whole) }).click()
      await expect(saturated).toHaveText(new RegExp(`${labels[lang].saturated}10\\s*г`))
      await expect(protein).toContainText('—')
      await expect(carbs).toHaveText(new RegExp(`${labels[lang].carbs}0\\s*г`))
      await page.getByRole('tab', { name: '100 г', exact: true }).click()
      await expect(saturated).toHaveText(new RegExp(`${labels[lang].saturated}5\\s*г`))
    })
  }
}
