import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCatalogAIContext, findCatalogCandidates } from '../../src/domain/ai/catalogSearch.js'

const products = [
  {
    ean: '1',
    name: 'Рис Лидер круглозерный',
    brand: 'Лидер',
    category: 'grains',
    priceKzt: 890,
    stockStatus: 'in_stock',
    halalStatus: 'yes',
    dietTags: ['vegan'],
  },
  {
    ean: '2',
    name: 'Молоко 3.2%',
    brand: 'Dairy',
    category: 'dairy',
    priceKzt: 520,
    allergens: ['milk'],
    stockStatus: 'in_stock',
  },
  {
    ean: '3',
    name: 'Шоколад халал без сахара',
    brand: 'Sweet',
    category: 'sweets',
    priceKzt: 760,
    halalStatus: 'yes',
    dietTags: ['sugar_free'],
    stockStatus: 'low_stock',
  },
  {
    ean: '4',
    name: 'Рис премиум',
    brand: 'Gold',
    category: 'grains',
    priceKzt: 1200,
    stockStatus: 'out_of_stock',
  },
  {
    ean: '5',
    name: 'Морковь мытая',
    brand: '',
    category: 'vegetables',
    priceKzt: 340,
    stockStatus: 'in_stock',
  },
  {
    ean: '6',
    name: 'Масло подсолнечное',
    brand: 'Dala',
    category: 'grocery',
    subcategory: 'cooking_oil',
    priceKzt: 980,
    stockStatus: 'in_stock',
  },
  {
    ean: '7',
    name: 'Йогурт без лактозы',
    brand: 'Dairy',
    category: 'dairy',
    priceKzt: 690,
    allergens: ['milk'],
    dietTags: ['lactose_free'],
    stockStatus: 'in_stock',
  },
  {
    ean: '8',
    name: 'Куриное филе',
    brand: 'Local',
    category: 'meat',
    priceKzt: 2300,
    stockStatus: 'in_stock',
  },
]

test('findCatalogCandidates matches product names and prefers available cheaper items', () => {
  const result = findCatalogCandidates('нужен рис для плова', products)

  assert.equal(result[0].ean, '1')
  assert.equal(result[1].ean, '4')
})

test('findCatalogCandidates matches halal and diet tags', () => {
  const result = findCatalogCandidates('покажите халал сладости без сахара', products)

  assert.equal(result[0].ean, '3')
})

test('findCatalogCandidates excludes user allergens when profile is provided', () => {
  const result = findCatalogCandidates('что купить без молока', products, {
    allergens: ['milk'],
  })

  assert.equal(result.some((p) => p.ean === '2'), false)
})

test('findCatalogCandidates understands recipe intents such as plov', () => {
  const result = findCatalogCandidates('собери продукты для плова', products, null, { limit: 6 })
  const resultEans = result.map((product) => product.ean)

  assert.deepEqual(resultEans.slice(0, 3), ['1', '5', '6'])
  assert.equal(resultEans.includes('3'), false)
})

test('findCatalogCandidates understands lactose-free intent without excluding matching dairy', () => {
  const result = findCatalogCandidates('что есть без лактозы', products, {
    allergens: ['milk'],
  })

  assert.equal(result[0].ean, '7')
  assert.equal(result.some((product) => product.ean === '2'), false)
})

test('findCatalogCandidates applies budget intent before generic cheaper boost', () => {
  const result = findCatalogCandidates('что купить на ужин до 1000 тенге', products, null, {
    limit: 8,
  })

  assert.equal(result.some((product) => product.ean === '8'), false)
  assert.equal(result[0].priceKzt <= 1000, true)
})

test('buildCatalogAIContext returns compact candidate facts for prompts', () => {
  const context = buildCatalogAIContext(findCatalogCandidates('рис', products), { maxItems: 1 })

  assert.deepEqual(context, [
    {
      ean: '1',
      name: 'Рис Лидер круглозерный',
      brand: 'Лидер',
      category: 'grains',
      priceKzt: 890,
      stockStatus: 'in_stock',
      halalStatus: 'yes',
      dietTags: ['vegan'],
      allergens: [],
    },
  ])
})
