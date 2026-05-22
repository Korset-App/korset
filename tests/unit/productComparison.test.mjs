import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductComparison } from '../../src/domain/product/comparison.js'

test('buildProductComparison chooses safe product over cheaper direct allergen match', () => {
  const result = buildProductComparison(
    {
      ean: '1',
      name: 'Cheap milk cookie',
      priceKzt: 250,
      ingredients: 'wheat flour, milk powder, sugar',
      allergens: ['milk'],
      stockStatus: 'in_stock',
    },
    {
      ean: '2',
      name: 'Rice cookie',
      priceKzt: 990,
      ingredients: 'rice flour, sugar',
      allergens: [],
      stockStatus: 'in_stock',
    },
    { profile: { allergens: ['milk'] } }
  )

  assert.equal(result.winner, 'B')
  assert.equal(result.confidence, 'clear')
  assert.equal(result.primaryReason, 'safety')
  assert.equal(result.summaryKey, 'avoid_allergen')
  assert.equal(result.a.label, 'choose_another')
  assert.equal(result.b.label, 'best_choice')
})

test('buildProductComparison catches direct allergen risk from ingredients when allergen field is sparse', () => {
  const result = buildProductComparison(
    {
      ean: '1',
      name: 'Sparse milk cookie',
      priceKzt: 250,
      ingredients: 'wheat flour, milk powder, sugar',
      allergens: [],
      stockStatus: 'in_stock',
    },
    {
      ean: '2',
      name: 'Rice cookie',
      priceKzt: 990,
      ingredients: 'rice flour, sugar',
      allergens: [],
      stockStatus: 'in_stock',
    },
    { profile: { allergens: ['milk'] } }
  )

  assert.equal(result.winner, 'B')
  assert.equal(result.primaryReason, 'safety')
  assert.equal(result.a.label, 'choose_another')
  assert.equal(result.a.reasons.includes('fit_check_allergen_risk'), true)
})

test('buildProductComparison prefers confirmed halal over lower-confidence halal guess', () => {
  const result = buildProductComparison(
    {
      name: 'Unknown jelly',
      halalStatus: 'unknown',
      ingredients: 'sugar, gelatin, flavoring',
      stockStatus: 'in_stock',
      priceKzt: 500,
    },
    {
      name: 'Certified halal candy',
      halalStatus: 'yes',
      ingredients: 'sugar, glucose syrup',
      stockStatus: 'in_stock',
      priceKzt: 850,
    },
    { profile: { halalOnly: true } }
  )

  assert.equal(result.winner, 'B')
  assert.equal(result.primaryReason, 'halal')
  assert.equal(result.summaryKey, 'confirmed_halal')
  assert.ok(result.b.reasons.includes('confirmed_halal'))
})

test('buildProductComparison ranks in-stock product above cheaper out-of-stock product', () => {
  const result = buildProductComparison(
    {
      name: 'Cheap rice',
      ingredients: 'rice',
      stockStatus: 'out_of_stock',
      priceKzt: 300,
    },
    {
      name: 'Available rice',
      ingredients: 'rice',
      stockStatus: 'in_stock',
      priceKzt: 650,
    },
    {}
  )

  assert.equal(result.winner, 'B')
  assert.equal(result.primaryReason, 'availability')
  assert.equal(result.summaryKey, 'available_now')
})

test('buildProductComparison uses price only after fit and availability are similar', () => {
  const result = buildProductComparison(
    {
      name: 'Budget oats',
      ingredients: 'oats',
      stockStatus: 'in_stock',
      priceKzt: 420,
    },
    {
      name: 'Premium oats',
      ingredients: 'oats',
      stockStatus: 'in_stock',
      priceKzt: 1200,
    },
    {}
  )

  assert.equal(result.winner, 'A')
  assert.equal(result.primaryReason, 'price')
  assert.equal(result.confidence, 'slight')
  assert.equal(result.summaryKey, 'better_price')
})

test('buildProductComparison treats sparse product cards as check-before-buy, not fake precision', () => {
  const result = buildProductComparison(
    {
      name: 'Sparse product',
      halalStatus: 'unknown',
      ingredients: '',
      stockStatus: 'in_stock',
      priceKzt: 500,
    },
    {
      name: 'Detailed product',
      halalStatus: 'unknown',
      ingredients: 'water, sugar',
      nutritionPer100: { kcal: 42 },
      stockStatus: 'in_stock',
      priceKzt: 500,
    },
    { profile: { halalOnly: true } }
  )

  assert.equal(result.winner, 'B')
  assert.equal(result.primaryReason, 'data')
  assert.equal(result.summaryKey, 'more_complete_card')
  assert.equal(result.a.label, 'fits_but_check')
  assert.equal(result.b.label, 'fits_but_check')
})

test('buildProductComparison returns draw when deterministic difference is too small', () => {
  const result = buildProductComparison(
    {
      name: 'Oats A',
      ingredients: 'oats',
      stockStatus: 'in_stock',
      priceKzt: 500,
    },
    {
      name: 'Oats B',
      ingredients: 'oats',
      stockStatus: 'in_stock',
      priceKzt: 520,
    },
    {}
  )

  assert.equal(result.winner, 'draw')
  assert.equal(result.confidence, 'draw')
  assert.equal(result.primaryReason, 'similar')
  assert.equal(result.summaryKey, 'similar_fit')
}
)
