import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getRetailSection,
  getRetailPath,
  RETAIL_NAVIGATION,
} from '../../src/domain/retail/navigation.js'

test('retail section is determined by the section segment, not the store slug', () => {
  assert.equal(getRetailSection('/retail/products/dashboard'), 'dashboard')
  assert.equal(getRetailSection('/retail/settings/products'), 'products')
  assert.equal(getRetailSection('/retail/mars/import'), 'products')
  assert.equal(getRetailSection('/retail/mars/ean-recovery'), 'products')
  assert.equal(getRetailSection('/retail/mars/storefront'), 'storefront')
  assert.equal(getRetailSection('/retail/mars/integration'), 'integration')
  assert.equal(getRetailSection('/retail/mars/settings'), 'settings')
})

test('retail navigation never builds a path without a store', () => {
  assert.equal(getRetailPath(null, 'products'), '/retail')
  assert.equal(getRetailPath('mars', 'products'), '/retail/mars/products')
  assert.equal(new Set(RETAIL_NAVIGATION.map((item) => item.id)).size, 5)
})
