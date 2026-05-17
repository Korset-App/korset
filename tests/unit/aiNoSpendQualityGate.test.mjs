import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_NO_SPEND_QA_SCENARIOS,
  runNoSpendAIQualityGate,
} from '../../src/domain/ai/noSpendQualityGate.js'

test('DEFAULT_NO_SPEND_QA_SCENARIOS cover core RU/KZ AI quality areas', () => {
  const langs = new Set(DEFAULT_NO_SPEND_QA_SCENARIOS.map((scenario) => scenario.lang))
  const modes = new Set(DEFAULT_NO_SPEND_QA_SCENARIOS.map((scenario) => scenario.mode))
  const intents = new Set(DEFAULT_NO_SPEND_QA_SCENARIOS.map((scenario) => scenario.intent))

  assert.equal(langs.has('ru'), true)
  assert.equal(langs.has('kz'), true)
  assert.equal(modes.has('general'), true)
  assert.equal(modes.has('product'), true)

  for (const intent of [
    'meal_set',
    'budget',
    'halal',
    'allergy',
    'child_snack',
    'no_match',
    'alternatives',
    'missing_product_facts',
  ]) {
    assert.equal(intents.has(intent), true)
  }
})

test('runNoSpendAIQualityGate passes the default no-spend fixture pack', () => {
  const report = runNoSpendAIQualityGate()

  assert.equal(report.total, DEFAULT_NO_SPEND_QA_SCENARIOS.length)
  assert.equal(report.summary.fail, 0)
  assert.equal(report.summary.pass, DEFAULT_NO_SPEND_QA_SCENARIOS.length)
  assert.deepEqual(report.issueTags, {})
})

test('runNoSpendAIQualityGate groups failure tags from evaluator issues', () => {
  const report = runNoSpendAIQualityGate({
    scenarios: [
      {
        id: 'BAD-01',
        mode: 'general',
        lang: 'ru',
        intent: 'halal',
        prompt: 'Покажи халал-сладости',
        storeProductEans: ['4870000000011'],
        response: {
          reply: 'Этот товар likely_compatible и точно халал.',
          productGroups: [
            {
              products: [{ ean: '4870000000099', name: 'Outside product' }],
            },
          ],
        },
      },
      {
        id: 'BAD-02',
        mode: 'product',
        lang: 'ru',
        intent: 'allergy',
        prompt: 'Есть риск для аллергии?',
        response: {
          reply: 'Да, товар безопасный и можно брать.',
          warnings: ['allergy_direct_match'],
        },
      },
    ],
  })

  assert.equal(report.summary.fail, 2)
  assert.equal(report.issueTags.internal_label_leak, 1)
  assert.equal(report.issueTags.outside_store, 1)
  assert.equal(report.issueTags.unsafe_allergy, 1)
  assert.equal(report.results[0].tags.includes('internal_label_leak'), true)
  assert.equal(report.results[0].tags.includes('outside_store'), true)
})

test('runNoSpendAIQualityGate keeps review-level external data separate from critical failures', () => {
  const report = runNoSpendAIQualityGate({
    scenarios: [
      {
        id: 'REVIEW-01',
        mode: 'product',
        lang: 'ru',
        intent: 'missing_product_facts',
        prompt: 'Какой состав?',
        response: {
          reply: 'Я нашел в интернете состав и считаю его точным.',
        },
      },
    ],
  })

  assert.equal(report.summary.review, 1)
  assert.equal(report.summary.fail, 0)
  assert.equal(report.issueTags.external_data, 1)
})

test('runNoSpendAIQualityGate can require premium next-step behavior', () => {
  const report = runNoSpendAIQualityGate({
    scenarios: [
      {
        id: 'PREMIUM-01',
        mode: 'general',
        lang: 'ru',
        intent: 'meal_set',
        prompt: 'Соберите продукты для плова',
        requireNextStep: true,
        response: {
          reply: '**Рис** и морковь подходят для плова.',
        },
      },
    ],
  })

  assert.equal(report.summary.review, 1)
  assert.equal(report.summary.fail, 0)
  assert.equal(report.issueTags.visible_markdown, 1)
  assert.equal(report.issueTags.missing_next_step, 1)
})
