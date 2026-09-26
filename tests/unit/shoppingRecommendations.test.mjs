import test from 'node:test'
import assert from 'node:assert/strict'
import { selectShoppingRecommendations } from '../../src/domain/shopping/recommendations.js'

const product = (ean, category, extra = {}) => ({ ean, category, priceKzt: 100, stockStatus: 'in_stock', ...extra })

test('recommends complementary current-store products rather than copies of list items', () => {
  const list = [product('item', 'bread')]
  const catalog = [
    product('item', 'bread'),
    product('cheese', 'dairy_eggs'),
    product('other-bread', 'bread'),
    product('soap', 'household'),
  ]
  assert.deepEqual(selectShoppingRecommendations({ items: list, catalog }).map((p) => p.ean), ['cheese'])
})

test('retailer candidates are capped at two of five and still need relevance and stock', () => {
  const list = [product('item', 'bread')]
  const catalog = [
    product('organic-1', 'dairy_eggs'), product('organic-2', 'deli'), product('organic-3', 'sauces_spices'),
    product('paid-1', 'dairy_eggs'), product('paid-2', 'deli'), product('paid-3', 'sauces_spices'),
    product('unrelated', 'household'), product('sold-out', 'dairy_eggs', { stockStatus: 'out_of_stock' }),
  ]
  const selected = selectShoppingRecommendations({ items: list, catalog, promotedEans: ['paid-1', 'paid-2', 'paid-3', 'unrelated', 'sold-out'] })
  assert.equal(selected.length, 5)
  assert.equal(selected.filter((item) => item.ean.startsWith('paid-')).length, 2)
  assert.ok(selected.every((item) => item.ean !== 'unrelated' && item.ean !== 'sold-out'))
})

test('dangerous Fit-Check products do not appear even when the store selects them', () => {
  const list = [product('item', 'bread')]
  const catalog = [product('unsafe', 'dairy_eggs', { allergens: ['milk'] }), product('safe', 'deli')]
  const selected = selectShoppingRecommendations({ items: list, catalog, promotedEans: ['unsafe'], profile: { allergens: ['milk'] } })
  assert.deepEqual(selected.map((item) => item.ean), ['safe'])
})

test('fills all five slots with organic products when store candidates are absent', () => {
  const list = [product('item', 'bread')]
  const catalog = Array.from({ length: 6 }, (_, index) => product(`organic-${index}`, 'dairy_eggs'))
  const selected = selectShoppingRecommendations({ items: list, catalog })
  assert.equal(selected.length, 5)
})
