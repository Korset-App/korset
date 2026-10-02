import test from 'node:test'
import assert from 'node:assert/strict'

test('a failed lookup still waits for the camera to stop before rejecting', async () => {
  const { lookupScanWhileStopping } = await import('../../src/screens/scanner/scanFlow.js')
  let release
  let settled = false
  const stopping = new Promise((resolve) => { release = resolve })
  const result = lookupScanWhileStopping({
    lookup: () => Promise.reject(new Error('network failure')),
    stop: () => stopping,
  }).catch((error) => { settled = true; return error.message })
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(settled, false)
  release()
  assert.equal(await result, 'network failure')
})
import * as scanFlow from '../../src/screens/scanner/scanFlow.js'

import {
  buildRecentScanEntry,
  getManualEanError,
  getNextCompareState,
  normalizeManualEan,
  upsertRecentScan,
} from '../../src/screens/scanner/scanFlow.js'

test('product lookup starts before camera shutdown finishes', async () => {
  assert.equal(typeof scanFlow.lookupScanWhileStopping, 'function')
  let finishStop
  const stopping = new Promise((resolve) => { finishStop = resolve })
  let lookupStarted = false
  const work = scanFlow.lookupScanWhileStopping({
    lookup: async () => { lookupStarted = true; return { product: { name: 'fixture' } } },
    stop: () => stopping,
    timeoutMs: 50,
  })
  assert.equal(lookupStarted, true)
  finishStop()
  assert.equal((await work).result.product.name, 'fixture')
})

test('a slow scan lookup remains available after navigation deadline', async () => {
  assert.equal(typeof scanFlow.lookupScanWhileStopping, 'function')
  let finishLookup
  const lookup = new Promise((resolve) => { finishLookup = resolve })
  const result = await scanFlow.lookupScanWhileStopping({ lookup: () => lookup, stop: async () => {}, timeoutMs: 5 })
  assert.equal(result.result, null)
  finishLookup({ product: { name: 'fixture' } })
  assert.equal((await result.lookupPromise).product.name, 'fixture')
})

test('normalizeManualEan keeps only digits', () => {
  assert.equal(normalizeManualEan(' 4 870-123 abc 45678 '), '487012345678')
})

test('getManualEanError accepts only EAN-8 and EAN-13', () => {
  assert.equal(getManualEanError('12345678'), null)
  assert.equal(getManualEanError('4870123456789'), null)
  assert.equal(getManualEanError('1234567'), 'invalid_length')
  assert.equal(getManualEanError(''), 'empty')
})

test('upsertRecentScan moves repeated product to the front and limits list', () => {
  const existing = [
    { ean: '1', name: 'One' },
    { ean: '2', name: 'Two' },
    { ean: '3', name: 'Three' },
    { ean: '4', name: 'Four' },
    { ean: '5', name: 'Five' },
  ]

  const updated = upsertRecentScan(existing, { ean: '3', name: 'Three updated', image_url: 'x' })

  assert.deepEqual(updated.map((item) => item.ean), ['3', '1', '2', '4', '5'])
  assert.equal(updated[0].name, 'Three updated')
  assert.equal(updated[0].image_url, 'x')
})

test('buildRecentScanEntry prefers normalized image field', () => {
  assert.deepEqual(
    buildRecentScanEntry({ ean: '4870123456789', name: 'Milk', image: '/milk.png' }),
    { ean: '4870123456789', name: 'Milk', image_url: '/milk.png' }
  )
})

test('getNextCompareState pins first product and navigates after second product', () => {
  const first = { ean: '11111111', name: 'A' }
  const second = { ean: '22222222', name: 'B' }

  assert.deepEqual(getNextCompareState({ active: true, pinnedProduct: null, product: first }), {
    action: 'pin',
    pinnedProduct: first,
  })

  assert.deepEqual(getNextCompareState({ active: true, pinnedProduct: first, product: second }), {
    action: 'compare',
    productA: first,
    productB: second,
  })

  assert.deepEqual(getNextCompareState({ active: false, pinnedProduct: first, product: second }), {
    action: 'product',
    product: second,
  })
})
