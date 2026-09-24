import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCompareEventPayload } from '../../src/domain/product/compareAnalytics.js'

test('buildCompareEventPayload produces a clean row for a real verdict', () => {
  const payload = buildCompareEventPayload({
    storeId: '11111111-1111-1111-1111-111111111111',
    userId: '22222222-2222-2222-2222-222222222222',
    eanA: '4601751002907',
    eanB: '4870209471118',
    status: 'winner',
    winnerSide: 'B',
    primaryReason: 'nutrition',
    lang: 'ru',
  })

  assert.deepEqual(payload, {
    store_id: '11111111-1111-1111-1111-111111111111',
    user_id: '22222222-2222-2222-2222-222222222222',
    ean_a: '4601751002907',
    ean_b: '4870209471118',
    status: 'winner',
    winner_side: 'B',
    primary_reason: 'nutrition',
    lang: 'ru',
  })
})

test('buildCompareEventPayload drops noise states (same_product, not_found, missing inputs)', () => {
  assert.equal(buildCompareEventPayload({ status: 'same_product' }), null)
  assert.equal(buildCompareEventPayload({ status: 'not_found' }), null)
  assert.equal(buildCompareEventPayload({}), null)
  assert.equal(
    buildCompareEventPayload({ eanA: '1', eanB: '2', status: 'winner' }),
    null,
    'storeId is required'
  )
})

test('buildCompareEventPayload normalises lang and rejects unknown statuses', () => {
  const payload = buildCompareEventPayload({
    storeId: 'a',
    eanA: '1',
    eanB: '2',
    status: 'draw',
    lang: 'kk',
  })

  assert.equal(payload.lang, 'ru')
  assert.equal(payload.status, 'draw')
})

test('buildCompareEventPayload rejects invalid winnerSide values', () => {
  const payload = buildCompareEventPayload({
    storeId: 'a',
    eanA: '1',
    eanB: '2',
    status: 'winner',
    winnerSide: 'C',
  })

  assert.equal(payload.winner_side, null)
})