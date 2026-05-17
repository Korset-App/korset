import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateAIResponseQuality } from '../../src/domain/ai/qualityEvaluator.js'

test('evaluateAIResponseQuality passes a grounded store-scoped answer', () => {
  const result = evaluateAIResponseQuality({
    reply:
      'По данным этого магазина лучше взять рис и морковь ниже. Они есть в наличии, а по цене укладываются в запрос.',
    productGroups: [
      {
        products: [
          { ean: '4870000000011', name: 'Рис' },
          { ean: '4870000000022', name: 'Морковь' },
        ],
      },
    ],
    storeProductEans: ['4870000000011', '4870000000022', '4870000000033'],
  })

  assert.equal(result.status, 'pass')
  assert.equal(result.score, 100)
  assert.deepEqual(result.issues, [])
})

test('evaluateAIResponseQuality fails internal confidence label leakage', () => {
  const result = evaluateAIResponseQuality({
    reply: 'Этот товар likely_compatible, но halalConfidence не confirmed_halal.',
    productGroups: [],
  })

  assert.equal(result.status, 'fail')
  assert.equal(result.score < 70, true)
  assert.equal(result.issues.some((issue) => issue.code === 'internal_label_leak'), true)
})

test('evaluateAIResponseQuality fails internal catalog field leakage', () => {
  const result = evaluateAIResponseQuality({
    reply: 'Тауар in_stock, stockStatus жақсы, priceKzt 820.',
  })

  assert.equal(result.status, 'fail')
  assert.equal(result.issues.some((issue) => issue.code === 'internal_label_leak'), true)
})

test('evaluateAIResponseQuality fails products outside the active store', () => {
  const result = evaluateAIResponseQuality({
    reply: 'Вот хорошие варианты из этого магазина.',
    productGroups: [
      {
        products: [
          { ean: '4870000000011', name: 'Рис' },
          { ean: '4870000000099', name: 'Манго' },
        ],
      },
    ],
    storeProductEans: ['4870000000011'],
  })

  assert.equal(result.status, 'fail')
  assert.equal(result.issues.some((issue) => issue.code === 'outside_store_product'), true)
})

test('evaluateAIResponseQuality flags unsafe positive allergy wording', () => {
  const result = evaluateAIResponseQuality({
    reply: 'Да, товар безопасный и подходит вам.',
    warnings: ['allergy_direct_match'],
  })

  assert.equal(result.status, 'fail')
  assert.equal(result.issues.some((issue) => issue.code === 'unsafe_allergy_wording'), true)
})

test('evaluateAIResponseQuality flags uncontrolled external lookup wording', () => {
  const result = evaluateAIResponseQuality({
    reply: 'Я нашел в интернете состав этого товара, поэтому можно считать его точным.',
    allowExternalData: false,
  })

  assert.equal(result.status, 'review')
  assert.equal(result.issues.some((issue) => issue.code === 'uncontrolled_external_data'), true)
})

test('evaluateAIResponseQuality allows marked external data when explicitly enabled', () => {
  const result = evaluateAIResponseQuality({
    reply:
      'По внешним источникам состав может быть таким, но данные могут отличаться от упаковки. Проверьте маркировку.',
    allowExternalData: true,
  })

  assert.equal(result.status, 'pass')
  assert.equal(result.issues.some((issue) => issue.code === 'uncontrolled_external_data'), false)
})

test('evaluateAIResponseQuality flags visible markdown formatting', () => {
  const result = evaluateAIResponseQuality({
    reply: '**Рис** и *морковь* подойдут. Проверьте цену на карточке.',
  })

  assert.equal(result.status, 'review')
  assert.equal(result.issues.some((issue) => issue.code === 'visible_markdown'), true)
})

test('evaluateAIResponseQuality flags missing next step when required', () => {
  const result = evaluateAIResponseQuality({
    reply: 'В этом магазине вижу рис и морковь для плова.',
    requireNextStep: true,
  })

  assert.equal(result.status, 'review')
  assert.equal(result.issues.some((issue) => issue.code === 'missing_next_step'), true)
})

test('evaluateAIResponseQuality accepts a compact answer with next step', () => {
  const result = evaluateAIResponseQuality({
    reply:
      'Для плова подойдут рис и морковь из этого магазина. Могу дальше показать более дешевый набор или варианты без аллергенов.',
    requireNextStep: true,
  })

  assert.equal(result.status, 'pass')
  assert.equal(result.issues.some((issue) => issue.code === 'missing_next_step'), false)
})
