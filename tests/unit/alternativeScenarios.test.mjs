import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAlternativeEmptyStateKeys,
  getAlternativeReasonKey,
  getAlternativeScenarioLabelKey,
} from '../../src/domain/product/alternativeScenarios.js'

test('getAlternativeScenarioLabelKey returns i18n keys for supported scenarios', () => {
  assert.equal(getAlternativeScenarioLabelKey('similar'), 'alternatives.scenario.similar')
  assert.equal(getAlternativeScenarioLabelKey('fits_me'), 'alternatives.scenario.fitsMe')
  assert.equal(getAlternativeScenarioLabelKey('cheaper'), 'alternatives.scenario.cheaper')
  assert.equal(
    getAlternativeScenarioLabelKey('better_composition'),
    'alternatives.scenario.betterComposition'
  )
  assert.equal(getAlternativeScenarioLabelKey('unknown'), 'alternatives.scenario.similar')
})

test('getAlternativeReasonKey prefers scenario-specific and safety reasons', () => {
  assert.equal(
    getAlternativeReasonKey({
      scenario: 'cheaper',
      alternative: { alternativeMeta: { priceDeltaKzt: -150, rankReason: 'same_group' } },
    }),
    'alternatives.reason.cheaper'
  )
  assert.equal(
    getAlternativeReasonKey({
      scenario: 'fits_me',
      alternative: { alternativeMeta: { profileRisk: 'ok', rankReason: 'same_group' } },
    }),
    'alternatives.reason.fitsProfile'
  )
  assert.equal(
    getAlternativeReasonKey({
      scenario: 'better_composition',
      alternative: { alternativeMeta: { compositionIncomplete: false } },
    }),
    'alternatives.reason.betterComposition'
  )
  assert.equal(
    getAlternativeReasonKey({
      scenario: 'similar',
      alternative: {
        stockStatus: 'out_of_stock',
        alternativeMeta: { rankReason: 'same_group' },
      },
    }),
    'alternatives.reason.outOfStock'
  )
})

test('getAlternativeReasonKey falls back to relation reasons', () => {
  assert.equal(
    getAlternativeReasonKey({
      alternative: { alternativeMeta: { rankReason: 'same_group' } },
    }),
    'alternatives.reason.sameGroup'
  )
  assert.equal(
    getAlternativeReasonKey({
      alternative: { alternativeMeta: { rankReason: 'same_subcategory' } },
    }),
    'alternatives.reason.sameSubcategory'
  )
  assert.equal(
    getAlternativeReasonKey({
      alternative: { alternativeMeta: { rankReason: 'same_category' } },
    }),
    'alternatives.reason.sameCategory'
  )
})

test('getAlternativeEmptyStateKeys returns scenario-specific empty copy keys', () => {
  assert.deepEqual(getAlternativeEmptyStateKeys('cheaper'), {
    titleKey: 'alternatives.empty.cheaper.title',
    bodyKey: 'alternatives.empty.cheaper.body',
  })
  assert.deepEqual(getAlternativeEmptyStateKeys('unknown'), {
    titleKey: 'alternatives.empty.similar.title',
    bodyKey: 'alternatives.empty.similar.body',
  })
})
