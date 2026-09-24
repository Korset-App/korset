import assert from 'node:assert/strict'
import test from 'node:test'

import { askCompareAI } from '../../src/services/ai.js'

test('askCompareAI posts a compare request with both products compacted', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal
  const calls = []

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async (_url, options) => {
    calls.push({ body: JSON.parse(options.body), headers: options.headers })
    return { ok: true, json: async () => ({ reply: 'Кефир лучше по сахару.' }) }
  }

  try {
    const result = await askCompareAI({
      messages: [{ role: 'user', content: 'Объясни результат сравнения.' }],
      productA: { ean: '111', name: 'Йогурт', nutrition: { sugar: 8 } },
      productB: { ean: '222', name: 'Кефир', nutrition: { sugar: 4 } },
      profile: { allergens: ['milk'], halal: true },
      winner: 'B',
      lang: 'ru',
    })

    assert.equal(result.reply, 'Кефир лучше по сахару.')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].body.mode, 'compare')
    assert.equal(calls[0].body.winner, 'B')
    assert.equal(calls[0].body.productA.ean, '111')
    assert.equal(calls[0].body.productB.ean, '222')
    assert.deepEqual(calls[0].body.profile.allergens, ['milk'])
    // No session in this environment — the request must stay anonymous-safe.
    assert.equal(calls[0].headers.Authorization, undefined)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }
})

test('askCompareAI surfaces a failure instead of resolving empty', async () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal

  globalThis.AbortSignal = { timeout: () => undefined }
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: 'Rate limit exceeded' }) })

  try {
    await assert.rejects(
      askCompareAI({
        messages: [{ role: 'user', content: 'x' }],
        productA: { ean: '111' },
        productB: { ean: '222' },
      })
    )
  } finally {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
  }
})
