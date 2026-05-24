import test from 'node:test'
import assert from 'node:assert/strict'

import { getFitBadgeMeta, resolveFitSeverityKey } from '../../src/domain/product/fitVerdict.js'

test('resolveFitSeverityKey preserves warning and caution verdicts', () => {
  assert.equal(resolveFitSeverityKey({ verdict: 'warning', fits: false, reasons: [] }), 'warning')
  assert.equal(resolveFitSeverityKey({ verdict: 'caution', fits: false, reasons: [] }), 'caution')
})

test('resolveFitSeverityKey falls back to reason severity before legacy reason type', () => {
  assert.equal(
    resolveFitSeverityKey({
      fits: false,
      reasons: [{ severity: 'warning', type: 'fail' }],
    }),
    'warning'
  )
  assert.equal(
    resolveFitSeverityKey({
      fits: false,
      reasons: [{ severity: 'caution', type: 'fail' }],
    }),
    'caution'
  )
})

test('getFitBadgeMeta returns 4-level badge metadata', () => {
  assert.deepEqual(getFitBadgeMeta('safe'), {
    key: 'safe',
    icon: 'check_circle',
    labelKey: 'fit.verdict.safe',
  })
  assert.deepEqual(getFitBadgeMeta('caution'), {
    key: 'caution',
    icon: 'warning',
    labelKey: 'fit.verdict.caution',
  })
  assert.deepEqual(getFitBadgeMeta('warning'), {
    key: 'warning',
    icon: 'error_outline',
    labelKey: 'fit.verdict.warning',
  })
  assert.deepEqual(getFitBadgeMeta('danger'), {
    key: 'danger',
    icon: 'cancel',
    labelKey: 'fit.verdict.danger',
  })
})
