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
