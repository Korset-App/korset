import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EAN_ALIAS_SOURCES,
  EAN_ALIAS_STATUSES,
  canEanAliasResolveBuyerProduct,
  isScannableAliasEan,
  normalizeEanAliasSource,
  normalizeEanAliasStatus,
} from '../../src/domain/product/eanAliases.js'

test('EAN alias status contract matches the database model', () => {
  assert.deepEqual(EAN_ALIAS_STATUSES, ['trusted', 'review', 'quarantined', 'rejected'])
  assert.equal(normalizeEanAliasStatus('trusted'), 'trusted')
  assert.equal(normalizeEanAliasStatus('bad_status'), 'review')
  assert.equal(normalizeEanAliasStatus(null), 'review')
})

test('EAN alias source contract includes legacy, manual, audit, and exact-source evidence', () => {
  assert.ok(EAN_ALIAS_SOURCES.includes('legacy_alternate_eans'))
  assert.ok(EAN_ALIAS_SOURCES.includes('manual_admin'))
  assert.ok(EAN_ALIAS_SOURCES.includes('audit_scan'))
  assert.ok(EAN_ALIAS_SOURCES.includes('external_exact_barcode'))
  assert.equal(normalizeEanAliasSource('npc_search'), 'npc_search')
  assert.equal(normalizeEanAliasSource('unexpected_source'), 'unknown')
})

test('buyer product resolution only accepts active high-confidence trusted aliases', () => {
  assert.equal(
    canEanAliasResolveBuyerProduct({ status: 'trusted', confidence: 95, isActive: true }),
    true
  )
  assert.equal(
    canEanAliasResolveBuyerProduct({ status: 'review', confidence: 95, isActive: true }),
    false
  )
  assert.equal(
    canEanAliasResolveBuyerProduct({ status: 'trusted', confidence: 50, isActive: true }),
    false
  )
  assert.equal(
    canEanAliasResolveBuyerProduct({ status: 'trusted', confidence: 95, isActive: false }),
    false
  )
})

test('scannable alias EANs are numeric 8 to 14 digit codes only', () => {
  assert.equal(isScannableAliasEan('4870035005035'), true)
  assert.equal(isScannableAliasEan('48705103'), true)
  assert.equal(isScannableAliasEan('0200020763972'), true)
  assert.equal(isScannableAliasEan('arbuz_123'), false)
  assert.equal(isScannableAliasEan('1234567'), false)
  assert.equal(isScannableAliasEan('123456789012345'), false)
})
