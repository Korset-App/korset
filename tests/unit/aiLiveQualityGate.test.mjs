import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_LIVE_QA_SCENARIOS,
  getLiveQAScenarios,
  summarizeLiveQAResults,
} from '../../src/domain/ai/liveQualityGate.js'

test('DEFAULT_LIVE_QA_SCENARIOS include RU/KZ and general/product coverage', () => {
  const langs = new Set(DEFAULT_LIVE_QA_SCENARIOS.map((scenario) => scenario.lang))
  const modes = new Set(DEFAULT_LIVE_QA_SCENARIOS.map((scenario) => scenario.mode))
  const ids = new Set(DEFAULT_LIVE_QA_SCENARIOS.map((scenario) => scenario.id))

  assert.equal(langs.has('ru'), true)
  assert.equal(langs.has('kz'), true)
  assert.equal(modes.has('general'), true)
  assert.equal(modes.has('product'), true)
  assert.equal(ids.has('L-G-01'), true)
  assert.equal(ids.has('L-KZ-P-01'), true)
})

test('getLiveQAScenarios filters by ids and limit without mutating defaults', () => {
  const selected = getLiveQAScenarios({ ids: ['L-G-01', 'L-P-02'], limit: 1 })

  assert.equal(selected.length, 1)
  assert.equal(selected[0].id, 'L-G-01')
  assert.equal(DEFAULT_LIVE_QA_SCENARIOS.length >= 10, true)
})

test('summarizeLiveQAResults groups pass review fail and issue tags', () => {
  const summary = summarizeLiveQAResults([
    {
      id: 'A',
      evaluation: { status: 'pass', issues: [] },
    },
    {
      id: 'B',
      evaluation: {
        status: 'review',
        issues: [{ code: 'uncontrolled_external_data' }],
      },
    },
    {
      id: 'C',
      evaluation: {
        status: 'fail',
        issues: [{ code: 'unsafe_allergy_wording' }, { code: 'internal_label_leak' }],
      },
    },
  ])

  assert.equal(summary.total, 3)
  assert.equal(summary.pass, 1)
  assert.equal(summary.review, 1)
  assert.equal(summary.fail, 1)
  assert.equal(summary.issueTags.external_data, 1)
  assert.equal(summary.issueTags.unsafe_allergy, 1)
  assert.equal(summary.issueTags.internal_label_leak, 1)
})
