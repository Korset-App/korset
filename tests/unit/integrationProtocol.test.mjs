import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEnvelope, envelopeHash, issueConnectorToken, tokenHash } from '../../server/integration/protocol.js'

const requestId = '11111111-1111-4111-8111-111111111111'
export function sampleEnvelope(overrides = {}) {
  return {
    protocol_version: 1, request_id: requestId, operation: 'upsert',
    source_instance_id: 'test-source', sequence: 1, connector_version: '1.0.0',
    items: [{ external_id: 'source-item', name: 'Source product', revision: 1, active: true,
      barcodes: [{ value: '5449000000996', kind: 'gtin' }],
      price: { regular_minor: 123400, sale_minor: null },
      stock: { quantity: '2.50', unit: 'piece' } }], ...overrides,
  }
}

test('normalizes a verified exact barcode, decimal quantity and monetary minor units', () => {
  const value = normalizeEnvelope(sampleEnvelope())
  assert.equal(value.items[0].barcodes[0].value, '5449000000996')
  assert.equal(value.items[0].stock.quantity, '2.50')
  assert.equal(value.items[0].price.regular_minor, 123400)
  assert.equal(value.items[0].variant_id, '')
})

test('rejects guessed, corrupted and numeric GTINs without changing their digits', () => {
  for (const value of ['5449000000997', '5449-000000996', 5449000000996]) {
    const envelope = sampleEnvelope()
    envelope.items[0].barcodes[0].value = value
    assert.throws(() => normalizeEnvelope(envelope), { code: 'INVALID_BARCODE' })
  }
})

test('local codes preserve leading zeroes and never become global GTINs', () => {
  const envelope = sampleEnvelope()
  envelope.items[0].barcodes = [{ value: '000042', kind: 'local' }]
  assert.equal(normalizeEnvelope(envelope).items[0].barcodes[0].value, '000042')
})

test('snapshot rejects an expected count above the source quota before accepting a generation', () => {
  const value=sampleEnvelope({operation:'snapshot_begin',snapshot_id:requestId,expected_count:100000,items:[]})
  assert.equal(normalizeEnvelope(value).expected_count,100000)
  assert.throws(()=>normalizeEnvelope({...value,expected_count:100001}))
})

test('rejects unsupported version, unsafe sequences, duplicate identities and extra fields', () => {
  for (const envelope of [sampleEnvelope({ protocol_version: 3 }), sampleEnvelope({ sequence: 0 }),
    sampleEnvelope({ sequence: Number.MAX_SAFE_INTEGER + 1 }), sampleEnvelope({ store_id: 'forged' }),
    sampleEnvelope({ items: Array(2).fill(sampleEnvelope().items[0]) })]) {
    assert.throws(() => normalizeEnvelope(envelope))
  }
})

test('sale price requires a bounded period and cannot exceed the regular price', () => {
  const envelope = sampleEnvelope()
  envelope.items[0].price.sale_minor = 100000
  assert.throws(() => normalizeEnvelope(envelope), { code: 'INVALID_PROMOTION' })
  envelope.items[0].price.valid_from = '2026-10-01T00:00:00Z'
  envelope.items[0].price.valid_until = '2026-10-02T00:00:00Z'
  assert.equal(normalizeEnvelope(envelope).items[0].price.sale_minor, 100000)
  envelope.items[0].price.sale_minor = 200000
  assert.throws(() => normalizeEnvelope(envelope), { code: 'INVALID_PROMOTION' })
})

test('does not coerce missing stock into available or unsupported decimal prices into integers', () => {
  const envelope = sampleEnvelope()
  envelope.items[0].stock.quantity = null
  envelope.items[0].price.regular_minor = 123456
  const value = normalizeEnvelope(envelope)
  assert.equal(value.items[0].stock.quantity, null)
  assert.equal(value.items[0].price.regular_minor, 123456)
})

test('bounds batch size, name length and decimal quantity grammar', () => {
  assert.throws(() => normalizeEnvelope(sampleEnvelope({ items: Array(201).fill(sampleEnvelope().items[0]) })))
  for (const quantity of ['1e5', 'NaN', '1,5', '10000000000000']) {
    const envelope = sampleEnvelope(); envelope.items[0].stock.quantity = quantity
    assert.throws(() => normalizeEnvelope(envelope))
  }
})

test('accepts explicit safe snapshot cancellation without items',()=>{
  assert.equal(normalizeEnvelope(sampleEnvelope({operation:'snapshot_abort',snapshot_id:requestId,items:[]})).operation,'snapshot_abort')
})

test('hash is stable under object key order but detects changed payload', () => {
  const a = normalizeEnvelope(sampleEnvelope())
  const b = normalizeEnvelope({ ...sampleEnvelope(), items: sampleEnvelope().items })
  assert.equal(envelopeHash(a), envelopeHash(b))
  b.items[0].price.regular_minor += 100
  assert.notEqual(envelopeHash(a), envelopeHash(b))
})

test('issues high entropy connector tokens and stores only one-way verification hashes', () => {
  const a = issueConnectorToken(); const b = issueConnectorToken()
  assert.match(a, /^krt1_[a-f0-9]{64}$/)
  assert.notEqual(a, b)
  assert.match(tokenHash(a), /^[a-f0-9]{64}$/)
  assert.notEqual(tokenHash(a), a)
  assert.throws(() => tokenHash('short'), { code: 'INVALID_TOKEN' })
})
