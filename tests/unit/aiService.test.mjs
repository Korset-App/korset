import assert from 'node:assert/strict'
import test from 'node:test'
import { Blob } from 'node:buffer'

/* global FormData */

import {
  askGeneralAI,
  askProductAI,
  askProductAIResponse,
  transcribeVoiceInput,
} from '../../src/services/ai.js'

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

test('askProductAIResponse normalizes premium product response without breaking string caller', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      reply: 'По данным карточки лучше проверить упаковку.',
      verdict: { label: 'fits_but_check', title: 'Проверьте упаковку', tone: 'caution' },
      confidenceNotes: ['Состав неполный.'],
      checkOnPackage: ['Состав'],
      alternatives: [{ ean: '2', name: 'Alt', priceKzt: 990, stockStatus: 'in_stock' }],
      warnings: ['missing_composition'],
      ragUsed: true,
    }),
  })

  try {
    const structured = await askProductAIResponse(
      [{ role: 'user', content: 'Можно ли мне?' }],
      { ean: '1', name: 'Product' },
      { allergens: ['milk'] },
      'ru'
    )
    const legacy = await askProductAI(
      [{ role: 'user', content: 'Можно ли мне?' }],
      { ean: '1', name: 'Product' },
      { allergens: ['milk'] },
      'ru'
    )

    assert.equal(structured.reply, 'По данным карточки лучше проверить упаковку.')
    assert.equal(structured.verdict.label, 'fits_but_check')
    assert.deepEqual(structured.checkOnPackage, ['Состав'])
    assert.equal(structured.alternatives[0].ean, '2')
    assert.equal(legacy, 'По данным карточки лучше проверить упаковку.')
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }
})

test('transcribeVoiceInput sends audio as multipart and returns text without auto-sending chat', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal
  const calls = []

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      json: async () => ({ text: 'Покажи халал сладости', language: 'ru', durationMs: 1400 }),
    }
  }

  try {
    const response = await transcribeVoiceInput({
      audioBlob: new Blob(['voice'], { type: 'audio/webm' }),
      lang: 'ru',
      storeSlug: 'mars',
      durationMs: 1400,
    })

    assert.deepEqual(response, {
      text: 'Покажи халал сладости',
      language: 'ru',
      durationMs: 1400,
    })
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/api/ai-transcribe')
  assert.equal(calls[0].options.method, 'POST')
  assert.ok(calls[0].options.body instanceof FormData)
  assert.equal(calls[0].options.headers, undefined)
})

test('transcribeVoiceInput allows processing headroom for 30 second recordings', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal
  let timeoutMs = null

  globalThis.AbortSignal = { timeout: (ms) => ((timeoutMs = ms), undefined) }
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ text: 'Длинный вопрос', language: 'ru', durationMs: 30_000 }),
  })

  try {
    await transcribeVoiceInput({
      audioBlob: new Blob(['voice'], { type: 'audio/webm' }),
      lang: 'ru',
      storeSlug: 'mars',
      durationMs: 30_000,
    })
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }

  assert.equal(timeoutMs, 45_000)
})

test('transcribeVoiceInput surfaces server error codes', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: 'audio_too_long' }),
  })

  try {
    await assert.rejects(
      () =>
        transcribeVoiceInput({
          audioBlob: new Blob(['voice'], { type: 'audio/webm' }),
          lang: 'ru',
          storeSlug: 'mars',
          durationMs: 21_000,
        }),
      /audio_too_long/
    )
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }
})

test('transcribeVoiceInput maps missing local API route to unavailable transcription', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({}),
  })

  try {
    await assert.rejects(
      () =>
        transcribeVoiceInput({
          audioBlob: new Blob(['voice'], { type: 'audio/webm' }),
          lang: 'ru',
          storeSlug: 'mars',
          durationMs: 1200,
        }),
      /transcription_unavailable/
    )
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }
})

test('transcribeVoiceInput maps network failures to unavailable transcription', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }

  try {
    await assert.rejects(
      () =>
        transcribeVoiceInput({
          audioBlob: new Blob(['voice'], { type: 'audio/webm' }),
          lang: 'ru',
          storeSlug: 'mars',
          durationMs: 1200,
        }),
      /transcription_unavailable/
    )
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }
})
