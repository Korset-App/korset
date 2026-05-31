import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'

/* global Blob, window, navigator */

const packagePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
)

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
      await page.waitForTimeout(500)
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
    await input.fill('У меня аллергия на арахис')

    await page.getByLabel('Записать голосовой вопрос').click()
    await page.waitForTimeout(900)
    await page.getByLabel('Остановить запись').click()

    await expect(page.locator('.ai-voice-panel--processing')).toBeVisible()
    await expect(page.locator('.ai-voice-button.is-processing')).toBeVisible()

    await expect(input).toHaveValue('У меня аллергия на арахис Покажи халал сладости')
    expect(transcriptionCalls).toHaveLength(1)
    expect(aiCalls).toHaveLength(0)
  })

  test('composer textarea grows for long dictated or typed text', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/s/store-one/ai', { waitUntil: 'domcontentloaded' })
    const input = page.getByPlaceholder('Спросить про товары...')
    const initialHeight = await input.evaluate((element) => element.getBoundingClientRect().height)

    await input.fill(
      'Покажи продукты без сахара и без молока, которые подойдут ребенку, и отдельно объясни, какие из них есть в этом магазине прямо сейчас.'
    )

    await expect
      .poll(() => input.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(initialHeight + 12)
  })

  test('image input supports gallery preview, remove, manual send, and no local image persistence', async ({
    page,
  }) => {
    const textAiCalls = []
    const imageAiCalls = []

    await page.route('**/api/ai', async (route) => {
      textAiCalls.push(route.request().postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'text ok', productGroups: [], followUps: [], warnings: [] }),
      })
    })

    await page.route('**/api/ai-image', async (route) => {
      imageAiCalls.push(route.request().postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'По фото упаковки вижу состав. Проверьте упаковку перед покупкой.',
          productGroups: [],
          followUps: [],
          warnings: [],
        }),
      })
    })

    await page.goto('/s/store-one/ai', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Добавить фото упаковки').click()
    await expect(page.getByText('Снять фото')).toBeVisible()
    await expect(page.getByText('Выбрать из галереи')).toBeVisible()

    await page.setInputFiles('[data-testid="ai-image-gallery-input"]', {
      name: 'package.png',
      mimeType: 'image/png',
      buffer: packagePng,
    })

    await expect(page.getByText('Фото упаковки готово')).toBeVisible()
    await expect(page.getByAltText('Фото упаковки')).toBeVisible()
    expect(imageAiCalls).toHaveLength(0)
    expect(textAiCalls).toHaveLength(0)

    await page.getByLabel('Удалить фото упаковки').click()
    await expect(page.getByText('Фото упаковки готово')).toBeHidden()

    await page.getByLabel('Добавить фото упаковки').click()
    await page.setInputFiles('[data-testid="ai-image-gallery-input"]', {
      name: 'package.png',
      mimeType: 'image/png',
      buffer: packagePng,
    })
    await page.getByPlaceholder('Спросить про товары...').fill('Проверь состав на молоко')
    await page.locator('.ai-composer__send').click()

    await expect(page.getByText('По фото упаковки вижу состав.')).toBeVisible()
    expect(imageAiCalls).toHaveLength(1)
    expect(imageAiCalls[0].message).toBe('Проверь состав на молоко')
    expect(imageAiCalls[0].image.mimeType).toBe('image/png')
    expect(textAiCalls).toHaveLength(0)

    const localChat = await page.evaluate(() => JSON.stringify(window.localStorage))
    expect(localChat).not.toContain('data:image')
  })

  test('image-only send uses safe package default intent without auto-sending on selection', async ({
    page,
  }) => {
    const imageAiCalls = []

    await page.route('**/api/ai-image', async (route) => {
      imageAiCalls.push(route.request().postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'Проверьте физическую упаковку.', productGroups: [] }),
      })
    })

    await page.goto('/s/store-one/ai', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Добавить фото упаковки').click()
    await page.setInputFiles('[data-testid="ai-image-camera-input"]', {
      name: 'package.png',
      mimeType: 'image/png',
      buffer: packagePng,
    })

    await expect(page.getByText('Фото упаковки готово')).toBeVisible()
    expect(imageAiCalls).toHaveLength(0)

    await page.locator('.ai-composer__send').click()

    await expect(page.getByText('Проверьте физическую упаковку.')).toBeVisible()
    expect(imageAiCalls).toHaveLength(1)
    expect(imageAiCalls[0].message).toBe('Проверь упаковку и состав этого товара.')
    expect(imageAiCalls[0].image.dataUrl).toContain('data:image/png;base64,')
  })

  test('voice-to-text keeps browser draft when transcription endpoint is unavailable', async ({
    page,
  }) => {
    const aiCalls = []

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

      class MockSpeechRecognition {
        constructor() {
          this.continuous = false
          this.interimResults = false
          this.lang = 'ru-RU'
          this.onresult = null
          this.onerror = null
        }

        start() {
          window.setTimeout(() => {
            this.onresult?.({ results: [[{ transcript: 'Покажи молоко' }]] })
          }, 50)
        }

        stop() {}
      }

      Object.defineProperty(window, 'MediaRecorder', {
        configurable: true,
        writable: true,
        value: MockMediaRecorder,
      })
      Object.defineProperty(window, 'SpeechRecognition', {
        configurable: true,
        writable: true,
        value: MockSpeechRecognition,
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
      await page.waitForTimeout(250)
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({}),
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
    await expect(page.getByText('Покажи молоко')).toBeVisible()
    await page.waitForTimeout(900)
    await page.getByLabel('Остановить запись').click()

    await expect(input).toHaveValue('Покажи молоко')
    await expect(page.getByText('Черновик вставлен. Проверьте и отправьте.')).toBeVisible()
    expect(aiCalls).toHaveLength(0)
  })
})
