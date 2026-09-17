import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateManualProductPayload,
  buildStoreProductUpsertPayload,
} from '../../../src/domain/retail/catalogManagement.js'

test('validateManualProductPayload validates barcode length', () => {
  assert.equal(validateManualProductPayload({ ean: '123' }).ok, false)
  assert.equal(validateManualProductPayload({ ean: '4870001234567', priceKzt: 450 }).ok, true)
  assert.equal(validateManualProductPayload({ ean: '12345678', priceKzt: 200 }).ok, true)
})

test('validateManualProductPayload validates price', () => {
  assert.equal(
    validateManualProductPayload({ ean: '4870001234567', priceKzt: -50 }).ok,
    false
  )
  assert.equal(
    validateManualProductPayload({ ean: '4870001234567', priceKzt: 'invalid' }).ok,
    false
  )
  assert.equal(
    validateManualProductPayload({ ean: '4870001234567', priceKzt: '450.6' }).value.priceKzt,
    451
  )
})

test('buildStoreProductUpsertPayload formats payload correctly', () => {
  const payload = buildStoreProductUpsertPayload({
    storeId: 'store-123',
    ean: '4870001234567',
    priceKzt: 550,
    globalProductId: 'gp-999',
    localName: 'Молоко Адал 3.2%',
  })

  assert.equal(payload.store_id, 'store-123')
  assert.equal(payload.ean, '4870001234567')
  assert.equal(payload.price_kzt, 550)
  assert.equal(payload.global_product_id, 'gp-999')
  assert.equal(payload.local_name, 'Молоко Адал 3.2%')
  assert.equal(payload.stock_status, 'in_stock')
  assert.equal(payload.is_active, true)
})
