import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildProductCorrectionStatusUpdate,
  buildProductCorrectionReviewSummary,
  canTransitionProductCorrectionStatus,
  normalizeProductCorrectionReviewEvent,
} from '../../src/domain/product/correctionReview.js'

test('normalizeProductCorrectionReviewEvent keeps correction queue metadata safe and readable', () => {
  const event = normalizeProductCorrectionReviewEvent({
    id: 'event-1',
    ean: '4870035005035',
    shown_ean: '4870035007932',
    reason: 'wrong_product',
    context: 'scan_result',
    status: 'new',
    comment: '  Wrong milk fat percent  ',
    metadata_json: {
      shownProductName: 'Milk 2.5%',
      allergens: ['must_not_leak'],
    },
    created_at: '2026-06-08T10:00:00.000Z',
  })

  assert.deepEqual(event, {
    id: 'event-1',
    ean: '4870035005035',
    shownEan: '4870035007932',
    reason: 'wrong_product',
    reasonGroup: 'identity',
    context: 'scan_result',
    status: 'new',
    comment: 'Wrong milk fat percent',
    shownProductName: 'Milk 2.5%',
    createdAt: '2026-06-08T10:00:00.000Z',
  })
})

test('buildProductCorrectionReviewSummary prioritizes open identity reports', () => {
  const summary = buildProductCorrectionReviewSummary([
    { reason: 'wrong_product', status: 'new', created_at: '2026-06-08T10:00:00.000Z' },
    { reason: 'wrong_price', status: 'reviewing', created_at: '2026-06-08T11:00:00.000Z' },
    { reason: 'wrong_halal', status: 'fixed', created_at: '2026-06-08T12:00:00.000Z' },
    { reason: 'other', status: 'new', created_at: '2026-06-08T09:00:00.000Z' },
  ])

  assert.deepEqual(summary, {
    total: 4,
    open: 3,
    newCount: 2,
    identityCount: 1,
    dataQualityCount: 2,
    resolvedCount: 1,
    latestAt: '2026-06-08T12:00:00.000Z',
  })
})

test('canTransitionProductCorrectionStatus allows only forward review transitions', () => {
  assert.equal(canTransitionProductCorrectionStatus('new', 'reviewing'), true)
  assert.equal(canTransitionProductCorrectionStatus('new', 'fixed'), true)
  assert.equal(canTransitionProductCorrectionStatus('reviewing', 'duplicate'), true)
  assert.equal(canTransitionProductCorrectionStatus('fixed', 'reviewing'), false)
  assert.equal(canTransitionProductCorrectionStatus('duplicate', 'new'), false)
  assert.equal(canTransitionProductCorrectionStatus('new', 'trusted'), false)
})

test('buildProductCorrectionStatusUpdate creates metadata-only status payload', () => {
  const payload = buildProductCorrectionStatusUpdate({
    currentStatus: 'new',
    nextStatus: 'fixed',
    reviewerAuthId: '00000000-0000-4000-8000-000000000001',
  })

  assert.equal(payload.ok, true)
  assert.equal(payload.update.status, 'fixed')
  assert.equal(payload.update.reviewed_by_auth_id, '00000000-0000-4000-8000-000000000001')
  assert.match(payload.update.reviewed_at, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(payload.update.resolution_json, { action: 'fixed' })
  assert.equal('product_ean_aliases' in payload.update, false)
  assert.equal('trusted' in payload.update, false)
})

test('buildProductCorrectionStatusUpdate rejects invalid transitions', () => {
  const payload = buildProductCorrectionStatusUpdate({
    currentStatus: 'fixed',
    nextStatus: 'reviewing',
    reviewerAuthId: '00000000-0000-4000-8000-000000000001',
  })

  assert.deepEqual(payload, { ok: false, reason: 'invalid_transition' })
})
