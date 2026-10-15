import { test, expect } from '@playwright/test'
import { openConsumer, UNKNOWN_EAN, MILK_EAN } from './consumerFixtures.js'

const labels = { ru: { price: 'Цена', unit: 'Цена за единицу' }, kz: { price: 'Баға', unit: 'Бірлік бағасы' } }

for (const [lang, theme] of [['ru', 'light'], ['kz', 'dark']]) {
  for (const mode of ['kilogram', 'liter', 'unlike', 'unknown', 'zero', 'pieces']) {
    test(`comparison keeps rate and package price units truthful (${lang}/${theme}/${mode})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 })
      await openConsumer(page, { lang, theme })
      const common = {
        category: 'grocery', ingredients: 'Рис, вода', allergens: [],
        stockStatus: 'in_stock', nutritionPer100: { kcal: 100, protein: 5, fat: 3, carbs: 20, sugar: 2, salt: 0.1 },
        sourceMeta: { isVerified: true },
      }
      const productA = { ...common, ean: UNKNOWN_EAN, name: 'Pilot rate A', nameKz: 'Pilot rate A', quantity: '200 г', saleUnit: 'kg', priceKzt: 2000 }
      const productB = { ...common, ean: MILK_EAN, name: 'Pilot pack B', nameKz: 'Pilot pack B', quantity: '100 г', priceKzt: 300 }
      if (mode === 'liter') {
        productA.saleUnit = null
        productA.quantity = 'л'
        productB.quantity = '100 мл'
      } else if (mode === 'unlike') {
        productA.saleUnit = null
        productA.quantity = '100 г'
        productA.priceKzt = 200
        productB.quantity = '100 мл'
      } else if (mode === 'unknown') {
        productA.saleUnit = 'unknown'
      } else if (mode === 'zero') {
        productA.saleUnit = null
        productA.priceKzt = 0
      } else if (mode === 'pieces') {
        productA.saleUnit = null
        productA.category = productB.category = 'dairy_eggs'
        productA.subcategory = productB.subcategory = 'eggs'
        productA.quantity = '10 шт'
        productB.quantity = '30 шт'
        productA.priceKzt = 1000
        productB.priceKzt = 1500
      }
      await page.addInitScript(({ productA, productB }) => {
        globalThis.history.replaceState({ usr: { productA, productB }, key: 'price-unit-test', idx: 0 }, '', globalThis.location.href)
      }, { productA, productB })
      await page.goto(`/s/pilot-a/product/${UNKNOWN_EAN}/compare/${MILK_EAN}`)
      const rows = page.locator('.compare-data-row')
      const unit = rows.filter({ has: page.getByText(labels[lang].unit, { exact: true }) })
      const price = rows.filter({ has: page.getByText(labels[lang].price, { exact: true }) })
      if (mode === 'kilogram' || mode === 'liter') {
        await expect(unit.locator('.compare-data-value--a')).toHaveText(`200 ₸ / ${mode === 'liter' ? '100 мл' : '100 г'}`)
        await expect(unit.locator('.compare-data-value--a')).toHaveClass(/is-winner/)
        await expect(price.locator('.compare-data-value--a')).toHaveText(`2 000 ₸ / ${mode === 'liter' ? 'л' : 'кг'}`)
        await expect(price.locator('.is-winner')).toHaveCount(0)
        await expect(page.locator('.compare-winner-name')).toHaveText('Pilot rate A')
      } else if (mode === 'unlike') {
        await expect(unit.locator('.compare-data-value--a')).toHaveText('200 ₸ / 100 г')
        await expect(unit.locator('.compare-data-value--b')).toHaveText('300 ₸ / 100 мл')
        await expect(unit.locator('.is-winner')).toHaveCount(0)
      } else if (mode === 'unknown') {
        await expect(unit.locator('.compare-data-value--a')).toHaveText('—')
        await expect(price.locator('.compare-data-value--a')).toHaveText('—')
        await expect(unit.locator('.is-winner')).toHaveCount(0)
        await expect(price.locator('.is-winner')).toHaveCount(0)
      } else if (mode === 'zero') {
        await expect(unit.locator('.compare-data-value--a')).toHaveText('0 ₸ / 100 г')
        await expect(unit.locator('.compare-data-value--a')).toHaveClass(/is-winner/)
        await expect(price.locator('.compare-data-value--a')).toHaveText('0 ₸')
        await expect(page.locator('.compare-winner-name')).toHaveText('Pilot rate A')
      } else {
        const suffix = lang === 'kz' ? 'дана' : 'шт'
        const quantity = rows.filter({ has: page.getByText(lang === 'kz' ? 'Салмақ / көлем' : 'Вес / объём', { exact: true }) })
        await expect(quantity.locator('.compare-data-value--a')).toHaveText(`10 ${suffix}`)
        await expect(quantity.locator('.compare-data-value--b')).toHaveText(`30 ${suffix}`)
        await expect(unit.locator('.compare-data-value--a')).toHaveText(`100 ₸ / ${suffix}`)
        await expect(unit.locator('.compare-data-value--b')).toHaveText(`50 ₸ / ${suffix}`)
        await expect(unit.locator('.compare-data-value--b')).toHaveClass(/is-winner/)
        await expect(page.locator('.compare-winner-name')).toHaveText('Pilot pack B')
      }
      if ((lang === 'ru' && mode === 'kilogram') || (lang === 'kz' && mode === 'pieces')) {
        await unit.scrollIntoViewIfNeeded()
        await page.screenshot({ path: `scratch/comparison-price-units-2026-10-14/${lang}-${theme}-${mode}.png` })
      }
    })
  }
}
