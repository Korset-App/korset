import assert from 'node:assert/strict'
import test from 'node:test'

import { GENERAL_AI_CAPABILITIES } from '../../src/domain/ai/generalCapabilities.js'

test('general AI capabilities expose exactly six high-value store assistant actions', () => {
  assert.equal(GENERAL_AI_CAPABILITIES.length, 6)
  assert.deepEqual(
    GENERAL_AI_CAPABILITIES.map((item) => item.id),
    ['find_product', 'pick_alternative', 'explain_composition', 'build_shopping_list', 'fit_check', 'budget_pick']
  )
})

test('general AI capabilities are ready for localized cards and real prompts', () => {
  for (const item of GENERAL_AI_CAPABILITIES) {
    assert.match(item.icon, /^[a-z0-9_]+$/)
    assert.match(item.titleKey, /^ai\.capabilities\.[a-z_]+\.title$/)
    assert.match(item.descriptionKey, /^ai\.capabilities\.[a-z_]+\.description$/)
    assert.match(item.promptKey, /^ai\.capabilities\.[a-z_]+\.prompt$/)
  }
})
