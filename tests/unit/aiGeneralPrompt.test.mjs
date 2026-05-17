import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGeneralPrompt } from '../../api/ai.js'

test('buildGeneralPrompt includes premium store-scoped answer contract', () => {
  const prompt = buildGeneralPrompt(
    'ru',
    { name: 'MARS', slug: 'store-one' },
    [
      {
        ean: '1',
        name: 'Рис Лидер',
        brand: 'Лидер',
        category: 'grains',
        subcategory: 'rice',
        priceKzt: 890,
        stockStatus: 'in_stock',
      },
      {
        ean: '2',
        name: 'Морковь мытая',
        category: 'fruits_veg',
        subcategory: 'vegetables',
        priceKzt: 340,
        stockStatus: 'in_stock',
      },
    ]
  )

  assert.match(prompt, /только из переданного каталога текущего магазина/)
  assert.match(prompt, /не повторяй в тексте весь список товаров/)
  assert.match(prompt, /объясни, почему группы товаров подходят под запрос/)
  assert.match(prompt, /предложи следующий шаг/)
  assert.match(prompt, /если подходящих товаров не видно/)
  assert.match(prompt, /stockStatus, in_stock, out_of_stock, priceKzt/)
  assert.doesNotMatch(prompt, /наличие: in_stock/)
  assert.match(prompt, /наличие: есть в наличии/)
  assert.match(prompt, /Не используй markdown-разметку/)
  assert.match(prompt, /без \*\*/)
})

test('buildGeneralPrompt adds cautious child-snack guidance', () => {
  const prompt = buildGeneralPrompt(
    'ru',
    { name: 'MARS', slug: 'store-one' },
    [
      {
        ean: '1',
        name: 'Батончик ореховый',
        category: 'snacks',
        priceKzt: 520,
        stockStatus: 'in_stock',
      },
    ]
  )

  assert.match(prompt, /Для детских перекусов/)
  assert.match(prompt, /не ставь орехи, кофеин, энергетики/)
  assert.match(prompt, /если аллергии и возраст неизвестны/)
})

test('buildGeneralPrompt gives honest no-match contract when catalog context is empty', () => {
  const prompt = buildGeneralPrompt('ru', { name: 'MARS' }, [])

  assert.match(prompt, /не вижу подходящих товаров в каталоге этого магазина/)
  assert.match(prompt, /не предлагай товары вне текущего магазина/)
})
