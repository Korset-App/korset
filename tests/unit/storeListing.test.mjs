import test from 'node:test'
import assert from 'node:assert/strict'

import { filterStoreListings, normalizeStoreListing } from '../../src/domain/stores/listing.js'

test('normalizeStoreListing prepares a stable public store card model', () => {
  const store = normalizeStoreListing({
    code: 'mars',
    name: 'Марс',
    city: 'Усть-Каменогорск',
    address: 'ул. Абая, левобережный район',
    type: 'minimarket',
  })

  assert.equal(store.slug, 'mars')
  assert.equal(store.name, 'Марс')
  assert.equal(store.initial, 'М')
  assert.equal(store.status, 'available')
  assert.equal(store.type, 'minimarket')
  assert.equal(store.address, 'ул. Абая')
  assert.equal(store.logoUrl, '/store-logos/mars.svg')
  assert.match(store.searchText, /марс/)
  assert.match(store.searchText, /абая/)
  assert.doesNotMatch(store.searchText, /левобережный/)
})

test('filterStoreListings matches by name, city, address, and type', () => {
  const stores = [
    normalizeStoreListing({ code: 'mars', name: 'Марс', city: 'Усть-Каменогорск', address: 'ул. Абая', type: 'minimarket' }),
    normalizeStoreListing({ code: 'nurly', name: 'Нұрлы', city: 'Усть-Каменогорск', address: 'район Ушанова', type: 'minimarket' }),
    normalizeStoreListing({ code: 'kalina', name: 'Калина', city: 'Усть-Каменогорск', address: 'район Стройка', type: 'minimarket' }),
  ]

  assert.deepEqual(filterStoreListings(stores, 'нұр').map((store) => store.slug), ['nurly'])
  assert.deepEqual(filterStoreListings(stores, 'стройка').map((store) => store.slug), ['kalina'])
  assert.deepEqual(filterStoreListings(stores, 'minimarket').map((store) => store.slug), [
    'mars',
    'nurly',
    'kalina',
  ])
  assert.deepEqual(filterStoreListings(stores, '').map((store) => store.slug), [
    'mars',
    'nurly',
    'kalina',
  ])
})

test('normalizeStoreListing preserves uploaded logos for non-pilot stores', () => {
  const store = normalizeStoreListing({
    code: 'fresh-market',
    name: 'Fresh Market',
    logo_url: 'https://example.com/fresh.svg',
  })

  assert.equal(store.logoUrl, 'https://example.com/fresh.svg')
})
