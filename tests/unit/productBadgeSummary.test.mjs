import test from 'node:test'
import assert from 'node:assert/strict'
import { getProductBadgeSummary } from '../../src/domain/home/homeScreenModel.js'

test('uses verified explicit primary diet tag and counts only other attributes', () => {
  const summary = getProductBadgeSummary({
    primaryDietTag: 'keto',
    dietTags: ['vegan', 'keto', 'gluten_free'],
    halalStatus: 'yes',
  }, 'ru')
  assert.deepEqual(summary.badges.map((badge) => badge.key), ['keto'])
  assert.equal(summary.extraCount, 3)
})

test('discount stays distinct from dietary attribute count', () => {
  const summary = getProductBadgeSummary({
    priceKzt: 80, oldPriceKzt: 100, dietTags: ['keto', 'vegan'],
  }, 'ru')
  assert.deepEqual(summary.badges.map((badge) => badge.key), ['keto'])
  assert.equal(summary.extraCount, 1)
  assert.equal(summary.discountBadge.label, '-20%')
})

test('a product name can prioritize a verified child-friendly tag over halal', () => {
  const summary = getProductBadgeSummary({
    name: 'Детский йогурт', halalStatus: 'certified', dietTags: ['kid_friendly', 'low_fat'],
  }, 'ru')
  assert.deepEqual(summary.badges.map((badge) => badge.key), ['kid_friendly'])
  assert.equal(summary.extraCount, 2)
})
