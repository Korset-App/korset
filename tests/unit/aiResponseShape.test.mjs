import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAIProductGroups,
  buildProductAIResponseMeta,
  normalizeAIResponse,
} from '../../src/domain/ai/responseShape.js'

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
    verdict: { label: 'good_option', title: 'Выглядит подходящим вариантом', tone: 'positive' },
    confidenceNotes: ['По данным карточки явных рисков не вижу.'],
    checkOnPackage: ['Следы аллергенов'],
    alternatives: [{ ean: '4', name: 'Alt', priceKzt: 500, stockStatus: 'in_stock' }],
    ragUsed: true,
  })

  assert.equal(response.reply, 'Нашёл товары в каталоге.')
  assert.equal(response.productGroups.length, 3)
  assert.deepEqual(response.followUps, ['Сделать дешевле', 'Только халал'])
  assert.deepEqual(response.warnings, ['Цена может отличаться на кассе'])
  assert.equal(response.verdict.label, 'good_option')
  assert.deepEqual(response.confidenceNotes, ['По данным карточки явных рисков не вижу.'])
  assert.deepEqual(response.checkOnPackage, ['Следы аллергенов'])
  assert.equal(response.alternatives[0].ean, '4')
  assert.equal(response.ragUsed, true)
})

test('normalizeAIResponse accepts legacy string replies', () => {
  assert.deepEqual(normalizeAIResponse('Ответ'), {
    reply: 'Ответ',
    productGroups: [],
    followUps: [],
    warnings: [],
    verdict: null,
    confidenceNotes: [],
    checkOnPackage: [],
    alternatives: [],
    ragUsed: false,
  })
})

test('buildProductAIResponseMeta marks direct allergy match as choose another', () => {
  const meta = buildProductAIResponseMeta({
    product: {
      ean: '1',
      name: 'Milk',
      ingredients: 'milk',
      allergens: ['milk'],
      alternatives: [],
    },
    profile: { allergens: ['milk'] },
    alternatives: [{ ean: '2', name: 'Oat drink', stockStatus: 'in_stock' }],
  })

  assert.equal(meta.verdict.label, 'choose_another')
  assert.equal(meta.verdict.tone, 'danger')
  assert.ok(meta.warnings.includes('allergy_direct_match'))
  assert.ok(meta.checkOnPackage.includes('Следы аллергенов'))
  assert.equal(meta.alternatives[0].ean, '2')
})

test('buildProductAIResponseMeta keeps likely halal useful without fake certification', () => {
  const meta = buildProductAIResponseMeta({
    product: {
      ean: '1',
      name: 'Rice',
      ingredients: 'rice, water, salt',
      halalStatus: 'unknown',
    },
    profile: { halalOnly: true },
  })

  assert.equal(meta.verdict.label, 'good_option')
  assert.ok(meta.checkOnPackage.includes('Halal-маркировку или сертификат'))
  assert.equal(meta.warnings.includes('not_halal'), false)
})

test('buildProductAIResponseMeta localizes product response metadata to Kazakh', () => {
  const meta = buildProductAIResponseMeta({
    product: {
      ean: '1',
      name: 'Product',
      halalStatus: 'unknown',
    },
    profile: { allergens: ['milk'], halalOnly: true },
    lang: 'kz',
  })

  assert.equal(meta.verdict.title, 'Қаптамадан тексеру керек')
  assert.ok(meta.checkOnPackage.includes('Құрамы мен тағамдық қоспалары'))
  assert.ok(meta.checkOnPackage.includes('Halal белгісі немесе сертификаты'))
})
