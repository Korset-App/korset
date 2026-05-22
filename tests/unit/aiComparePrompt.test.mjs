import assert from 'node:assert/strict'
import test from 'node:test'

import { buildComparePrompt } from '../../api/ai.js'

test('buildComparePrompt grounds explanation in deterministic comparison result', () => {
  const prompt = buildComparePrompt(
    {
      name: 'Cheap milk cookie',
      halalStatus: 'unknown',
      ingredients: 'milk powder, sugar',
      allergens: ['milk'],
      stockStatus: 'in_stock',
      priceKzt: 250,
    },
    {
      name: 'Rice cookie',
      halalStatus: 'unknown',
      ingredients: 'rice flour, sugar',
      allergens: [],
      stockStatus: 'in_stock',
      priceKzt: 990,
    },
    { allergens: ['milk'] },
    {
      winner: 'B',
      confidence: 'clear',
      primaryReason: 'safety',
      summaryKey: 'avoid_allergen',
      a: { label: 'choose_another', reasons: ['direct_allergen_match'] },
      b: { label: 'best_choice', reasons: ['likely_compatible'] },
    },
    'ru',
    null
  )

  assert.match(prompt, /FIT_PRIORITY_RESULT/)
  assert.match(prompt, /winner: B/)
  assert.match(prompt, /primaryReason: safety/)
  assert.match(prompt, /avoid_allergen/)
  assert.match(prompt, /must match this deterministic result/)
  assert.doesNotMatch(prompt, /%/)
})
