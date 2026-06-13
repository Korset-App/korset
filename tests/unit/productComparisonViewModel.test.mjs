import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductComparison } from '../../src/domain/product/comparison.js'
import { buildProductComparisonViewModel } from '../../src/domain/product/comparisonViewModel.js'

function buildView(productA, productB, profile = {}) {
  const comparison = buildProductComparison(productA, productB, { profile })
  return buildProductComparisonViewModel({ productA, productB, comparison, profile })
}

function rowById(view, id) {
  return view.dataRows.find((row) => row.id === id)
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

test('buildProductComparisonViewModel exposes concrete data rows for product comparisons', () => {
  const view = buildView(
    {
      name: 'Жевательная резинка Dirol Морозная мята, 13,6 г',
      category: 'sweets',
      subcategory: 'gum',
      quantity: '13,6 г',
      flavorMeta: { value: 'Морозная мята', confidence: 'high' },
      priceKzt: 180,
      stockStatus: 'in_stock',
      halalStatus: 'unknown',
      nutritionPer100: { kcal: 170, sugar: 0 },
    },
    {
      name: 'Леденцы Halls с оригинальным вкусом, 25,2 г',
      category: 'sweets',
      subcategory: 'candy',
      quantity: '25,2 г',
      priceKzt: 320,
      stockStatus: 'in_stock',
      halalStatus: 'unknown',
      nutritionPer100: { kcal: 390, sugar: 95 },
    },
    {}
  )

  assert.equal(rowById(view, 'type').valueA, 'Жевательная резинка')
  assert.equal(rowById(view, 'type').valueB, 'Леденцы')
  assert.equal(rowById(view, 'quantity').valueA, '13,6 г')
  assert.equal(rowById(view, 'quantity').valueB, '25,2 г')
  assert.equal(rowById(view, 'flavor').valueA, 'Морозная мята')
  assert.equal(rowById(view, 'flavor').valueB, 'Оригинальный')
  assert.equal(rowById(view, 'price').valueA, '180 ₸')
  assert.equal(rowById(view, 'price').winnerSide, 'A')
  assert.equal(rowById(view, 'unit_price').valueA, '1 324 ₸ / 100 г')
  assert.equal(rowById(view, 'unit_price').valueB, '1 270 ₸ / 100 г')
  assert.equal(rowById(view, 'unit_price').winnerSide, 'B')
  assert.equal(rowById(view, 'sugar').winnerSide, 'A')
  assert.equal(rowById(view, 'kcal').winnerSide, 'A')
})
