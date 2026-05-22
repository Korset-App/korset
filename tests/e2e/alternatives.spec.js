import { test, expect } from '@playwright/test'

const sourceProduct = {
  ean: '4601751002907',
  name: 'Йогурт тестовый 180 г',
  brand: 'Demo',
  category: 'dairy_eggs',
  subcategory: 'yogurt',
  group: 'yogurt',
  quantity: '180 г',
  priceKzt: 520,
  stockStatus: 'in_stock',
  ingredients: 'молоко, закваска',
  allergens: ['milk'],
  halalStatus: 'unknown',
}

const rpcAlternatives = [
  {
    ean: '4870209471118',
    gp_ean: '4870209471118',
    local_name: null,
    price_kzt: 480,
    shelf_zone: 'A1',
    stock_status: 'in_stock',
    store_product_id: '11111111-1111-1111-1111-111111111111',
    global_product_id: '22222222-2222-2222-2222-222222222222',
    name: 'Йогурт альтернатива 180 г',
    name_kz: 'Йогурт балама 180 г',
    brand: 'DemoAlt',
    category: 'dairy_eggs',
    subcategory: 'yogurt',
    quantity: '180 г',
    image_url: '',
    ingredients_raw: 'молоко, закваска',
    ingredients_kz: '',
    allergens_json: ['milk'],
    diet_tags_json: [],
    traces_json: [],
    nutriments_json: { protein: 3.2, sugar: 4.1 },
    halal_status: 'unknown',
    packaging_type: 'cup',
    fat_percent: 2.8,
    nutriscore: 'b',
    product_group: 'yogurt',
    alternate_eans: [],
    relation_rank: 0,
    price_delta_kzt: -40,
    has_composition: true,
    data_completeness: 6,
    availability_rank: 3,
    base_rank: 82,
    rank_reason: 'same_group',
  },
]

test.describe('alternatives flow', () => {
  test('renders RPC alternatives and opens compare from a card', async ({ page }) => {
    const rpcCalls = []
    const persistedEvents = []

    await page.route('**/rest/v1/rpc/fn_get_product_alternatives', async (route) => {
      rpcCalls.push(JSON.parse(route.request().postData() || '{}'))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rpcAlternatives),
      })
    })

    await page.route('**/rest/v1/alternative_events', async (route) => {
      persistedEvents.push(JSON.parse(route.request().postData() || '{}'))
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.addInitScript((product) => {
      window.__alternativeEvents = []
      window.addEventListener('korset:alternative_event', (event) => {
        window.__alternativeEvents.push(event.detail)
      })
      window.history.replaceState(
        {
          usr: { product },
          key: 'alternatives-smoke',
          idx: 0,
        },
        '',
        window.location.href
      )
    }, sourceProduct)

    await page.goto('/s/store-one/product/4601751002907/alternatives', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.getByRole('button', { name: 'Похожие' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Подходят мне' })).toBeVisible()
    await expect(page.getByText('Йогурт альтернатива 180 г')).toBeVisible()
    await expect(page.getByText('DemoAlt · 180 г')).toBeVisible()

    await page.getByRole('button', { name: 'Дешевле' }).click()
    await expect(page.getByRole('button', { name: 'Дешевле' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    const events = await page.evaluate(() => window.__alternativeEvents)
    expect(events.some((event) => event.type === 'alternatives_scenario_selected')).toBe(true)
    expect(rpcCalls.at(-1).p_scenario).toBe('cheaper')
    await expect
      .poll(() =>
        persistedEvents.some((event) => event.event_type === 'alternatives_scenario_selected')
      )
      .toBe(true)

    await page.getByRole('button', { name: /Сравнить/ }).first().click()
    await expect(page).toHaveURL(/\/s\/store-one\/product\/4601751002907\/compare\/4870209471118/)
  })
})
