import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PRODUCT_CORRECTION_REASONS,
  buildProductCorrectionPayload,
  canSubmitProductCorrectionReport,
  normalizeProductCorrectionReason,
} from '../../src/domain/product/correctionReports.js'

test('correction reason contract contains scan identity and product data issues', () => {
  assert.ok(PRODUCT_CORRECTION_REASONS.includes('wrong_product'))
  assert.ok(PRODUCT_CORRECTION_REASONS.includes('wrong_weight_or_volume'))
  assert.ok(PRODUCT_CORRECTION_REASONS.includes('wrong_halal'))
  assert.ok(PRODUCT_CORRECTION_REASONS.includes('wrong_ingredients'))
  assert.equal(normalizeProductCorrectionReason('wrong_product'), 'wrong_product')
  assert.equal(normalizeProductCorrectionReason('bad_reason'), 'other')
})

test('buildProductCorrectionPayload stores metadata only', () => {
  const payload = buildProductCorrectionPayload({
    reason: 'wrong_product',
    comment: '  This is not the scanned product  ',
    ean: '4870035005035',
    storeId: 'store-1',
    context: 'product_card',
    clientToken: '00000000-0000-4000-8000-000000000001',
    product: {
      ean: '4870035007932',
      name: 'Wrong product',
      sourceMeta: {
        globalProductId: 'global-1',
        storeProductId: 'store-product-1',
      },
      ingredients: 'must not be stored',
      allergens: ['must_not_store'],
    },
  })

  assert.equal(payload.reason, 'wrong_product')
  assert.equal(payload.comment, 'This is not the scanned product')
  assert.equal(payload.ean, '4870035005035')
  assert.equal(payload.shown_ean, '4870035007932')
  assert.equal(payload.shown_global_product_id, 'global-1')
  assert.equal(payload.shown_store_product_id, 'store-product-1')
  assert.deepEqual(payload.metadata_json, { shownProductName: 'Wrong product' })
  assert.equal('ingredients' in payload, false)
  assert.equal('allergens' in payload, false)
})

test('buildProductCorrectionPayload truncates long comments and metadata names', () => {
  const payload = buildProductCorrectionPayload({
    reason: 'other',
    comment: 'a'.repeat(700),
    ean: '4870035005035',
    clientToken: '00000000-0000-4000-8000-000000000001',
    product: { name: 'b'.repeat(300) },
  })

  assert.equal(payload.comment.length, 500)
  assert.equal(payload.metadata_json.shownProductName.length, 160)
})

test('canSubmitProductCorrectionReport requires scannable EAN and client token', () => {
  assert.equal(
    canSubmitProductCorrectionReport({
      ean: '4870035005035',
      clientToken: '00000000-0000-4000-8000-000000000001',
    }),
    true
  )
  assert.equal(
    canSubmitProductCorrectionReport({ ean: 'arbuz_123', clientToken: 'token' }),
    false
  )
  assert.equal(canSubmitProductCorrectionReport({ ean: '4870035005035', clientToken: null }), false)
})
