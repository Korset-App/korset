import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFitPriority, compareFitPriority } from '../../src/domain/ai/fitPriority.js'

test('buildFitPriority makes direct allergy risk outrank cheap price', () => {
  const cheapRisky = buildFitPriority(
    {
      name: 'Cheap milk snack',
      priceKzt: 100,
      allergens: ['milk'],
      ingredients: 'milk, sugar',
      stockStatus: 'in_stock',
    },
    { profile: { allergens: ['milk'] } }
  )
  const expensiveSafe = buildFitPriority(
    {
      name: 'Expensive safe snack',
      priceKzt: 1500,
      allergens: [],
      ingredients: 'apple, rice',
      stockStatus: 'in_stock',
    },
    { profile: { allergens: ['milk'] } }
  )

  assert.equal(cheapRisky.label, 'choose_another')
  assert.ok(expensiveSafe.sortScore > cheapRisky.sortScore)
})

test('compareFitPriority ranks confirmed and likely halal above insufficient data for halal requests', () => {
  const confirmed = {
    name: 'Confirmed halal chocolate',
    halalStatus: 'yes',
    ingredients: 'milk, sugar, cocoa',
    stockStatus: 'in_stock',
  }
  const likely = {
    name: 'Likely compatible chocolate',
    halalStatus: 'unknown',
    ingredients: 'milk, sugar, cocoa butter',
    stockStatus: 'in_stock',
  }
  const insufficient = {
    name: 'Unknown candy',
    halalStatus: 'unknown',
    ingredients: '',
    stockStatus: 'in_stock',
  }

  const sorted = [insufficient, likely, confirmed].sort((a, b) =>
    compareFitPriority(a, b, { intent: { halal: true } })
  )

  assert.deepEqual(
    sorted.map((product) => product.name),
    ['Confirmed halal chocolate', 'Likely compatible chocolate', 'Unknown candy']
  )
})

test('compareFitPriority ranks in-stock items above out-of-stock when fit is otherwise similar', () => {
  const inStock = {
    name: 'Rice in stock',
    priceKzt: 900,
    ingredients: 'rice',
    stockStatus: 'in_stock',
  }
  const outOfStock = {
    name: 'Rice out of stock',
    priceKzt: 500,
    ingredients: 'rice',
    stockStatus: 'out_of_stock',
  }

  assert.ok(compareFitPriority(inStock, outOfStock, {}) < 0)
})

test('compareFitPriority uses cheaper price only after safety and availability are similar', () => {
  const cheaper = {
    name: 'Cheaper clean snack',
    priceKzt: 700,
    ingredients: 'apple',
    stockStatus: 'in_stock',
  }
  const expensive = {
    name: 'Expensive clean snack',
    priceKzt: 1500,
    ingredients: 'apple',
    stockStatus: 'in_stock',
  }

  assert.ok(compareFitPriority(cheaper, expensive, {}) < 0)
})
