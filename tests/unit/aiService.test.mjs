import assert from 'node:assert/strict'
import test from 'node:test'

import { askGeneralAI, askProductAI } from '../../src/services/ai.js'

test('askProductAI sends store product facts and same-store alternatives', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal
  const calls = []

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body))
    return {
      ok: true,
      json: async () => ({ reply: 'ok' }),
    }
  }

  try {
    await askProductAI(
      [{ role: 'user', content: 'Есть альтернатива дешевле?' }],
      {
        ean: '4870204070018',
        name: 'Milk',
        brand: 'Demo',
        ingredients: 'milk',
        priceKzt: 890,
        stockStatus: 'in_stock',
      },
      { allergens: ['milk'], halalOnly: true },
      'ru',
      { slug: 'mast', name: 'Mast' },
      [
        {
          ean: '4870204070094',
          name: 'Alt Milk',
          brand: 'Demo',
          priceKzt: 790,
          stockStatus: 'in_stock',
          halalStatus: 'yes',
        },
      ]
    )
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].product.ean, '4870204070018')
  assert.equal(calls[0].product.priceKzt, 890)
  assert.equal(calls[0].product.stockStatus, 'in_stock')
  assert.deepEqual(calls[0].product.alternatives, [
    {
      ean: '4870204070094',
      name: 'Alt Milk',
      brand: 'Demo',
      priceKzt: 790,
      stockStatus: 'in_stock',
      halalStatus: 'yes',
    },
  ])
})

test('askGeneralAI sends store-scoped catalog context and normalizes structured response', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal
  const calls = []

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body))
    return {
      ok: true,
      json: async () => ({
        reply: 'Нашёл товары в этом магазине.',
        productGroups: [{ id: 'dairy_eggs', title: 'dairy_eggs', products: [] }],
        followUps: ['Показать дешевле'],
        warnings: ['Проверяйте цену на кассе'],
        ragUsed: false,
      }),
    }
  }

  try {
    const response = await askGeneralAI(
      [{ role: 'user', content: 'Покажи молоко дешевле' }],
      'ru',
      { slug: 'mast', name: 'Mast' },
      { allergens: ['peanuts'] },
      [{ ean: '4870204070018', name: 'Milk', priceKzt: 890 }]
    )

    assert.equal(response.reply, 'Нашёл товары в этом магазине.')
    assert.equal(response.productGroups.length, 1)
    assert.deepEqual(response.followUps, ['Показать дешевле'])
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].mode, 'general')
  assert.equal(calls[0].storeContext.slug, 'mast')
  assert.equal(calls[0].catalogContext[0].ean, '4870204070018')
})
