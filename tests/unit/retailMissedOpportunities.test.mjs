import test from 'node:test'
import assert from 'node:assert/strict'
import { getMissedOpportunitiesPage } from '../../src/domain/retail/missedOpportunities.js'

function clientWith({
  rpcRows = [],
  storeRows = [],
  globalRows = [],
  rpcError,
  storeError,
  globalError,
} = {}) {
  const calls = []
  const client = {
    rpc: async (name, args) => {
      calls.push({ kind: 'rpc', name, args })
      return { data: rpcRows, error: rpcError }
    },
    from: (table) => {
      const filters = []
      const query = {
        select: (fields) => {
          calls.push({ kind: 'select', table, fields })
          return query
        },
        eq: (field, value) => {
          filters.push({ field, value })
          return query
        },
        in: (field, values) => {
          calls.push({ kind: 'in', table, field, values, filters })
          return Promise.resolve(
            table === 'store_products'
              ? { data: storeRows, error: storeError }
              : { data: globalRows, error: globalError }
          )
        },
      }
      return query
    },
  }
  return { client, calls }
}

test('calls the three-argument RPC and maps exact EAN matches to screen fields', async () => {
  const { client, calls } = clientWith({
    rpcRows: [
      { ean: 'opaque-a', miss_count: 8, name: 'RPC A' },
      { ean: 'opaque-b', miss_count: 3, name: 'RPC B' },
      { ean: 'opaque-c', miss_count: 2, name: 'RPC C' },
    ],
    storeRows: [
      { ean: 'opaque-b', stock_status: 'out_of_stock' },
      { ean: 'opaque-c', stock_status: 'in_stock' },
    ],
    globalRows: [
      { ean: 'opaque-a', name: 'Global A', image_url: 'image-a' },
      { ean: 'opaque-b', name: 'Global B', image_url: 'image-b' },
    ],
  })

  const result = await getMissedOpportunitiesPage(client, 'store-x', 7, 5)
  assert.deepEqual(result, {
    items: [
      {
        ean: 'opaque-a',
        scan_count: 8,
        name: 'Global A',
        image_url: 'image-a',
        reason: 'not_in_catalog',
      },
      {
        ean: 'opaque-b',
        scan_count: 3,
        name: 'Global B',
        image_url: 'image-b',
        reason: 'out_of_stock',
      },
    ],
    hasMore: false,
    limit: 5,
  })
  assert.deepEqual(calls[0], {
    kind: 'rpc',
    name: 'get_missed_opportunities',
    args: { p_store_id: 'store-x', p_days_back: 7, p_limit: 6 },
  })
  assert.deepEqual(
    calls
      .filter((call) => call.kind === 'in')
      .map(({ table, field, values, filters }) => ({ table, field, values, filters })),
    [
      {
        table: 'store_products',
        field: 'ean',
        values: ['opaque-a', 'opaque-b', 'opaque-c'],
        filters: [
          { field: 'store_id', value: 'store-x' },
          { field: 'is_active', value: true },
        ],
      },
      {
        table: 'global_products',
        field: 'ean',
        values: ['opaque-a', 'opaque-b', 'opaque-c'],
        filters: [{ field: 'is_active', value: true }],
      },
    ]
  )
})

test('bounds results and reports more rows without hydrating the sentinel', async () => {
  const { client, calls } = clientWith({
    rpcRows: [
      { ean: 'opaque-a', miss_count: 4 },
      { ean: 'opaque-b', miss_count: 3 },
      { ean: 'opaque-c', miss_count: 2 },
    ],
  })
  const result = await getMissedOpportunitiesPage(client, 'store-x', 30, 2)
  assert.equal(result.hasMore, true)
  assert.equal(result.items.length, 2)
  assert.deepEqual(
    calls.filter((call) => call.kind === 'in').map((call) => call.values),
    [
      ['opaque-a', 'opaque-b'],
      ['opaque-a', 'opaque-b'],
    ]
  )
})

test('ignores empty EANs without issuing empty hydration queries', async () => {
  const { client, calls } = clientWith({ rpcRows: [{ ean: '', miss_count: 2 }] })
  const result = await getMissedOpportunitiesPage(client, 'store-x', 7)
  assert.deepEqual(result.items, [])
  assert.equal(calls.length, 1)
})

test('caps the request size and preserves database error details', async () => {
  const { client, calls } = clientWith({ rpcError: { code: 'PGRST203', message: 'ambiguous' } })
  await assert.rejects(
    getMissedOpportunitiesPage(client, 'store-x', 7, 500),
    (error) => error.code === 'PGRST203' && error.message === 'ambiguous'
  )
  assert.equal(calls[0].args.p_limit, 101)
})

test('propagates RPC and hydration errors instead of treating rows as absent', async () => {
  const rpc = clientWith({ rpcError: { code: 'PGRST203', message: 'ambiguous' } })
  await assert.rejects(getMissedOpportunitiesPage(rpc.client, 'store-x', 7), /ambiguous/)
  assert.equal(rpc.calls.length, 1)

  const store = clientWith({
    rpcRows: [{ ean: 'opaque-a', miss_count: 1 }],
    storeError: { message: 'store read failed' },
  })
  await assert.rejects(getMissedOpportunitiesPage(store.client, 'store-x', 7), /store read failed/)

  const global = clientWith({
    rpcRows: [{ ean: 'opaque-a', miss_count: 1 }],
    globalError: { message: 'global read failed' },
  })
  await assert.rejects(
    getMissedOpportunitiesPage(global.client, 'store-x', 7),
    /global read failed/
  )
})
