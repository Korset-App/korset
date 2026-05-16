import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProductPrompt } from '../../api/ai.js'

test('buildProductPrompt includes strict product safety and uncertainty guardrails', () => {
  const prompt = buildProductPrompt(
    {
      ean: '4870204070018',
      name: 'Йогурт клубничный',
      brand: 'Demo',
      ingredients: '',
      halalStatus: 'unknown',
      allergens: ['milk'],
      stockStatus: 'in_stock',
      priceKzt: 890,
      alternatives: [{ name: 'Йогурт без лактозы', priceKzt: 760 }],
    },
    { allergens: ['milk'], halalOnly: true, halalStrict: true },
    'ru',
    'E-additives context',
    { name: 'MARS', address: 'Almaty' }
  )

  assert.match(prompt, /Не называй товар безопасным/)
  assert.match(prompt, /Халал-статус unknown/)
  assert.match(prompt, /сильных аллергиях/)
  assert.match(prompt, /Не выдумывай цену/)
  assert.match(prompt, /Альтернативы предлагай только из блока/)
  assert.match(prompt, /АЛЬТЕРНАТИВЫ В ЭТОМ МАГАЗИНЕ/)
})

test('buildProductPrompt includes balanced halal confidence guidance instead of helpless unknown-only wording', () => {
  const prompt = buildProductPrompt(
    {
      ean: '4870000000001',
      name: 'Шоколад молочный',
      brand: 'Demo',
      ingredients: 'молоко, сахар, какао-масло',
      halalStatus: 'unknown',
      allergens: ['milk'],
      stockStatus: 'in_stock',
      priceKzt: 990,
    },
    { halalOnly: true, allergens: [] },
    'ru',
    null,
    { name: 'MARS' }
  )

  assert.match(prompt, /likely_compatible/)
  assert.match(prompt, /явных запрещённых компонентов не видно/)
  assert.match(prompt, /сертификат не указан/)
  assert.match(prompt, /не делай вид, что AI полностью беспомощен/)
})

test('buildProductPrompt localizes the answer language instruction', () => {
  const prompt = buildProductPrompt(
    {
      name: 'Сүт',
      ingredients: 'milk',
      halalStatus: 'yes',
      allergens: [],
      stockStatus: 'in_stock',
    },
    null,
    'kz',
    null,
    null
  )

  assert.match(prompt, /Отвечай на казахском языке/)
})
