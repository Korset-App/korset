import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCatalogPages } from '../../src/domain/catalog/catalogPageLoader.js'

test('loads pages using the last store EAN as a cursor', async () => {
  const requested = []
  const pages = [
    [{ ean: '111', name: 'A' }, { ean: '222', name: 'B' }],
    [{ ean: '333', name: 'C' }],
  ]
  const snapshots = []
  const rows = await loadCatalogPages({
    pageSize: 2,
    fetchPage: async (cursor, size) => {
      requested.push([cursor, size])
      return { data: pages.shift(), error: null }
    },
    onPage: (page, total) => snapshots.push([page.map((row) => row.ean), total]),
  })

  assert.deepEqual(requested, [[null, 2], ['222', 2]])
  assert.deepEqual(rows.map((row) => row.ean), ['111', '222', '333'])
  assert.deepEqual(snapshots, [[['111', '222'], 2], [['333'], 3]])
})

test('stops without publishing a page when loading was cancelled', async () => {
  let cancelled = false
  let published = false
  const rows = await loadCatalogPages({
    pageSize: 2,
    fetchPage: async () => {
      cancelled = true
      return { data: [{ ean: '111' }], error: null }
    },
    isCancelled: () => cancelled,
    onPage: () => { published = true },
  })

  assert.deepEqual(rows, [])
  assert.equal(published, false)
})

test('rejects a page that does not advance the cursor', async () => {
  const pages = [[{ ean: '111' }], [{ ean: '111' }]]
  await assert.rejects(
    loadCatalogPages({ pageSize: 1, fetchPage: async () => ({ data: pages.shift(), error: null }) }),
    /cursor/i
  )
})
