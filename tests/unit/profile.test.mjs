import test from 'node:test'
import assert from 'node:assert/strict'

import { applyPreset, normalizeDietGoals } from '../../src/utils/profile.js'

test('normalizeDietGoals migrates legacy dairy_free to lactose_free', () => {
  assert.deepEqual(normalizeDietGoals(['dairy_free', 'sugar_free', 'dairy_free']), [
    'lactose_free',
    'sugar_free',
  ])
})

test('lactose_free preset does not imply milk allergy', () => {
  const profile = applyPreset('lactose_free')
  assert.deepEqual(profile.dietGoals, ['lactose_free'])
  assert.deepEqual(profile.allergens, [])
})

test('legacy dairy_free preset remains compatible', () => {
  const profile = applyPreset('dairy_free')
  assert.deepEqual(profile.dietGoals, ['lactose_free'])
  assert.deepEqual(profile.allergens, [])
})
