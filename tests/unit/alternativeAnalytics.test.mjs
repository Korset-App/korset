import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAlternativeEventInsert,
  trackAlternativeEvent,
} from '../../src/utils/alternativeAnalytics.js'

test('trackAlternativeEvent returns metadata-only frontend event', () => {
  const event = trackAlternativeEvent('alternatives_compare_clicked', {
    storeId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    storeSlug: 'store-one',
    sourceEan: '4601751002907',
    alternativeEan: '4870209471118',
    scenario: 'cheaper',
    alternativesCount: 4,
    profile: { allergens: ['milk'] },
    message: 'private text',
  })

  assert.equal(event.type, 'alternatives_compare_clicked')
  assert.equal(event.storeId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  assert.equal(event.storeSlug, 'store-one')
  assert.equal(event.sourceEan, '4601751002907')
  assert.equal(event.alternativeEan, '4870209471118')
  assert.equal(event.scenario, 'cheaper')
  assert.equal(event.alternativesCount, 4)
  assert.equal('profile' in event, false)
  assert.equal('message' in event, false)
})

test('buildAlternativeEventInsert allows only safe rows for persistence', () => {
  const row = buildAlternativeEventInsert({
    type: 'alternatives_ai_help_clicked',
    storeId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    sourceEan: '4601751002907',
    alternativeEan: null,
    scenario: 'fits_me',
    alternativesCount: 5,
    clientToken: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  })

  assert.deepEqual(row, {
    event_type: 'alternatives_ai_help_clicked',
    store_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    source_ean: '4601751002907',
    candidate_ean: null,
    scenario: 'fits_me',
    alternatives_count: 5,
    client_token: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  })
})

test('buildAlternativeEventInsert rejects unknown events and invalid EANs', () => {
  assert.equal(
    buildAlternativeEventInsert({
      type: 'unknown',
      storeId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      sourceEan: '4601751002907',
      clientToken: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    }),
    null
  )

  assert.equal(
    buildAlternativeEventInsert({
      type: 'alternatives_product_opened',
      storeId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      sourceEan: 'not-ean',
      alternativeEan: '4870209471118',
      clientToken: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    }),
    null
  )
})
