import { test, expect } from '@playwright/test'

/* global Blob, window, navigator */

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
                {
                  ean: '4870204070019',
                  name: 'Пастила яблочная',
                  brand: 'Sweet',
                  priceKzt: 900,
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
    await expect(page.getByText('Пастила яблочная')).toBeHidden()
    await page.getByText('Показать ещё 1').click()
    await expect(page.getByText('Пастила яблочная')).toBeVisible()
    await page.getByText('Скрыть').click()
    await expect(page.getByText('Пастила яблочная')).toBeHidden()
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

  test('voice-to-text inserts transcript into composer without auto-sending', async ({ page }) => {
    const aiCalls = []
    const transcriptionCalls = []

    await page.addInitScript(() => {
      class MockMediaRecorder {
        constructor(stream, options = {}) {
          this.stream = stream
          this.mimeType = options.mimeType || 'audio/webm'
          this.state = 'inactive'
          this.ondataavailable = null
          this.onstop = null
        }

        start() {
          this.state = 'recording'
        }

        stop() {
          this.state = 'inactive'
          this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) })
          this.onstop?.()
        }

        static isTypeSupported(type) {
          return type === 'audio/webm;codecs=opus' || type === 'audio/webm'
        }
      }

      Object.defineProperty(window, 'MediaRecorder', {
        configurable: true,
        writable: true,
        value: MockMediaRecorder,
      })
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
        },
      })
    })

    await page.route('**/api/ai-transcribe', async (route) => {
      transcriptionCalls.push(route.request().postDataBuffer())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text: 'Покажи халал сладости', language: 'ru', durationMs: 1200 }),
      })
    })

    await page.route('**/api/ai', async (route) => {
      aiCalls.push(route.request().postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'ok', productGroups: [], followUps: [], warnings: [] }),
      })
    })

    await page.goto('/s/store-one/ai', { waitUntil: 'domcontentloaded' })
    const input = page.getByPlaceholder('Спросить про товары...')

    await page.getByLabel('Записать голосовой вопрос').click()
    await page.waitForTimeout(900)
    await page.getByLabel('Остановить запись').click()

    await expect(input).toHaveValue('Покажи халал сладости')
    expect(transcriptionCalls).toHaveLength(1)
    expect(aiCalls).toHaveLength(0)
  })
})
