import test from 'node:test'
import assert from 'node:assert/strict'

import { findProductAlternatives, findProductInCatalog } from '../../src/domain/product/alternatives.js'

const product = (overrides = {}) => ({
  ean: '100',
  name: 'Original Milk',
  category: 'dairy_eggs',
  subcategory: 'milk',
  group: 'milk',
  priceKzt: 1000,
  allergens: [],
  dietTags: [],
  traces: [],
  nutritionPer100: {},
  ...overrides,
})

test('findProductInCatalog matches primary and alternate EANs', () => {
  const catalog = [
    product({ ean: '100', alternateEans: ['101'] }),
    product({ ean: '200', name: 'Other' }),
  ]

  assert.equal(findProductInCatalog(catalog, '100')?.ean, '100')
  assert.equal(findProductInCatalog(catalog, '101')?.ean, '100')
  assert.equal(findProductInCatalog(catalog, '999'), null)
})

test('findProductAlternatives keeps alternatives in same store and ranks safer closer products first', () => {
  const original = product({ ean: '100', priceKzt: 1000, group: 'milk' })
  const catalog = [
    original,
    product({ ean: '200', name: 'Unsafe same group', group: 'milk', priceKzt: 990, allergens: ['milk'] }),
    product({ ean: '300', name: 'Safe same group closer', group: 'milk', priceKzt: 1040 }),
    product({ ean: '400', name: 'Safe same category', group: 'kefir', priceKzt: 900 }),
    product({
      ean: '500',
      name: 'Other category',
      category: 'snacks',
      subcategory: 'chips',
      group: 'chips',
      priceKzt: 800,
    }),
  ]

  const alternatives = findProductAlternatives({
    product: original,
    catalogProducts: catalog,
    profile: { allergens: ['milk'] },
  })

  assert.deepEqual(
    alternatives.map((item) => item.ean),
    ['300', '400', '200']
  )
})

test('findProductAlternatives falls back from group to category and caps results', () => {
  const original = product({ ean: '100', group: null, category: 'snacks' })
  const catalog = [
    original,
    ...Array.from({ length: 8 }, (_, index) =>
      product({
        ean: String(200 + index),
        name: `Snack ${index}`,
        category: 'snacks',
        group: `snacks-${index}`,
        priceKzt: 1000 + index,
      })
    ),
  ]

  const alternatives = findProductAlternatives({
    product: original,
    catalogProducts: catalog,
    profile: {},
    limit: 6,
  })

  assert.equal(alternatives.length, 6)
  assert.ok(alternatives.every((item) => item.ean !== original.ean))
})
