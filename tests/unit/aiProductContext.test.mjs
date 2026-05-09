import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveProductAIContext, resolveProductForProductAI } from '../../src/domain/ai/productContext.js'

test('resolveProductAIContext prefers full store product fetch for direct product AI routes', async () => {
  const fullProduct = {
    ean: '4870204070018',
    name: 'Full Milk',
    ingredients: 'milk',
    priceKzt: 890,
    stockStatus: 'in_stock',
  }
  const product = await resolveProductAIContext({
    productRef: '4870204070018',
    storeId: 'store-1',
    catalogProducts: [{ ean: '4870204070018', name: 'Light Milk' }],
    fetchFullProductImpl: async (storeId, ean) => {
      assert.equal(storeId, 'store-1')
      assert.equal(ean, '4870204070018')
      return fullProduct
    },
  })

  assert.deepEqual(product, fullProduct)
})

test('resolveProductAIContext falls back to current catalog by primary or alternate EAN', async () => {
  const catalogProduct = {
    ean: '4870204070018',
    alternateEans: ['4870204070094'],
    name: 'Catalog Milk',
  }
  const product = await resolveProductAIContext({
    productRef: '4870204070094',
    storeId: 'store-1',
    catalogProducts: [catalogProduct],
    fetchFullProductImpl: async () => null,
  })

  assert.equal(product, catalogProduct)
})

test('resolveProductAIContext uses route state fallback only when it matches the requested product', async () => {
  const product = await resolveProductAIContext({
    productRef: '4870204070018',
    storeId: null,
    catalogProducts: [],
    fallbackProduct: { ean: '4870204070018', name: 'State Product' },
    fetchFullProductImpl: async () => {
      throw new Error('should not fetch without store id')
    },
  })

  assert.equal(product?.name, 'State Product')

  const mismatched = await resolveProductAIContext({
    productRef: '4870204070018',
    storeId: null,
    catalogProducts: [],
    fallbackProduct: { ean: '1111111111111', name: 'Wrong Product' },
    fetchFullProductImpl: async () => null,
  })

  assert.equal(mismatched, null)
})

test('resolveProductForProductAI uses product resolver without scan logging', async () => {
  const fullProduct = { ean: '4870204070094', name: 'Alternate Milk' }
  const product = await resolveProductForProductAI({
    productRef: '4870204070094',
    storeId: 'store-1',
    catalogProducts: [],
    resolveProductByEanImpl: async (ean, storeId, options) => {
      assert.equal(ean, '4870204070094')
      assert.equal(storeId, 'store-1')
      assert.deepEqual(options, { logScan: false })
      return fullProduct
    },
  })

  assert.equal(product, fullProduct)
})
