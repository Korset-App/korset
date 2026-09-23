import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isChunkLoadError,
  canAutoReloadNow,
  markAutoReload,
} from '../../src/utils/chunkRecovery.js'

function makeStorage(initial = {}) {
  const store = { ...initial }
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
  }
}

test('isChunkLoadError matches known browser chunk failure messages', () => {
  const samples = [
    'TypeError: error loading dynamically imported module: https://korset.app/assets/ProductScreen-Dlro8AdC.js',
    'Importing a module script failed.',
    'Failed to fetch dynamically imported module: /assets/CatalogScreen-abc123.js',
    'ERROR LOADING DYNAMICALLY IMPORTED MODULE',
  ]
  for (const message of samples) {
    assert.equal(isChunkLoadError(new Error(message)), true, message)
  }
  assert.equal(isChunkLoadError('error loading dynamically imported module'), true)
})

test('isChunkLoadError rejects non-chunk errors and empty input', () => {
  assert.equal(isChunkLoadError(new TypeError("Cannot read properties of null (reading 'x')")), false)
  assert.equal(isChunkLoadError(new Error('NetworkError when attempting to fetch resource.')), false)
  assert.equal(isChunkLoadError(new Error('')), false)
  assert.equal(isChunkLoadError(null), false)
  assert.equal(isChunkLoadError(undefined), false)
})

test('canAutoReloadNow allows first reload and blocks reload loops', () => {
  const storage = makeStorage()
  assert.equal(canAutoReloadNow(storage, 1_000), true)

  markAutoReload(storage, 1_000)
  assert.equal(canAutoReloadNow(storage, 2_000), false)
  assert.equal(canAutoReloadNow(storage, 61_000), true)

  markAutoReload(storage, 61_000)
  assert.equal(canAutoReloadNow(storage, 61_500), false)
})

test('canAutoReloadNow tolerates corrupted storage values and missing storage', () => {
  const corrupted = makeStorage({ 'korset:chunkReloadAt': 'not-a-number' })
  assert.equal(canAutoReloadNow(corrupted, 5_000), true)

  assert.equal(canAutoReloadNow(null, 5_000), false)
  assert.equal(canAutoReloadNow({}, 5_000), false)
})

test('markAutoReload writes a parseable timestamp', () => {
  const storage = makeStorage()
  markAutoReload(storage, 123_456)
  assert.equal(storage.getItem('korset:chunkReloadAt'), '123456')
})
