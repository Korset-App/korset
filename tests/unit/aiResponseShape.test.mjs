import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAIProductGroups, normalizeAIResponse } from '../../src/domain/ai/responseShape.js'

const candidates = [
  {
    ean: '1',
    name: 'Рис Лидер',
    brand: 'Лидер',
    category: 'grains',
    priceKzt: 890,
    stockStatus: 'in_stock',
    image: 'rice.webp',
  },
  {
    ean: '2',
    name: 'Морковь мытая',
    brand: '',
    category: 'vegetables',
    priceKzt: 350,
    stockStatus: 'low_stock',
  },
  {
    ean: '3',
    name: 'Шоколад халал',
    category: 'sweets',
    priceKzt: 760,
    stockStatus: 'in_stock',
  },
]

test('buildAIProductGroups creates compact grouped products from candidates', () => {
  const groups = buildAIProductGroups(candidates)

  assert.equal(groups.length, 3)
  assert.deepEqual(groups[0], {
    id: 'grains',
    title: 'Крупы и гарниры',
    products: [
      {
        ean: '1',
        name: 'Рис Лидер',
        brand: 'Лидер',
        category: 'grains',
        priceKzt: 890,
        stockStatus: 'in_stock',
        image: 'rice.webp',
      },
    ],
  })
})

test('buildAIProductGroups caps product groups and products per group', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({
    ean: String(i),
    name: `Товар ${i}`,
    category: i < 5 ? 'one' : `cat-${i}`,
  }))

  const groups = buildAIProductGroups(many, { maxGroups: 3, maxProductsPerGroup: 2 })

  assert.equal(groups.length, 3)
  assert.equal(groups[0].products.length, 2)
})

test('buildAIProductGroups uses shopper-readable titles for common categories', () => {
  const groups = buildAIProductGroups(candidates)

  assert.equal(groups[0].title, 'Крупы и гарниры')
  assert.equal(groups[1].title, 'Овощи и фрукты')
  assert.equal(groups[2].title, 'Сладости')
})

test('normalizeAIResponse keeps reply and attaches groups/follow ups', () => {
  const response = normalizeAIResponse({
    reply: 'Нашёл товары в каталоге.',
    productGroups: buildAIProductGroups(candidates),
    followUps: ['Сделать дешевле', 'Только халал'],
    warnings: ['Цена может отличаться на кассе'],
    ragUsed: true,
  })

  assert.equal(response.reply, 'Нашёл товары в каталоге.')
  assert.equal(response.productGroups.length, 3)
  assert.deepEqual(response.followUps, ['Сделать дешевле', 'Только халал'])
  assert.deepEqual(response.warnings, ['Цена может отличаться на кассе'])
  assert.equal(response.ragUsed, true)
})

test('normalizeAIResponse accepts legacy string replies', () => {
  assert.deepEqual(normalizeAIResponse('Ответ'), {
    reply: 'Ответ',
    productGroups: [],
    followUps: [],
    warnings: [],
    ragUsed: false,
  })
})
