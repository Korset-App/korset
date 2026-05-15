import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGeneralAIFollowUps } from '../../src/domain/ai/followUps.js'

const catalogContext = [
  {
    ean: '1',
    name: 'Шоколад халал без сахара',
    category: 'sweets',
    priceKzt: 760,
    stockStatus: 'in_stock',
    halalStatus: 'yes',
    dietTags: ['sugar_free'],
  },
  {
    ean: '2',
    name: 'Печенье классическое',
    category: 'sweets',
    priceKzt: 520,
    stockStatus: 'low_stock',
    halalStatus: 'unknown',
  },
]

test('buildGeneralAIFollowUps suggests useful next actions for matched catalog products', () => {
  assert.deepEqual(
    buildGeneralAIFollowUps({
      query: 'Покажи халал сладости без сахара',
      catalogContext,
      lang: 'ru',
    }),
    ['Только халал', 'Показать дешевле', 'Сравнить варианты']
  )
})

test('buildGeneralAIFollowUps reacts to allergy profile without overloading chips', () => {
  assert.deepEqual(
    buildGeneralAIFollowUps({
      query: 'Что купить к чаю?',
      catalogContext,
      profile: { allergens: ['milk'] },
      lang: 'ru',
    }),
    ['Без моих аллергенов', 'Что проверить на упаковке?', 'Показать дешевле']
  )
})

test('buildGeneralAIFollowUps gives honest recovery chips when catalog context is empty', () => {
  assert.deepEqual(
    buildGeneralAIFollowUps({
      query: 'Покажи манго',
      catalogContext: [],
      lang: 'ru',
    }),
    ['Попробовать другой запрос', 'Что есть в этом магазине?', 'Показать товары по категории']
  )
})

test('buildGeneralAIFollowUps localizes Kazakh chips', () => {
  assert.deepEqual(
    buildGeneralAIFollowUps({
      query: 'халал тәттілер',
      catalogContext,
      lang: 'kz',
    }),
    ['Тек халал', 'Арзанырақ көрсету', 'Нұсқаларды салыстыру']
  )
})
