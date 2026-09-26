import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLocalScanHistoryEntry,
  dedupeLocalScanHistory,
  filterLocalScanHistoryAcrossStores,
  filterLocalScanHistoryByStore,
} from '../../src/utils/localHistory.js'

const history = [
  { ean: '4870000000001', storeId: 'store-a', scanDate: '2026-09-01T10:00:00.000Z' },
  { ean: '4870000000001', storeId: 'store-b', scanDate: '2026-09-02T10:00:00.000Z' },
  { ean: '4870000000002', storeId: null, scanDate: '2026-09-03T10:00:00.000Z' },
  { ean: '4870000000001', storeId: 'store-a', scanDate: '2026-09-04T10:00:00.000Z' },
]

test('filters scan history for one store including its duplicate EAN only', () => {
  assert.deepEqual(
    filterLocalScanHistoryByStore(history, 'store-a').map((item) => item.scanDate),
    ['2026-09-04T10:00:00.000Z']
  )
  assert.deepEqual(
    filterLocalScanHistoryByStore(history, null).map((item) => item.ean),
    ['4870000000002']
  )
})

test('local scan entries keep a valid status for later cloud synchronization', () => {
  const storeEntry = buildLocalScanHistoryEntry({ ean: '4870000000001', source: 'cache' }, 'found_store', 'store-a')
  const legacyEntry = buildLocalScanHistoryEntry({ ean: '4870000000002', source: 'cache' }, 'scan', 'store-a')
  assert.equal(storeEntry.source, 'found_store')
  assert.equal(legacyEntry.source, 'found_cache')
})

test('all-store history dedupes by store and EAN, keeping the newest scan', () => {
  const result = filterLocalScanHistoryAcrossStores(history)

  assert.equal(result.length, 3)
  assert.deepEqual(
    result.map(({ storeId, ean }) => `${storeId || 'global'}:${ean}`),
    ['store-a:4870000000001', 'global:4870000000002', 'store-b:4870000000001']
  )
  assert.equal(result[0].scanDate, '2026-09-04T10:00:00.000Z')
})

test('dedupes synchronized entries by store and EAN while preserving cross-store scans', () => {
  assert.equal(dedupeLocalScanHistory(history).length, 3)
})
