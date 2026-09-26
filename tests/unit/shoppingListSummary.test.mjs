import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeShoppingList } from '../../src/domain/shopping/shoppingListSummary.js'

test('summarizes item and valid price counts and total', () => {
  assert.deepEqual(
    summarizeShoppingList([
      { priceKzt: 120 },
      { priceKzt: 80.5 },
      { priceKzt: 25 },
    ]),
    {
      itemCount: 3,
      pricedCount: 3,
      missingPriceCount: 0,
      pricedTotalKzt: 225.5,
      knownSubtotalKzt: 225.5,
    },
  )
})

test('does not fabricate a total when prices are missing', () => {
  assert.deepEqual(
    summarizeShoppingList([{ priceKzt: 50 }, {}]),
    {
      itemCount: 2,
      pricedCount: 1,
      missingPriceCount: 1,
      pricedTotalKzt: null,
      knownSubtotalKzt: 50,
    },
  )
})

test('counts only finite positive prices once per item', () => {
  assert.deepEqual(
    summarizeShoppingList([
      { priceKzt: -1 },
      { priceKzt: Number.NaN },
      { priceKzt: Number.POSITIVE_INFINITY },
      { priceKzt: '25' },
      { priceKzt: 10, quantity: 4 },
      { priceKzt: 15 },
    ]),
    {
      itemCount: 6,
      pricedCount: 2,
      missingPriceCount: 4,
      pricedTotalKzt: null,
      knownSubtotalKzt: 25,
    },
  )
})

test('returns zero counts and total for an empty list', () => {
  assert.deepEqual(summarizeShoppingList([]), {
    itemCount: 0,
    pricedCount: 0,
    missingPriceCount: 0,
    pricedTotalKzt: 0,
    knownSubtotalKzt: 0,
  })
})
