import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendCatalogSearchQuery,
  CATALOG_SEARCH_HISTORY_STORAGE_KEY,
  readCatalogSearchHistory,
  clearCatalogSearchHistory,
  removeCatalogSearchQuery,
} from '../../src/domain/product/searchHistory.js'

const storage = new Map()

globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null
  },
  setItem(key, value) {
    storage.set(key, String(value))
  },
  removeItem(key) {
    storage.delete(key)
  },
  clear() {
    storage.clear()
  },
}

test('catalog search history is scoped, deduped, normalized, and limited', () => {
  localStorage.clear()

  appendCatalogSearchQuery('store-a', '  молоко   3.2  ')
  appendCatalogSearchQuery('store-a', 'кефир')
  appendCatalogSearchQuery('store-b', 'айран')
  appendCatalogSearchQuery('store-a', 'МОЛОКО 3.2')
  appendCatalogSearchQuery('store-a', 'x')

  const storeA = readCatalogSearchHistory('store-a')
  const storeB = readCatalogSearchHistory('store-b')

  assert.deepEqual(
    storeA.map((item) => item.query),
    ['МОЛОКО 3.2', 'кефир']
  )
  assert.deepEqual(
    storeB.map((item) => item.query),
    ['айран']
  )

  const raw = JSON.parse(localStorage.getItem(CATALOG_SEARCH_HISTORY_STORAGE_KEY))
  assert.equal(raw.length, 3)
})

test('catalog search history survives malformed storage', () => {
  localStorage.setItem(CATALOG_SEARCH_HISTORY_STORAGE_KEY, '{bad json')

  assert.deepEqual(readCatalogSearchHistory('store-a'), [])
  assert.deepEqual(
    appendCatalogSearchQuery('store-a', 'сыр').map((item) => item.query),
    ['сыр']
  )
})

test('removeCatalogSearchQuery removes only targeted query in targeted store', () => {
  localStorage.clear()

  appendCatalogSearchQuery('store-a', 'молоко')
  appendCatalogSearchQuery('store-a', 'сыр')
  appendCatalogSearchQuery('store-b', 'сыр')

  removeCatalogSearchQuery('store-a', 'МОЛОКО')
  assert.deepEqual(
    readCatalogSearchHistory('store-a').map((i) => i.query),
    ['сыр']
  )
  // store-b should be untouched
  assert.deepEqual(
    readCatalogSearchHistory('store-b').map((i) => i.query),
    ['сыр']
  )
})

test('clearCatalogSearchHistory clears only targeted store', () => {
  localStorage.clear()

  appendCatalogSearchQuery('store-a', 'молоко')
  appendCatalogSearchQuery('store-a', 'сыр')
  appendCatalogSearchQuery('store-b', 'чай')

  clearCatalogSearchHistory('store-a')
  assert.deepEqual(readCatalogSearchHistory('store-a'), [])
  assert.deepEqual(
    readCatalogSearchHistory('store-b').map((i) => i.query),
    ['чай']
  )
})
