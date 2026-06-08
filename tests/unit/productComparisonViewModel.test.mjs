import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductComparison } from '../../src/domain/product/comparison.js'
import { buildProductComparisonViewModel } from '../../src/domain/product/comparisonViewModel.js'

function buildView(productA, productB, profile = {}) {
  const comparison = buildProductComparison(productA, productB, { profile })
  return buildProductComparisonViewModel({ productA, productB, comparison, profile })
}

test('buildProductComparisonViewModel prompts setup when profile has no personal signals', () => {
  const view = buildView(
    {
      name: 'Sweet soda',
      category: 'water_beverages',
      subcategory: 'soda',
      ingredients: 'water, sugar',
      nutritionPer100: { kcal: 42, sugar: 10 },
      stockStatus: 'in_stock',
      priceKzt: 390,
    },
    {
      name: 'Still water',
      category: 'water_beverages',
      subcategory: 'water',
      ingredients: 'water',
      nutritionPer100: { kcal: 0, sugar: 0 },
      stockStatus: 'in_stock',
      priceKzt: 320,
    },
    {}
  )

  assert.equal(view.status, 'winner')
  assert.equal(view.winnerSide, 'B')
  assert.equal(view.profileNote.type, 'setup')
  assert.equal(view.profileNote.messageKey, 'compare.profile.setupPrompt')
  assert.equal(view.topFactors[0].id, 'nutrition')
})

test('buildProductComparisonViewModel exposes profile divergence separately from overall winner', () => {
  const view = buildView(
    {
      name: 'Halal soda',
      category: 'water_beverages',
      subcategory: 'soda',
      halalStatus: 'yes',
      ingredients: 'water, sugar, flavoring',
      nutritionPer100: { kcal: 45, sugar: 11 },
      stockStatus: 'in_stock',
      priceKzt: 390,
    },
    {
      name: 'Still water',
      category: 'water_beverages',
      subcategory: 'water',
      halalStatus: 'unknown',
      ingredients: 'water',
      nutritionPer100: { kcal: 0, sugar: 0 },
      stockStatus: 'in_stock',
      priceKzt: 320,
    },
    { halalOnly: true }
  )

  assert.equal(view.status, 'winner')
  assert.equal(view.winnerSide, 'B')
  assert.deepEqual(view.profileNote, {
    type: 'diverges',
    winnerSide: 'A',
    reason: 'halal',
    messageKey: 'compare.profile.differs',
  })
})

test('buildProductComparisonViewModel blocks direct winner UI for different categories', () => {
  const view = buildView(
    {
      name: 'Plain yogurt',
      category: 'dairy_eggs',
      ingredients: 'milk',
      stockStatus: 'in_stock',
      priceKzt: 500,
    },
    {
      name: 'Apple juice',
      category: 'water_beverages',
      ingredients: 'apple juice',
      stockStatus: 'in_stock',
      priceKzt: 500,
    },
    {}
  )

  assert.equal(view.status, 'blocked')
  assert.equal(view.winnerSide, null)
  assert.equal(view.verdictKey, 'compare.verdict.blocked')
  assert.equal(view.actionKey, 'compare.action.findSameCategory')
})

test('buildProductComparisonViewModel marks preliminary low-data winners', () => {
  const view = buildView(
    {
      name: 'Budget oats',
      category: 'grocery',
      stockStatus: 'in_stock',
      priceKzt: 420,
    },
    {
      name: 'Premium oats',
      category: 'grocery',
      stockStatus: 'in_stock',
      priceKzt: 1200,
    },
    {}
  )

  assert.equal(view.status, 'winner')
  assert.equal(view.confidence, 'preliminary')
  assert.equal(view.verdictKey, 'compare.verdict.preliminary')
  assert.equal(view.dataNote.messageKey, 'compare.data.low')
})
