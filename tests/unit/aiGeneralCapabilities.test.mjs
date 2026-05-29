import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { GENERAL_AI_CAPABILITIES } from '../../src/domain/ai/generalCapabilities.js'

const ru = JSON.parse(readFileSync('src/locales/ru/ai.json', 'utf8'))
const kz = JSON.parse(readFileSync('src/locales/kz/ai.json', 'utf8'))

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

test('general AI capability localization is complete in RU and KZ', () => {
  for (const item of GENERAL_AI_CAPABILITIES) {
    for (const key of [item.titleKey, item.descriptionKey, item.promptKey]) {
      assert.equal(typeof ru[key], 'string')
      assert.equal(ru[key].trim().length > 0, true)
      assert.equal(typeof kz[key], 'string')
      assert.equal(kz[key].trim().length > 0, true)
    }
  }
})
