import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductComparison } from '../../src/domain/product/comparison.js'
import { buildProductComparisonViewModel } from '../../src/domain/product/comparisonViewModel.js'
import { normalizeNutrition } from '../../src/domain/product/model.js'

function buildView(productA, productB, profile = {}) {
  const comparison = buildProductComparison(productA, productB, { profile })
  return buildProductComparisonViewModel({ productA, productB, comparison, profile })
}

function rowById(view, id) {
  return view.dataRows.find((row) => row.id === id)
}

test('canonical empty nutrition is unknown and cannot win by invented zero values', () => {
  const a = { category: 'dairy_eggs', ingredients: 'Рис', priceKzt: 500, stockStatus: 'in_stock', nutritionPer100: normalizeNutrition(null) }
  const b = { ...a, nutritionPer100: { kcal: 100, sugar: 10, fat: 3, protein: 5 } }
  const result = buildProductComparison(a, b)
  const view = buildView(a, b)
  assert.notEqual(result.primaryReason, 'nutrition')
  assert.ok(result.dataCoverage.missing.includes('nutrition'))
  assert.equal(rowById(view, 'sugar').valueA, null)
  assert.equal(rowById(view, 'sugar').winnerSide, null)
  assert.equal(rowById(view, 'kcal').valueA, null)
  assert.equal(rowById(view, 'kcal').winnerSide, null)
  assert.ok(view.dataNote)
})

test('known zero stays visible and can win over a confirmed positive value', () => {
  const a = { category: 'water_beverages', ingredients: 'Вода', nutritionPer100: { kcal: 0, sugar: 0 } }
  const b = { ...a, nutritionPer100: { kcal: 42, sugar: 10 } }
  const view = buildView(a, b)
  assert.equal(rowById(view, 'sugar').valueA, '0 г')
  assert.equal(rowById(view, 'sugar').winnerSide, 'A')
  assert.equal(rowById(view, 'kcal').valueA, '0 ккал')
  assert.equal(view.winnerSide, 'A')
})

test('missing price and whitespace composition do not become advantages or complete data', () => {
  const a = { category: 'dairy_eggs', ingredients: ' ', priceKzt: null, nutritionPer100: normalizeNutrition(null) }
  const b = { ...a, priceKzt: 500 }
  const view = buildView(a, b)
  assert.equal(rowById(view, 'price').valueA, null)
  assert.equal(rowById(view, 'price').winnerSide, null)
  assert.equal(view.dataNote.level, 'low')
})

test('partial nutrition discloses missing fields used by the category comparison', () => {
  const a = { category: 'dairy_eggs', ingredients: 'Рис', nutritionPer100: { protein: 5 } }
  const b = { ...a, nutritionPer100: { protein: 3, sugar: 10, kcal: 100, fat: 3 } }
  const view = buildView(a, b)
  assert.equal(view.dataNote.level, 'medium')
  assert.ok(view.dataNote.missing.includes('nutrition'))
  assert.equal(rowById(view, 'sugar').valueA, null)
  assert.equal(rowById(view, 'sugar').winnerSide, null)
})

test('invalid prices stay unknown in both the display and the row decision', () => {
  for (const price of ['bad', '', ' ', -5, false, [], Infinity]) {
    const a = { category: 'dairy_eggs', priceKzt: price }
    const view = buildView(a, { category: 'dairy_eggs', priceKzt: 500 })
    assert.equal(rowById(view, 'price').valueA, null)
    assert.equal(rowById(view, 'price').winnerSide, null)
  }
})

test('a meaningful Kazakh composition survives an empty Russian counterpart', () => {
  const a = { category: 'dairy_eggs', ingredients: ' ', ingredientsKz: 'Күріш', nutritionPer100: normalizeNutrition(null) }
  const comparison = buildProductComparison(a, { ...a, ingredients: 'Рис' })
  assert.equal(comparison.dataCoverage.missing.includes('ingredients'), false)
  assert.equal(comparison.dataCoverage.level, 'medium')
})

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
