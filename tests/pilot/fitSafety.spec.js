import { test, expect } from '@playwright/test'
import { openConsumer, UNKNOWN_EAN } from './consumerFixtures.js'

const scenarios = [
  {
    name: 'unrelated trace-only text does not replace the composition',
    row: { ingredients_raw: 'Может содержать следы рыбы' },
    profile: { allergens: ['milk'] },
    verdict: 'caution',
    reason: { ru: 'Состав не указан', kz: 'Құрамы көрсетілмеген' },
  },
  {
    name: 'an unrelated milk record cannot confirm a celiac preference',
    row: { allergens_json: ['milk'] },
    profile: { healthConditions: ['celiac'] },
    verdict: 'caution',
    reason: { ru: 'Состав не указан', kz: 'Құрамы көрсетілмеген' },
  },
  {
    name: 'an unrelated allergen does not prove safety when composition is unknown',
    row: { allergens_json: ['gluten'] },
    profile: { allergens: ['milk'] },
    verdict: 'caution',
    reason: { ru: 'Состав не указан', kz: 'Құрамы көрсетілмеген' },
  },
  {
    name: 'unrelated traces do not prove safety when composition is unknown',
    row: { traces_json: ['fish'] },
    profile: { allergens: ['milk'] },
    verdict: 'caution',
    reason: { ru: 'Состав не указан', kz: 'Құрамы көрсетілмеген' },
  },
  {
    name: 'confirmed halal does not confirm an unknown vegan composition',
    row: { halal_status: 'yes' },
    profile: { halal: true, dietGoals: ['vegan'] },
    verdict: 'caution',
    reason: { ru: 'Состав не указан', kz: 'Құрамы көрсетілмеген' },
  },
  {
    name: 'lactose-free milk retains its milk-protein allergy rejection',
    row: { ingredients_raw: 'Молоко без лактозы', allergens_json: ['milk'], diet_tags_json: ['lactose_free'] },
    profile: { allergens: ['milk'], dietGoals: ['lactose_free'] },
    verdict: 'danger',
    reason: { ru: 'Содержит аллерген', kz: 'Құрамында аллерген бар' },
  },
  {
    name: 'lactose-free preference alone retains a confirmed result',
    row: { ingredients_raw: 'Молоко без лактозы', allergens_json: ['milk'], diet_tags_json: ['lactose_free'] },
    profile: { dietGoals: ['lactose_free'] },
    verdict: 'safe',
  },
  {
    name: 'trace-only milk stays a warning rather than a direct allergen rejection',
    row: { ingredients_raw: 'Вода, рис. Может содержать следы молока.', traces_json: ['milk'] },
    profile: { allergens: ['milk'] },
    verdict: 'warning',
    reason: { ru: 'Может содержать следы', kz: 'Құрамында ізі болуы мүмкін' },
  },
  {
    name: 'a vegan tag cannot override milk in the composition',
    row: { ingredients_raw: 'Молоко нормализованное', allergens_json: ['milk'], diet_tags_json: ['vegan'] },
    profile: { dietGoals: ['vegan'] },
    verdict: 'caution',
    reason: { ru: 'Не подходит для веганов', kz: 'Вегандарға жарамайды' },
  },
  {
    name: 'a keto tag and low carbohydrates do not replace unknown composition',
    row: { diet_tags_json: ['keto'], nutriments_json: { carbs: 3, sugar: 0, fat: 30, protein: 10 } },
    profile: { dietGoals: ['keto'] },
    verdict: 'caution',
    reason: { ru: 'Недостаточно данных', kz: 'дерек жеткіліксіз' },
  },
  {
    name: 'a sugar-free tag cannot override added sugar in the composition',
    row: { ingredients_raw: 'Сахар, какао', diet_tags_json: ['sugar_free'], nutriments_json: { sugars: 0 } },
    profile: { dietGoals: ['sugar_free'] },
    verdict: 'caution',
    reason: { ru: 'Содержит добавленный сахар', kz: 'Құрамында қосылған қант бар' },
  },
]

const titles = {
  ru: { danger: 'Не подходит', warning: 'Не рекомендуется', caution: 'С осторожностью', safe: 'Подходит' },
  kz: { danger: 'Сай емес', warning: 'Ұсынылмайды', caution: 'Абайлаңыз', safe: 'Сай келеді' },
}

for (const scenario of scenarios) {
  for (const lang of ['ru', 'kz']) {
    for (const theme of ['light', 'dark']) {
      test(`${scenario.name} (${lang}/${theme})`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.addInitScript((profile) => {
          globalThis.localStorage.setItem('korset_profile', JSON.stringify({
            halal: false, dietGoals: [], allergens: [], customAllergens: [], ...profile,
          }))
        }, scenario.profile)
        await openConsumer(page, { lang, theme, cachedProfile: false })
        const row = {
          ean: UNKNOWN_EAN,
          name: 'Pilot unknown ingredients',
          name_kz: 'Pilot құрамы белгісіз',
          brand: 'Pilot',
          category: 'dairy_eggs',
          ingredients_raw: null,
          allergens_json: [],
          traces_json: [],
          diet_tags_json: [],
          halal_status: 'unknown',
          price_kzt: 420,
          stock_status: 'unknown',
          ...scenario.row,
        }
        await page.route('**/rpc/fn_get_store_catalog_page', (route) => {
          const body = route.request().postDataJSON()
          return route.fulfill({ json: body.p_after_ean ? [] : [row] })
        })
        await page.reload()
        await page.locator('.catalog-category-card[data-category="dairy_eggs"]').click()
        const card = page.locator('.catalog-product-card').filter({ hasText: row[lang === 'kz' ? 'name_kz' : 'name'] })
        await expect(card.locator('.catalog-verdict-badge')).toHaveClass(new RegExp(`\\b${scenario.verdict}\\b`, 'u'))
        await card.click()
        await expect(page).toHaveURL(new RegExp(`/s/pilot-a/product/${UNKNOWN_EAN}$`, 'u'))
        const fit = page.getByRole('button', { name: new RegExp(titles[lang][scenario.verdict], 'u') }).first()
        await expect(fit).toBeVisible()
        if (scenario.reason) {
          await fit.click()
          await expect(fit).toContainText(scenario.reason[lang])
        }
      })
    }
  }
}
