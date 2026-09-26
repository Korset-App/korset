import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCopyableStoreProducts,
  getStoreShoppingList,
  setStoreShoppingList,
  toggleStoreShoppingItem,
} from '../../src/utils/shoppingLists.js'

test('shopping lists stay isolated by store', () => {
  const lists = setStoreShoppingList({}, 'store-a', ['ean-a'])
  assert.deepEqual(getStoreShoppingList(lists, 'store-a'), ['ean-a'])
  assert.deepEqual(getStoreShoppingList(lists, 'store-b'), [])
})

test('copying a list uses only available products and prices from the destination store', () => {
  const destinationCatalog = [
    { ean: 'ean-a', priceKzt: 430, stockStatus: 'in_stock' },
    { ean: 'ean-b', priceKzt: 100, stockStatus: 'out_of_stock' },
  ]
  const copyable = getCopyableStoreProducts(['ean-a', 'ean-b', 'ean-c', 'ean-a'], destinationCatalog)
  assert.deepEqual(copyable, [destinationCatalog[0]])
})

test('switching one store list preserves the other store', () => {
  const first = setStoreShoppingList({}, 'store-a', ['ean-a'])
  const second = setStoreShoppingList(first, 'store-b', ['ean-b'])
  const third = setStoreShoppingList(second, 'store-a', [])
  assert.deepEqual(getStoreShoppingList(third, 'store-a'), [])
  assert.deepEqual(getStoreShoppingList(third, 'store-b'), ['ean-b'])
})

test('invalid store cannot inherit another store list', () => {
  const lists = setStoreShoppingList({}, '', ['ean-a'])
  assert.deepEqual(lists, {})
  assert.deepEqual(getStoreShoppingList({ 'store-a': ['ean-a'] }, null), [])
})

test('toggling an item only changes the active store', () => {
  const first = setStoreShoppingList({}, 'store-a', ['ean-a'])
  const second = toggleStoreShoppingItem(first, 'store-b', 'ean-a')
  const third = toggleStoreShoppingItem(second, 'store-a', 'ean-a')
  assert.deepEqual(getStoreShoppingList(third, 'store-a'), [])
  assert.deepEqual(getStoreShoppingList(third, 'store-b'), ['ean-a'])
})
