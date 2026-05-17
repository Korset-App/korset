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

test('buildProductPrompt keeps internal confidence labels out of user-facing wording', () => {
  const prompt = buildProductPrompt(
    {
      ean: '4870000000002',
      name: 'Желейные конфеты',
      ingredients: 'сахар, желатин, ароматизатор',
      halalStatus: 'unknown',
      allergens: [],
      stockStatus: 'in_stock',
    },
    { halalOnly: true },
    'ru',
    null,
    { name: 'MARS' }
  )

  assert.match(prompt, /Не показывай пользователю внутренние названия confidence labels/)
  assert.match(prompt, /В ответе не пиши внутренние labels/)
  assert.match(prompt, /служебные метки, а не текст для покупателя/)
})

test('buildProductPrompt keeps direct allergy alternatives strict and fact-grounded', () => {
  const prompt = buildProductPrompt(
    {
      ean: '4870000000003',
      name: 'Печенье с молоком',
      ingredients: 'мука, сухое молоко',
      halalStatus: 'unknown',
      allergens: ['milk'],
      stockStatus: 'in_stock',
      alternatives: [{ name: 'Печенье без молока', priceKzt: 810 }],
    },
    { allergens: ['milk'], halalOnly: true },
    'ru',
    null,
    { name: 'MARS', aiStoreNotes: 'Есть отдельная полка с халал-сладостями.' }
  )

  assert.match(prompt, /прямое совпадение с аллергеном/)
  assert.match(prompt, /не смягчай рекомендацию/)
  assert.match(prompt, /Не приписывай альтернативам полку/)
  assert.match(prompt, /основной совет — не брать этот товар/)
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
