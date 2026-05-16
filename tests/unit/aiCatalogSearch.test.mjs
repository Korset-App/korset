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
    ean: '6b',
    name: 'Чипсы кукурузно-рисовые со вкусом оливкового масла',
    brand: 'Snack',
    category: 'snacks',
    subcategory: 'chips',
    priceKzt: 1250,
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
  {
    ean: '9',
    name: 'Доместос цитрусовая свежесть',
    brand: 'Domestos',
    category: 'household',
    subcategory: 'cleaning',
    priceKzt: 300,
    stockStatus: 'in_stock',
  },
  {
    ean: '10',
    name: 'Пастила яблочная',
    brand: 'Sweet',
    category: 'sweets',
    subcategory: 'candy',
    priceKzt: 900,
    stockStatus: 'in_stock',
    halalStatus: 'unknown',
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
  assert.equal(resultEans.includes('6b'), false)
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
  assert.equal(result.some((product) => product.category === 'snacks'), false)
  assert.equal(result.some((product) => product.category === 'healthy'), false)
})

test('findCatalogCandidates suggests child-appropriate snacks without caffeine or household noise', () => {
  const result = findCatalogCandidates(
    'что можно ребёнку на перекус?',
    [
      ...products,
      {
        ean: '12',
        name: 'Сок детский яблочный',
        category: 'water_beverages',
        subcategory: 'juice',
        priceKzt: 420,
        stockStatus: 'in_stock',
        ingredients: 'яблочный сок',
      },
      {
        ean: '13',
        name: 'Энергетик манго',
        category: 'water_beverages',
        subcategory: 'energy',
        priceKzt: 500,
        stockStatus: 'in_stock',
      },
    ],
    null,
    { limit: 8 }
  )

  assert.equal(result[0].ean, '12')
  assert.equal(result.some((product) => product.ean === '13'), false)
  assert.equal(result.some((product) => product.category === 'household'), false)
})

test('findCatalogCandidates understands meat-free protein requests', () => {
  const result = findCatalogCandidates(
    'что взять без мяса, но с белком?',
    [
      ...products,
      {
        ean: '14',
        name: 'Яйца куриные',
        category: 'dairy_eggs',
        subcategory: 'eggs',
        priceKzt: 920,
        stockStatus: 'in_stock',
      },
      {
        ean: '15',
        name: 'Нут консервированный',
        category: 'grocery',
        subcategory: 'beans',
        priceKzt: 680,
        stockStatus: 'in_stock',
      },
    ],
    null,
    { limit: 8 }
  )

  const resultEans = result.map((product) => product.ean)
  assert.equal(resultEans.includes('8'), false)
  assert.equal(resultEans.includes('14'), true)
  assert.equal(resultEans.includes('15'), true)
})

test('findCatalogCandidates prioritizes explicit sugar-free products for tea snacks', () => {
  const result = findCatalogCandidates(
    'есть что-нибудь без сахара к чаю?',
    [
      ...products,
      {
        ean: '16',
        name: 'Печенье к чаю',
        category: 'sweets',
        subcategory: 'cookies',
        priceKzt: 550,
        stockStatus: 'in_stock',
        halalStatus: 'unknown',
      },
    ],
    null,
    { limit: 8 }
  )

  assert.equal(result[0].ean, '3')
  assert.equal(result.some((product) => product.ean === '16'), false)
})

test('findCatalogCandidates builds breakfast sets from current-store breakfast categories', () => {
  const result = findCatalogCandidates(
    'собери завтрак на двоих до 3000 ₸',
    [
      ...products,
      {
        ean: '17',
        name: 'Овсяные хлопья',
        category: 'grocery',
        subcategory: 'breakfast',
        priceKzt: 850,
        stockStatus: 'in_stock',
      },
      {
        ean: '18',
        name: 'Бананы',
        category: 'fruits_veg',
        subcategory: 'fruits',
        priceKzt: 780,
        stockStatus: 'in_stock',
      },
    ],
    null,
    { limit: 8 }
  )

  const resultEans = result.map((product) => product.ean)
  assert.equal(resultEans.includes('17'), true)
  assert.equal(resultEans.includes('18'), true)
  assert.equal(result.some((product) => product.priceKzt > 3000), false)
  assert.equal(result.some((product) => product.category === 'household'), false)
})

test('findCatalogCandidates keeps halal sweets inside sweets category when certification is missing', () => {
  const result = findCatalogCandidates('покажите халал-сладости', products, null, { limit: 8 })

  assert.ok(result.length > 0)
  assert.equal(result.every((product) => product.category === 'sweets'), true)
  assert.equal(result.some((product) => product.ean === '1'), false)
})

test('findCatalogCandidates ignores generic stop words for mango queries', () => {
  const result = findCatalogCandidates(
    'есть манго?',
    [
      ...products,
      {
        ean: '11',
        name: 'Напиток манго-тропиканго',
        brand: 'Моя семья',
        category: 'water_beverages',
        subcategory: 'juice',
        priceKzt: 300,
        stockStatus: 'in_stock',
      },
    ],
    null,
    { limit: 8 }
  )

  assert.equal(result[0].ean, '11')
  assert.equal(result.some((product) => product.ean === '9'), false)
})

test('buildCatalogAIContext returns compact candidate facts for prompts', () => {
  const context = buildCatalogAIContext(findCatalogCandidates('рис', products), { maxItems: 1 })

  assert.deepEqual(context, [
    {
      ean: '1',
      name: 'Рис Лидер круглозерный',
      brand: 'Лидер',
      category: 'grains',
      subcategory: '',
      group: '',
      priceKzt: 890,
      stockStatus: 'in_stock',
      halalStatus: 'yes',
      dietTags: ['vegan'],
      allergens: [],
      image: null,
      quantity: '',
    },
  ])
})
