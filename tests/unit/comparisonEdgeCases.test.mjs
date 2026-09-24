import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductComparison } from '../../src/domain/product/comparison.js'
import { buildProductComparisonViewModel } from '../../src/domain/product/comparisonViewModel.js'

// These tests pin the CURRENT behaviour of edge cases before Stage 2 changes it.
// If a test here starts failing, the edge-case behaviour changed on purpose —
// update it deliberately, not accidentally.

function dairyProduct(overrides = {}) {
  return {
    ean: '4600000000001',
    name: 'Йогурт 180 г',
    category: 'dairy_eggs',
    categoryId: 'dairy_eggs',
    priceKzt: 520,
    stockStatus: 'in_stock',
    ingredients: 'молоко, закваска',
    allergens: ['milk'],
    nutrition: { kcal: 120, sugar: 8, protein: 4, fat: 3, salt: 0.1, fiber: 0 },
    ...overrides,
  }
}

test('mismatched categories are blocked and never produce a winner', () => {
  const result = buildProductComparison(dairyProduct(), {
    ean: '4600000000002',
    name: 'Шампунь 250 мл',
    category: 'household',
    categoryId: 'household',
    priceKzt: 990,
    stockStatus: 'in_stock',
  })

  assert.equal(result.isComparable, false)
  assert.equal(result.confidence, 'blocked')
  assert.equal(result.primaryReason, 'category_mismatch')
  assert.equal(result.winner, 'draw')

  const view = buildProductComparisonViewModel({
    productA: dairyProduct(),
    productB: { ean: '4600000000002', name: 'Шампунь 250 мл', category: 'household' },
    comparison: result,
  })
  assert.equal(view.status, 'blocked')
  assert.equal(view.winnerSide, null)
  assert.equal(view.verdictKey, 'compare.verdict.blocked')
})

test('products without nutrition fall back to a non-nutrition decision', () => {
  const sparseA = dairyProduct({ nutrition: null, ingredients: 'молоко' })
  const sparseB = dairyProduct({
    ean: '4600000000003',
    name: 'Йогурт 2.5% 180 г',
    priceKzt: 300,
    nutrition: null,
    ingredients: 'молоко',
  })

  const result = buildProductComparison(sparseA, sparseB)

  assert.equal(result.isComparable, true)
  assert.equal(result.dataCoverage.missing.includes('nutrition'), true)
  assert.notEqual(result.primaryReason, 'nutrition')
})

test('out of stock loses to an available product', () => {
  const inStock = dairyProduct()
  const outOfStock = dairyProduct({
    ean: '4600000000004',
    name: 'Йогурт нет в наличии',
    stockStatus: 'out_of_stock',
    priceKzt: 100,
  })

  const result = buildProductComparison(outOfStock, inStock)

  assert.equal(result.isComparable, true)
  assert.equal(result.winner, 'B')
})

test('comparing a product with itself reports an explicit same-product state', () => {
  const product = dairyProduct()
  const result = buildProductComparison(product, { ...product })
  const view = buildProductComparisonViewModel({
    productA: product,
    productB: { ...product },
    comparison: result,
  })

  assert.equal(view.sameProduct, true)
  assert.equal(view.status, 'same_product')
  assert.equal(view.winnerSide, null)
  assert.equal(view.verdictKey, 'compare.verdict.sameProduct')
  assert.equal(view.actionKey, 'compare.action.chooseAnother')
})

test('same EAN in a different string form is still detected', () => {
  const result = buildProductComparison(dairyProduct(), dairyProduct())
  const view = buildProductComparisonViewModel({
    productA: dairyProduct({ ean: ' 4600000000001 ' }),
    productB: dairyProduct({ ean: '4600000000001' }),
    comparison: result,
  })

  assert.equal(view.status, 'same_product')
})

test('view model keeps data rows and notes available for every status', () => {
  const productA = dairyProduct()
  const productB = dairyProduct({
    ean: '4600000000005',
    name: 'Йогурт без сахара 180 г',
    priceKzt: 610,
    nutrition: { kcal: 90, sugar: 2, protein: 5, fat: 2, salt: 0.1, fiber: 0 },
  })
  const comparison = buildProductComparison(productA, productB)
  const view = buildProductComparisonViewModel({ productA, productB, comparison })

  assert.ok(view.dataRows.length > 0, 'data rows must render for a normal comparison')
  assert.ok(view.verdictKey.startsWith('compare.verdict.'))
  assert.equal(typeof view.confidence, 'string')
})

test('AI-estimated fields are marked so the verdict cannot look verified', () => {
  const productA = dairyProduct()
  const productB = dairyProduct({
    ean: '4600000000007',
    sourceMeta: { aiEnriched: true },
  })
  const comparison = buildProductComparison(productA, productB)
  const view = buildProductComparisonViewModel({ productA, productB, comparison })

  assert.equal(view.sourceNote?.aiEstimated, true)
})

test('fully verified products carry no AI source note', () => {
  const productA = dairyProduct()
  const productB = dairyProduct({ ean: '4600000000008' })
  const comparison = buildProductComparison(productA, productB)
  const view = buildProductComparisonViewModel({ productA, productB, comparison })

  assert.equal(view.sourceNote, null)
})

test('sparse data surfaces a data note instead of hiding the gap', () => {
  const productA = dairyProduct({ nutrition: null, ingredients: null })
  const productB = dairyProduct({ ean: '4600000000006', nutrition: null, ingredients: null })
  const comparison = buildProductComparison(productA, productB)
  const view = buildProductComparisonViewModel({ productA, productB, comparison })

  assert.ok(view.dataNote, 'a data note must be present when coverage is low')
  assert.equal(view.dataNote.level, 'low')
})
