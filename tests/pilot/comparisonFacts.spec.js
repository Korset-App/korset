import { test, expect } from '@playwright/test'
import { openConsumer, UNKNOWN_EAN, MILK_EAN } from './consumerFixtures.js'

const labels = {
  ru: { sugar: 'Сахар', kcal: 'Калории' },
  kz: { sugar: 'Қант', kcal: 'Калория' },
}

for (const lang of ['ru', 'kz']) {
  for (const theme of ['light', 'dark']) {
    for (const knownZero of [false, true]) {
      test(`comparison distinguishes absent nutrition from known zero (${lang}/${theme}/${knownZero ? 'zero' : 'unknown'})`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 900 })
        await openConsumer(page, { lang, theme })
        const common = {
          category: 'dairy_eggs', ingredients_raw: 'Рис, вода', allergens_json: [],
          quantity: '200 г', price_kzt: 500, stock_status: 'in_stock', halal_status: 'unknown',
        }
        const rows = [
          { ...common, ean: UNKNOWN_EAN, name: 'Pilot A rice pudding', name_kz: 'Pilot A күріш пудингі', nutriments_json: knownZero ? { kcal: 0, sugar: 0 } : null },
          { ...common, ean: MILK_EAN, name: 'Pilot B rice pudding', name_kz: 'Pilot B күріш пудингі', nutriments_json: { kcal: 100, sugar: 10, protein: 5, fat: 3 } },
        ]
        await page.route('**/rpc/fn_get_store_catalog_page', (route) =>
          route.fulfill({ json: route.request().postDataJSON().p_after_ean ? [] : rows })
        )
        await page.goto(`/s/pilot-a/product/${UNKNOWN_EAN}/compare/${MILK_EAN}`)
        const sugar = page.locator('.compare-data-row').filter({ has: page.getByText(labels[lang].sugar, { exact: true }) })
        const kcal = page.locator('.compare-data-row').filter({ has: page.getByText(labels[lang].kcal, { exact: true }) })
        const aSugar = sugar.locator('.compare-data-value--a')
        const aKcal = kcal.locator('.compare-data-value--a')
        if (knownZero) {
          await expect(aSugar).toHaveText('0 г')
          await expect(aSugar).toHaveClass(/is-winner/)
          await expect(aKcal).toHaveText('0 ккал')
        } else {
          await expect(aSugar).toHaveText('—')
          await expect(aSugar).not.toHaveClass(/is-winner/)
          await expect(aKcal).toHaveText('—')
          await expect(aKcal).not.toHaveClass(/is-winner/)
          await expect(page.locator('.compare-chip--data')).toBeVisible()
          if ((lang === 'ru' && theme === 'light') || (lang === 'kz' && theme === 'dark')) {
            await page.locator('.compare-chip--data').scrollIntoViewIfNeeded()
            await page.screenshot({ path: `scratch/comparison-facts-2026-10-14/${lang}-${theme}.png` })
          }
        }
      })
    }
  }
}
