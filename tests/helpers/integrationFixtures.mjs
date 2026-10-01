export const STORE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
export const PRODUCT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
export function envelope(sequence = 1, changes = {}) {
  return { protocol_version: 1, request_id: `11111111-1111-4111-8111-${String(sequence).padStart(12, '0')}`,
    operation: 'upsert', source_instance_id: 'test-source', sequence, connector_version: '1.0.0',
    items: [{ external_id: 'source-item', variant_id: '', unit_id: 'unit', name: 'Source product',
      revision: sequence, active: true, barcodes: [{ value: '5449000000996', kind: 'gtin' }],
      price: { regular_minor: 123400, sale_minor: null }, stock: { quantity: '2.50', unit: 'piece' } }], ...changes }
}
