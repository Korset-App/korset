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
})

test('buildProductComparison marks different categories as not comparable', () => {
  const result = buildProductComparison(
    {
      name: 'Plain yogurt',
      category: 'dairy_eggs',
      ingredients: 'milk, starter culture',
      stockStatus: 'in_stock',
      priceKzt: 600,
    },
    {
      name: 'Apple juice',
      category: 'water_beverages',
      ingredients: 'apple juice',
      stockStatus: 'in_stock',
      priceKzt: 800,
    },
    {}
  )

  assert.equal(result.isComparable, false)
  assert.equal(result.winner, 'draw')
  assert.equal(result.primaryReason, 'category_mismatch')
  assert.equal(result.summaryKey, 'different_category')
  assert.equal(result.confidence, 'blocked')
})

test('buildProductComparison keeps a winner but lowers confidence when key data is sparse', () => {
  const result = buildProductComparison(
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

  assert.equal(result.isComparable, true)
  assert.equal(result.winner, 'A')
  assert.equal(result.primaryReason, 'price')
  assert.equal(result.confidence, 'preliminary')
  assert.equal(result.dataCoverage.level, 'low')
  assert.equal(result.dataCoverage.missing.includes('ingredients'), true)
  assert.equal(result.dataCoverage.missing.includes('nutrition'), true)
})

test('buildProductComparison lets nutrition beat halal when profile is only a perspective', () => {
  const result = buildProductComparison(
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
    { profile: { halalOnly: true } }
  )

  assert.equal(result.winner, 'B')
  assert.equal(result.primaryReason, 'nutrition')
  assert.equal(result.profilePerspective.winner, 'A')
  assert.equal(result.profilePerspective.reason, 'halal')
})

test('buildProductComparison uses unit price for comparable same-category packs', () => {
  const result = buildProductComparison(
    {
      name: 'Small crackers',
      category: 'snacks',
      subcategory: 'crackers',
      quantity: '100 g',
      ingredients: 'wheat flour, oil, salt',
      nutritionPer100: { kcal: 430, fat: 12, carbs: 68, salt: 1.2 },
      stockStatus: 'in_stock',
      priceKzt: 450,
    },
    {
      name: 'Family crackers',
      category: 'snacks',
      subcategory: 'crackers',
      quantity: '300 g',
      ingredients: 'wheat flour, oil, salt',
      nutritionPer100: { kcal: 430, fat: 12, carbs: 68, salt: 1.2 },
      stockStatus: 'in_stock',
      priceKzt: 900,
    },
    {}
  )

  assert.equal(result.winner, 'B')
  assert.equal(result.primaryReason, 'value')
  assert.equal(result.summaryKey, 'better_value')
})
