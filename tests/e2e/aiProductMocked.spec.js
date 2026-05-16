import { test, expect } from '@playwright/test'

test.describe('product AI mocked smoke', () => {
  test('renders premium product answer fields without real AI calls', async ({ page }) => {
    const apiCalls = []

    await page.route('**/api/ai', async (route) => {
      const request = route.request()
      apiCalls.push(JSON.parse(request.postData() || '{}'))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'По данным карточки я бы проверил упаковку перед покупкой.',
          verdict: {
            label: 'fits_but_check',
            title: 'Нужно проверить упаковку',
            tone: 'caution',
          },
          confidenceNotes: ['В карточке мало данных о составе.'],
          checkOnPackage: ['Состав', 'Следы аллергенов'],
          alternatives: [
            {
              ean: '4870204070094',
              name: 'Альтернатива без молока',
              brand: 'Demo',
              priceKzt: 790,
              stockStatus: 'in_stock',
            },
          ],
          warnings: ['missing_composition'],
          ragUsed: false,
        }),
      })
    })

    await page.addInitScript(() => {
      window.history.replaceState(
        {
          usr: {
            product: {
              ean: '4870204070018',
              name: 'Тестовый продукт',
              brand: 'Demo',
              ingredients: '',
              allergens: [],
              priceKzt: 890,
              stockStatus: 'in_stock',
              halalStatus: 'unknown',
            },
          },
          key: 'product-ai-smoke',
          idx: 0,
        },
        '',
        window.location.href
      )
    })

    await page.goto('/s/store-one/product/4870204070018/ai', { waitUntil: 'domcontentloaded' })

    const input = page.getByRole('textbox')
    await expect(input).toBeVisible()
    await input.fill('Можно ли мне этот продукт?')
    await input.press('Enter')

    await expect(
      page.getByText('По данным карточки я бы проверил упаковку перед покупкой.')
    ).toBeVisible()
    await expect(page.getByText('Вердикт')).toBeVisible()
    await expect(page.getByText('Нужно проверить упаковку')).toBeVisible()
    await expect(page.getByText('По данным карточки')).toBeVisible()
    await expect(page.getByText('В карточке мало данных о составе.')).toBeVisible()
    await expect(page.getByText('Проверьте на упаковке')).toBeVisible()
    await expect(page.getByText('Состав', { exact: true })).toBeVisible()
    await expect(page.getByText('Следы аллергенов', { exact: true })).toBeVisible()
    await expect(page.getByText('Альтернативы в этом магазине')).toBeVisible()
    await expect(page.getByText('Альтернатива без молока')).toBeVisible()

    expect(apiCalls).toHaveLength(1)
    expect(apiCalls[0].mode).toBe('product')
    expect(apiCalls[0].storeContext.slug).toBe('store-one')
    expect(apiCalls[0].product.alternatives.length).toBeGreaterThanOrEqual(0)
  })
})
