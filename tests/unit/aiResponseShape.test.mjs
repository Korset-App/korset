import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAIProductGroups, normalizeAIResponse } from '../../src/domain/ai/responseShape.js'

const candidates = [
  {
    ean: '1',
    name: 'Рис Лидер',
    brand: 'Лидер',
    category: 'grocery',
    subcategory: 'rice',
    priceKzt: 890,
    stockStatus: 'in_stock',
    image: 'rice.webp',
  },
  {
    ean: '2',
    name: 'Морковь мытая',
    brand: '',
    category: 'fruits_veg',
    subcategory: 'vegetables',
    priceKzt: 350,
    stockStatus: 'low_stock',
  },
  {
    ean: '3',
    name: 'Шоколад халал',
    category: 'sweets',
    subcategory: 'chocolate',
    priceKzt: 760,
    stockStatus: 'in_stock',
  },
]

test('buildAIProductGroups creates compact grouped products from candidates', () => {
  const groups = buildAIProductGroups(candidates)

  assert.equal(groups.length, 3)
  assert.deepEqual(groups[0], {
    id: 'grocery:rice',
    title: 'Рис',
    products: [
      {
        ean: '1',
        name: 'Рис Лидер',
        brand: 'Лидер',
        category: 'grocery',
        subcategory: 'rice',
        group: '',
        priceKzt: 890,
        stockStatus: 'in_stock',
        image: 'rice.webp',
        quantity: '',
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

  assert.equal(groups[0].title, 'Рис')
  assert.equal(groups[1].title, 'Овощи')
  assert.equal(groups[2].title, 'Шоколад')
})

test('buildAIProductGroups prioritizes products explicitly mentioned in assistant reply', () => {
  const groups = buildAIProductGroups(
    [
      {
        ean: '1',
        name: 'Гранола манго-ананас',
        brand: 'granolife',
        category: 'grocery',
        subcategory: 'breakfast',
        priceKzt: 1200,
      },
      {
        ean: '2',
        name: 'Доместос цитрусовая свежесть',
        brand: 'Domestos',
        category: 'household',
        subcategory: 'cleaning',
        priceKzt: 300,
      },
      {
        ean: '3',
        name: 'Напиток манго-тропиканго',
        brand: 'Моя семья',
        category: 'water_beverages',
        subcategory: 'juice',
        priceKzt: 300,
      },
      {
        ean: '4',
        name: 'Нектар манго',
        brand: 'ABC',
        category: 'water_beverages',
        subcategory: 'juice',
        priceKzt: 350,
      },
    ],
    {
      replyText: 'Вижу напиток манго-тропиканго «Моя семья» и нектар манго ABC.',
    }
  )

  const eans = groups.flatMap((group) => group.products.map((product) => product.ean))
  assert.deepEqual(eans, ['3', '4'])
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
