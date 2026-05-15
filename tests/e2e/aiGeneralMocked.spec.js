import { test, expect } from '@playwright/test'

test.describe('general AI mocked smoke', () => {
  test('renders assistant reply, product cards, and follow-up chips without real AI calls', async ({
    page,
  }) => {
    const apiCalls = []

    await page.route('**/api/ai', async (route) => {
      const request = route.request()
      apiCalls.push(JSON.parse(request.postData() || '{}'))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Нашёл варианты в этом магазине.',
          productGroups: [
            {
              id: 'sweets',
              title: 'Сладости',
              products: [
                {
                  ean: '4870204070018',
                  name: 'Шоколад халал без сахара',
                  brand: 'Sweet',
                  priceKzt: 760,
                  stockStatus: 'in_stock',
                },
              ],
            },
          ],
          followUps: ['Показать дешевле', 'Сравнить варианты'],
          warnings: [],
          ragUsed: false,
        }),
      })
    })

    await page.goto('/s/store-one/ai', { waitUntil: 'domcontentloaded' })

    const input = page.getByPlaceholder('Спросить про товары...')
    await expect(input).toBeVisible()
    await input.fill('Покажи халал-сладости')
    await input.press('Enter')

    await expect(page.getByText('Нашёл варианты в этом магазине.')).toBeVisible()
    await expect(page.getByText('Шоколад халал без сахара')).toBeVisible()
    await expect(page.getByText('Показать дешевле')).toBeVisible()
    await expect(page.getByText('Сравнить варианты')).toBeVisible()
    await expect(page.locator('a[href="/s/store-one/product/4870204070018"]')).toBeVisible()

    expect(apiCalls).toHaveLength(1)
    expect(apiCalls[0].mode).toBe('general')
    expect(apiCalls[0].storeContext.slug).toBe('store-one')

    await page.getByText('Показать дешевле').click()

    await expect.poll(() => apiCalls.length).toBe(2)
    expect(apiCalls[1].mode).toBe('general')
    expect(apiCalls[1].storeContext.slug).toBe('store-one')
    expect(apiCalls[1].messages.at(-1)).toEqual({
      role: 'user',
      content: 'Показать дешевле',
    })
  })
})
