import assert from 'node:assert/strict'
import test from 'node:test'

import { findProductInCatalog } from '../../src/domain/product/alternatives.js'
import {
  isResolvedProductAllowedForScannedEan,
  isResolvedProductExactForScannedEan,
} from '../../src/domain/product/resolver.js'

test('findProductInCatalog can ignore alternate EANs for scan-origin routes', () => {
  const product = {
    ean: '4870035007932',
    alternateEans: ['4870035005035'],
    name: 'Mayonnaise 800 g bucket',
  }

  assert.equal(findProductInCatalog([product], '4870035005035', { allowAlternate: false }), null)
})

test('findProductInCatalog keeps alternate EAN matching enabled by default', () => {
  const product = {
    ean: '4870035007932',
    alternateEans: ['4870035005035'],
    name: 'Mayonnaise 800 g bucket',
  }

  assert.equal(findProductInCatalog([product], '4870035005035'), product)
})

test('isResolvedProductExactForScannedEan rejects alternate-only resolver matches', () => {
  const product = {
    ean: '4870035007932',
    alternateEans: ['4870035005035'],
    name: 'Mayonnaise 800 g bucket',
  }

  assert.equal(isResolvedProductExactForScannedEan(product, '4870035005035'), false)
})

test('isResolvedProductExactForScannedEan accepts exact primary EAN matches', () => {
  const product = {
    ean: '4870035005035',
    alternateEans: ['4870035007932'],
    name: 'Mayonnaise 380 g pouch',
  }

  assert.equal(isResolvedProductExactForScannedEan(product, '4870035005035'), true)
})

test('isResolvedProductAllowedForScannedEan accepts explicit trusted alias metadata only', () => {
  const product = {
    ean: '4870035007932',
    alternateEans: ['4870035005035'],
    sourceMeta: {
      resolvedAliasEan: '4870035005035',
      resolvedAliasStatus: 'trusted',
      resolvedAliasConfidence: 95,
    },
  }

  assert.equal(isResolvedProductExactForScannedEan(product, '4870035005035'), false)
  assert.equal(isResolvedProductAllowedForScannedEan(product, '4870035005035'), true)
  assert.equal(
    isResolvedProductAllowedForScannedEan(
      { ...product, sourceMeta: { ...product.sourceMeta, resolvedAliasStatus: 'review' } },
      '4870035005035'
    ),
    false
  )
})
