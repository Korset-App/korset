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

test('calculateDiscountPercent and calculateDiscountedPrice handle edge cases', async () => {
  const {
    calculateDiscountPercent,
    calculateDiscountedPrice,
  } = await import('../../../src/domain/retail/catalogManagement.js')

  // Normal discount calculations
  assert.equal(calculateDiscountPercent(750, 1000), 25)
  assert.equal(calculateDiscountedPrice(1000, 25), 750)

  // Inverted or zero prices
  assert.equal(calculateDiscountPercent(1000, 750), null)
  assert.equal(calculateDiscountPercent(0, 500), null)
  assert.equal(calculateDiscountPercent(500, 0), null)
  assert.equal(calculateDiscountedPrice(0, 20), null)
  assert.equal(calculateDiscountedPrice(500, 100), null)
})

test('validatePromotionPayload formats promotion fields and auto-calculates discount', async () => {
  const { validatePromotionPayload } = await import('../../../src/domain/retail/catalogManagement.js')

  // Featuring product with no discount
  const res1 = validatePromotionPayload({ isFeatured: true, currentPrice: 500 })
  assert.deepEqual(res1, {
    is_featured: true,
    old_price_kzt: null,
    discount_percent: null,
  })

  // Providing old price auto-calculates percentage
  const res2 = validatePromotionPayload({
    isFeatured: true,
    oldPriceKzt: 800,
    currentPrice: 600,
  })
  assert.deepEqual(res2, {
    is_featured: true,
    old_price_kzt: 800,
    discount_percent: 25,
  })

  // Invalid old price (lower than current price) gets cleared
  const res3 = validatePromotionPayload({
    isFeatured: false,
    oldPriceKzt: 400,
    currentPrice: 600,
  })
  assert.deepEqual(res3, {
    is_featured: false,
    old_price_kzt: null,
    discount_percent: null,
  })
})
