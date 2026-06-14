import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getProductScreenBaseProduct,
  getProductScreenProduct,
  shouldFetchFullProductForProductScreen,
} from '../../src/domain/product/productScreenData.js'

const product = (overrides = {}) => ({
  ean: '11111111',
  name: 'Product',
  nutritionPer100: { kcal: 120, protein: 4, fat: 3, carbs: 12 },
  ingredients: 'Milk',
  ...overrides,
})

test('getProductScreenBaseProduct prefers catalog product for the route EAN', () => {
  const catalogProduct = product({ ean: '22222222', name: 'Catalog' })
  const stateProduct = product({ ean: '22222222', name: 'State' })

  assert.equal(
    getProductScreenBaseProduct({ catalogProduct, stateProduct, ean: '22222222' }).name,
    'Catalog'
  )
})

test('getProductScreenBaseProduct ignores stale route state product', () => {
  const stateProduct = product({ ean: '11111111', name: 'Stale state' })

  assert.equal(
    getProductScreenBaseProduct({ catalogProduct: null, stateProduct, ean: '22222222' }),
    null
  )
})

test('getProductScreenProduct prefers full product only when it matches route EAN', () => {
  const baseProduct = product({ ean: '22222222', name: 'Base' })
  const staleFullProduct = product({ ean: '11111111', name: 'Stale full' })

  assert.equal(
    getProductScreenProduct({ baseProduct, fullProduct: staleFullProduct, ean: '22222222' }).name,
    'Base'
  )
})

test('getProductScreenProduct accepts full product matched through alternate EAN', () => {
  const baseProduct = product({ ean: '22222222', name: 'Base' })
  const fullProduct = product({ ean: '11111111', alternateEans: ['22222222'], name: 'Full' })

  assert.equal(getProductScreenProduct({ baseProduct, fullProduct, ean: '22222222' }).name, 'Full')
})

test('getProductScreenProduct does not let a sparse full fetch erase catalog ingredients', () => {
  const baseProduct = product({
    ean: '22222222',
    name: 'Catalog product',
    ingredients: 'Молоко нормализованное, закваска',
    nutritionPer100: { kcal: 58, protein: 3, fat: 3.2, carbs: 4.7 },
    allergens: ['milk'],
  })
  const fullProduct = product({
    ean: '22222222',
    name: 'Full product',
    ingredients: null,
    nutritionPer100: {},
    allergens: [],
    productScreenFull: true,
  })

  const result = getProductScreenProduct({ baseProduct, fullProduct, ean: '22222222' })

  assert.equal(result.name, 'Full product')
  assert.equal(result.ingredients, 'Молоко нормализованное, закваска')
  assert.deepEqual(result.nutritionPer100, { kcal: 58, protein: 3, fat: 3.2, carbs: 4.7 })
  assert.deepEqual(result.allergens, ['milk'])
  assert.equal(result.productScreenFull, true)
})

test('shouldFetchFullProductForProductScreen fetches when route has no base product', () => {
  assert.equal(
    shouldFetchFullProductForProductScreen({
      baseProduct: null,
      fullProduct: null,
      ean: '11111111',
      storeId: 'store-1',
      isOnline: true,
      needsResolve: false,
    }),
    true
  )
})

test('shouldFetchFullProductForProductScreen fetches catalog product that lacks full-only fields', () => {
  assert.equal(
    shouldFetchFullProductForProductScreen({
      baseProduct: product({ description: null, specs: null }),
      fullProduct: null,
      ean: '11111111',
      storeId: 'store-1',
      isOnline: true,
      needsResolve: false,
    }),
    true
  )
})

test('shouldFetchFullProductForProductScreen does not refetch after matching full product is loaded', () => {
  assert.equal(
    shouldFetchFullProductForProductScreen({
      baseProduct: product({ description: null, specs: null }),
      fullProduct: product({ description: null, specs: null, productScreenFull: true }),
      ean: '11111111',
      storeId: 'store-1',
      isOnline: true,
      needsResolve: false,
    }),
    false
  )
})

test('shouldFetchFullProductForProductScreen fetches when loaded full product belongs to another EAN', () => {
  assert.equal(
    shouldFetchFullProductForProductScreen({
      baseProduct: product({ ean: '22222222', description: null, specs: null }),
      fullProduct: product({ ean: '11111111', productScreenFull: true }),
      ean: '22222222',
      storeId: 'store-1',
      isOnline: true,
      needsResolve: false,
    }),
    true
  )
})

test('shouldFetchFullProductForProductScreen skips fetch while scan resolver owns the lookup', () => {
  assert.equal(
    shouldFetchFullProductForProductScreen({
      baseProduct: null,
      fullProduct: null,
      ean: '11111111',
      storeId: 'store-1',
      isOnline: true,
      needsResolve: true,
    }),
    false
  )
})

test('shouldFetchFullProductForProductScreen skips fetch offline or without store context', () => {
  assert.equal(
    shouldFetchFullProductForProductScreen({
      baseProduct: product(),
      fullProduct: null,
      ean: '11111111',
      storeId: 'store-1',
      isOnline: false,
      needsResolve: false,
    }),
    false
  )

  assert.equal(
    shouldFetchFullProductForProductScreen({
      baseProduct: product(),
      fullProduct: null,
      ean: '11111111',
      storeId: null,
      isOnline: true,
      needsResolve: false,
    }),
    false
  )
})
