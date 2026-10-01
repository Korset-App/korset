import test from 'node:test'
import assert from 'node:assert/strict'
import { applySyncedConditions } from '../../src/domain/product/syncedConditions.js'
import { hydrateSyncedConditions } from '../../src/utils/syncedConditions.js'
import { coerceProductEntity } from '../../src/domain/product/normalizers.js'

const now = '2026-10-01T12:00:00.000Z'
const row = {
  ean: '5449000000996', regular_minor: 100000, sale_minor: 80000,
  valid_from: '2026-10-01T11:00:00.000Z', valid_until: '2026-10-01T13:00:00.000Z',
  applied_at: now, unit: 'piece',
}
const product = { ean: row.ean, priceKzt: 1000, oldPriceKzt: 1200, discountPercent: 17 }

test('active sale uses exact minor price and derives discount', () => {
  const result = applySyncedConditions(product, row, now)
  assert.equal(result.priceKzt, 800)
  assert.equal(result.oldPriceKzt, 1000)
  assert.equal(result.discountPercent, 20)
  assert.equal(result.syncConditions.sale_minor, 80000)
})

test('fractional tenge sale keeps exact minor units', () => {
  const result = applySyncedConditions(product, { ...row, sale_minor: 80025 }, now)
  assert.equal(result.priceKzt, 800.25)
})

test('sale expires at exact valid_until boundary', () => {
  const result = applySyncedConditions(product, row, row.valid_until)
  assert.equal(result.priceKzt, 1000)
  assert.equal(result.oldPriceKzt, null)
  assert.equal(result.discountPercent, null)
})

test('future and null promotions show regular price', () => {
  assert.equal(applySyncedConditions(product, { ...row, valid_from: '2026-10-01T12:01:00.000Z' }, now).priceKzt, 1000)
  assert.equal(applySyncedConditions(product, { ...row, sale_minor: null }, now).oldPriceKzt, null)
})

test('stale condition marks warning without extending expired promotion', () => {
  const result = applySyncedConditions(product, { ...row, applied_at: '2026-10-01T11:29:59.000Z' }, now)
  assert.equal(result.conditionsStale, true)
  assert.equal(applySyncedConditions(result, undefined, row.valid_until).priceKzt, 1000)
})

test('manual product stays unchanged without conditions', () => {
  assert.strictEqual(applySyncedConditions(product, undefined, now), product)
})

test('hydration joins exact EAN and leaves unmatched products intact', async () => {
  const other = { ean: 'LOCAL-TEST-unmatched', priceKzt: 500 }
  const result = await hydrateSyncedConditions('store', [product, other], {
    now,
    rpc: async (_name, args) => {
      assert.deepEqual(args.p_eans, [row.ean, other.ean])
      return { data: [row] }
    },
  })
  assert.equal(result[0].priceKzt, 800)
  assert.strictEqual(result[1], other)
})

test('cached expired promotion recalculates when RPC is unavailable', async () => {
  const cached = applySyncedConditions(product, row, now)
  const result = await hydrateSyncedConditions('store', [cached], {
    now: row.valid_until,
    rpc: async () => ({ error: new Error('offline') }),
  })
  assert.equal(result[0].priceKzt, 1000)
  assert.equal(result[0].oldPriceKzt, null)
})

test('serialized cached product keeps raw conditions through normalization', () => {
  const saved = structuredClone(applySyncedConditions(product, row, now))
  const restored = coerceProductEntity(saved)
  assert.equal(restored.syncConditions.sale_minor, 80000)
  assert.equal(applySyncedConditions(restored, undefined, row.valid_until).priceKzt, 1000)
})

test('revoked promotion response clears cached sale', async () => {
  const cached = applySyncedConditions(product, row, now)
  const [result] = await hydrateSyncedConditions('store', [cached], {
    now,
    rpc: async () => ({ data: [] }),
  })
  assert.equal(result.priceKzt, 1000)
  assert.equal(result.oldPriceKzt, null)
  assert.equal(result.syncConditions, null)
})

test('unavailable metadata does not promise a cached sale', async () => {
  const cached = applySyncedConditions(product, row, now)
  const [result] = await hydrateSyncedConditions('store', [cached], {
    now,
    rpc: async () => ({ error: new Error('offline') }),
  })
  assert.equal(result.priceKzt, 1000)
  assert.equal(result.oldPriceKzt, null)
})

test('a failed chunk cannot revoke a promotion from another chunk', async () => {
  const products = Array.from({ length: 501 }, (_, index) => ({
    ean: `LOCAL-TEST-${index}`, priceKzt: 1000,
  }))
  const lastRow = { ...row, ean: products[500].ean }
  products[500] = applySyncedConditions(products[500], lastRow, now)
  let calls = 0
  const result = await hydrateSyncedConditions('store', products, {
    now,
    rpc: async () => (++calls === 1 ? { data: [] } : { error: new Error('offline') }),
  })
  assert.equal(calls, 2)
  assert.equal(result[500].priceKzt, 1000)
  assert.equal(result[500].syncConditions.ean, lastRow.ean)
})
