import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEnvelope } from '../../server/integration/protocol.js'
import { envelope } from '../helpers/integrationFixtures.mjs'

function completeEnvelope() {
  const value = envelope()
  value.protocol_version = 2
  value.items[0].currency = 'KZT'
  value.items[0].observed_at = '2026-10-01T12:00:00Z'
  return value
}

test('missing codes and an invalid item kind remain row issues without rejecting its neighbor',()=>{
  const value=completeEnvelope()
  value.items.push({...value.items[0],external_id:'bad-data',barcodes:null,item_kind:'bad'})
  const rows=normalizeEnvelope(value).items
  assert.equal(rows.length,2);assert.deepEqual(rows[0].validation_issues,[])
  assert.ok(rows[1].validation_issues.includes('INVALID_BARCODE'))
  assert.ok(rows[1].validation_issues.includes('INVALID_ITEM_KIND'))
  assert.equal(rows[1].raw_values.barcodes,null);assert.equal(rows[1].raw_values.item_kind,'bad')
})

test('complete protocol preserves weighted quantity and exact monetary units', () => {
  const value = completeEnvelope()
  value.items[0].stock = { quantity: '5.250', unit: 'kg' }
  value.items[0].price.regular_minor = 123456
  const normalized = normalizeEnvelope(value)
  assert.equal(normalized.protocol_version, 2)
  assert.equal(normalized.items[0].currency, 'KZT')
  assert.equal(normalized.items[0].stock.quantity, '5.250')
  assert.deepEqual(normalized.items[0].validation_issues, [])
})

test('one corrupted product barcode is preserved for review without rejecting its valid neighbour', () => {
  const value = completeEnvelope()
  value.items.push({ ...value.items[0], external_id: 'bad-code', barcodes: [{ value: '5449000000997', kind: 'gtin' }] })
  const normalized = normalizeEnvelope(value)
  assert.equal(normalized.items.length, 2)
  assert.deepEqual(normalized.items[0].validation_issues, [])
  assert.deepEqual(normalized.items[1].barcodes, [])
  assert.ok(normalized.items[1].validation_issues.includes('INVALID_BARCODE'))
  assert.equal(normalized.items[1].raw_values.barcodes[0].value, '5449000000997')
})

test('unknown stock and unsupported currency remain separate product issues without claiming availability', () => {
  const value = completeEnvelope()
  value.items[0].currency = 'RUB'
  value.items[0].stock.quantity = null
  const normalized = normalizeEnvelope(value).items[0]
  assert.equal(normalized.price.regular_minor, null)
  assert.equal(normalized.stock.quantity, null)
  assert.ok(normalized.validation_issues.includes('INVALID_CURRENCY'))
  assert.ok(normalized.validation_issues.includes('STOCK_UNKNOWN'))
  assert.equal(normalized.raw_values.currency, 'RUB')
})

test('numeric barcode is never repaired into an allegedly exact barcode', () => {
  const value = completeEnvelope()
  value.items[0].barcodes = [{ value: 5449000000996, kind: 'gtin' }]
  const normalized = normalizeEnvelope(value).items[0]
  assert.deepEqual(normalized.barcodes, [])
  assert.equal(normalized.raw_values.barcodes[0].value, 5449000000996)
})

test('invalid stable identity still rejects the delivery rather than acknowledging unaddressable data', () => {
  const value = completeEnvelope()
  value.items[0].external_id = ''
  assert.throws(() => normalizeEnvelope(value), { code: 'INVALID_PAYLOAD' })
})
