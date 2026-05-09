import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductAISuggestions } from '../../src/domain/ai/productSuggestions.js'

function ids(suggestions) {
  return suggestions.map((item) => item.id)
}

test('buildProductAISuggestions returns five user-friendly suggestions with a personal first question', () => {
  const suggestions = buildProductAISuggestions({
    product: {
      name: 'Greek Yogurt',
      category: 'dairy_eggs',
      subcategory: 'yogurt',
      ingredients: 'Milk, cream, starter culture',
      priceKzt: 890,
      stockStatus: 'in_stock',
    },
    profile: {},
    alternatives: [{ ean: '2', name: 'Plain Yogurt', priceKzt: 760 }],
  })

  assert.equal(suggestions.length, 5)
  assert.equal(suggestions[0].id, 'personal_fit')
  assert.equal(suggestions[0].labelKey, 'ai.productSuggestions.personalFit.label')
  assert.deepEqual(ids(suggestions), [
    'personal_fit',
    'explain_ingredients',
    'better_option',
    'category_dairy_use',
    'packaging_check',
  ])
})

test('buildProductAISuggestions promotes a concrete ingredient question when an additive is present', () => {
  const suggestions = buildProductAISuggestions({
    product: {
      name: 'Fruit Dessert',
      category: 'sweets',
      ingredients: 'Sugar, cocoa, microcrystalline cellulose (E460), flavoring',
      priceKzt: 520,
    },
  })

  assert.equal(suggestions[1].id, 'ingredient_focus')
  assert.equal(suggestions[1].values.ingredient, 'E460')
  assert.equal(suggestions[1].labelKey, 'ai.productSuggestions.ingredientFocus.label')
})

test('buildProductAISuggestions limits safety-heavy suggestions to two visible items', () => {
  const suggestions = buildProductAISuggestions({
    product: {
      name: 'Chocolate Candy',
      category: 'sweets',
      ingredients: 'Sugar, milk powder, gelatin, whiskey flavoring',
      allergens: ['milk'],
      halalStatus: 'unknown',
      stockStatus: 'in_stock',
    },
    profile: {
      allergens: ['milk'],
      halalOnly: true,
      halalStrict: true,
    },
  })

  assert.equal(suggestions.length, 5)
  assert.deepEqual(ids(suggestions).filter((id) => ['allergy_risk', 'halal_check'].includes(id)), [
    'allergy_risk',
    'halal_check',
  ])
  assert.equal(
    suggestions.filter((item) => item.kind === 'risk').length,
    2
  )
})

test('buildProductAISuggestions prioritizes replacement when product is out of stock', () => {
  const suggestions = buildProductAISuggestions({
    product: {
      name: 'Rice Premium',
      category: 'grocery',
      subcategory: 'grains',
      ingredients: 'Rice',
      stockStatus: 'out_of_stock',
    },
    alternatives: [{ ean: '2', name: 'Rice Classic' }],
  })

  assert.ok(ids(suggestions).includes('out_of_stock_replace'))
  assert.equal(suggestions.find((item) => item.id === 'out_of_stock_replace').priority < 40, true)
})

test('buildProductAISuggestions stays useful and honest when product facts are sparse', () => {
  const suggestions = buildProductAISuggestions({
    product: {
      name: 'Unknown Product',
      category: 'snacks',
      halalStatus: 'unknown',
    },
  })

  assert.deepEqual(ids(suggestions), [
    'personal_fit',
    'missing_ingredients',
    'category_snacks_frequency',
    'packaging_check',
    'usage_ideas',
  ])
})
