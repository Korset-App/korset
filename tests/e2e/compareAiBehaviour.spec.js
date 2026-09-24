import { test, expect } from '@playwright/test'
import assert from 'node:assert/strict'

const yogurt = {
  ean: '4601751002907',
  name: 'Йогурт тестовый 180 г',
  brand: 'Demo',
  category: 'dairy_eggs',
  categoryId: 'dairy_eggs',
  priceKzt: 520,
  stockStatus: 'in_stock',
  ingredients: 'молоко, закваска',
  allergens: ['milk'],
  nutrition: { kcal: 120, sugar: 8, protein: 4, fat: 3, salt: 0.1, fiber: 0 },
}

const kefir = {
  ean: '4870209471118',
  name: 'Кефир тестовый 180 г',
  brand: 'DemoAlt',
  category: 'dairy_eggs',
  categoryId: 'dairy_eggs',
  priceKzt: 480,
  stockStatus: 'in_stock',
  ingredients: 'молоко, закваска',
  allergens: ['milk'],
  nutrition: { kcal: 90, sugar: 4, protein: 5, fat: 2, salt: 0.1, fiber: 0 },
}

async function mockBackend(page, aiCalls) {
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/api/ai', async (route) => {
    aiCalls.push(JSON.parse(route.request().postData() || '{}'))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'Кефир содержит меньше сахара.' }),
    })
  })
}

async function mockBackendWithStore(page, aiCalls, { compareInserts = [] } = {}) {
  // Catch-alls first — Playwright routes are matched LIFO, so the more
  // specific handlers below take precedence over the broad fallbacks.
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  // StoreContext uses maybeSingle() — PostgREST returns a single object here.
  await page.route('**/rest/v1/stores**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '11111111-1111-1111-1111-111111111111',
        code: 'store-one',
        slug: 'store-one',
        is_active: true,
        is_published: true,
        owner_id: null,
        name: 'Store One',
      }),
    })
  })

  await page.route('**/rest/v1/compare_events**', async (route) => {
    if (route.request().method() === 'POST') {
      try {
        compareInserts.push(JSON.parse(route.request().postData() || '{}'))
      } catch {
        compareInserts.push(null)
      }
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
  })

  if (aiCalls !== undefined) {
    await page.route('**/api/ai', async (route) => {
      aiCalls.push(JSON.parse(route.request().postData() || '{}'))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'ok' }),
      })
    })
  }
}

async function open(page, url, { productA, productB, lang = 'ru' } = {}) {
  await page.addInitScript(
    ({ productA, productB, lang }) => {
      window.localStorage.setItem('korset_lang', lang)
      window.history.replaceState(
        { usr: { productA, productB }, key: 'compare-ai', idx: 0 },
        '',
        window.location.href
      )
    },
    { productA, productB, lang }
  )
  await page.goto(url, { waitUntil: 'domcontentloaded' })
}

test.describe('compare AI cost control', () => {
  test('does not call AI on open, calls once on demand, and records one analytics event', async ({ page }) => {
    const aiCalls = []
    const compareInserts = []
    await mockBackendWithStore(page, aiCalls, { compareInserts })
    await open(page, '/s/store-one/product/4601751002907/compare/4870209471118', {
      productA: yogurt,
      productB: kefir,
    })

    await expect(page.locator('.compare-verdict-card')).toBeVisible()
    await expect.poll(() => compareInserts.length).toBe(1)

    const insert = compareInserts[0]
    assert.equal(insert.ean_a, yogurt.ean)
    assert.equal(insert.ean_b, kefir.ean)
    assert.ok(['winner', 'draw', 'blocked'].includes(insert.status))
    assert.equal(insert.lang, 'ru')

    expect(aiCalls.length).toBe(0)

    await page.locator('.compare-ai-ask').click()
    await expect(page.locator('.compare-ai-text')).toContainText('ok')
    expect(aiCalls.length).toBe(1)
    expect(aiCalls[0].mode).toBe('compare')

    // Opening again must not double-count.
    expect(compareInserts.length).toBe(1)
  })

  test('reuses the cached explanation after a reload', async ({ page }) => {
    const aiCalls = []
    const compareInserts = []
    await mockBackendWithStore(page, aiCalls, { compareInserts })
    await open(page, '/s/store-one/product/4601751002907/compare/4870209471118', {
      productA: yogurt,
      productB: kefir,
    })

    await page.locator('.compare-ai-ask').click()
    await expect(page.locator('.compare-ai-text')).toBeVisible()
    expect(aiCalls.length).toBe(1)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.compare-ai-ask').click()
    await expect(page.locator('.compare-ai-text')).toBeVisible()
    expect(aiCalls.length).toBe(1)
  })

  test('shows an honest message when AI is unavailable', async ({ page }) => {
    const aiCalls = []
    const compareInserts = []
    await mockBackendWithStore(page, aiCalls, { compareInserts })
    await page.route('**/api/ai', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
      })
    })
    await open(page, '/s/store-one/product/4601751002907/compare/4870209471118', {
      productA: yogurt,
      productB: kefir,
    })

    await page.locator('.compare-ai-ask').click()
    await expect(page.locator('.compare-ai-error')).toBeVisible()
    await expect(page.locator('.compare-verdict-card')).toBeVisible()
  })
})

test.describe('compare same product', () => {
  test('explains that the product is compared with itself', async ({ page }) => {
    const aiCalls = []
    const compareInserts = []
    await mockBackendWithStore(page, aiCalls, { compareInserts })
    await open(page, '/s/store-one/product/4601751002907/compare/4601751002907', {
      productA: yogurt,
      productB: { ...yogurt },
    })

    await expect(page.locator('.compare-notes').getByText(/самим собой/)).toBeVisible()
    await expect(page.locator('.compare-data-grid')).toHaveCount(0)
    await expect(page.locator('.compare-primary-action')).toContainText('Выбрать другой товар')

    // same_product must NOT pollute the analytics stream.
    expect(compareInserts.length).toBe(0)
  })
})
