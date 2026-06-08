import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyLegacyEanAliasCandidate } from '../../src/domain/product/eanAliasClassification.js'

const OWNER = {
  id: 'owner-1',
  ean: '4870035005035',
  name: 'Mayonnaise 3 Zhelaniya Provansal 380 g pouch',
  brand: '3 Желания',
  category: 'sauces_spices',
  subcategory: 'mayonnaise',
  quantity: '380 г',
}

test('legacy alias candidates are review-only when there are no conflicts', () => {
  const result = classifyLegacyEanAliasCandidate({
    alias: '4870035009999',
    owner: OWNER,
    ownersForAlias: [OWNER],
    primaryTarget: null,
  })

  assert.equal(result.insertable, true)
  assert.equal(result.status, 'review')
  assert.equal(result.source, 'legacy_alternate_eans')
  assert.equal(result.confidence < 80, true)
  assert.ok(result.flags.includes('legacy_without_per_alias_evidence'))
})

test('alias that is another product primary EAN is quarantined', () => {
  const result = classifyLegacyEanAliasCandidate({
    alias: '4870035007932',
    owner: OWNER,
    ownersForAlias: [OWNER],
    primaryTarget: {
      id: 'target-1',
      ean: '4870035007932',
      name: 'Mayonnaise 3 Zhelaniya 800 g bucket',
      brand: '3 Желания',
      category: 'sauces_spices',
      subcategory: 'mayonnaise',
      quantity: '800 г',
    },
  })

  assert.equal(result.insertable, true)
  assert.equal(result.status, 'quarantined')
  assert.ok(result.flags.includes('alias_is_another_primary_ean'))
  assert.ok(result.flags.includes('quantity_mismatch'))
})

test('alias used by multiple products is quarantined', () => {
  const result = classifyLegacyEanAliasCandidate({
    alias: '4870035009999',
    owner: OWNER,
    ownersForAlias: [OWNER, { ...OWNER, id: 'owner-2', ean: '4870035001111' }],
    primaryTarget: null,
  })

  assert.equal(result.insertable, true)
  assert.equal(result.status, 'quarantined')
  assert.ok(result.flags.includes('alias_used_by_multiple_products'))
})

test('non-scannable legacy aliases are skipped instead of inserted', () => {
  const result = classifyLegacyEanAliasCandidate({
    alias: 'arbuz_123',
    owner: OWNER,
    ownersForAlias: [OWNER],
    primaryTarget: null,
  })

  assert.equal(result.insertable, false)
  assert.equal(result.status, 'rejected')
  assert.ok(result.flags.includes('non_scannable_alias'))
})

test('self aliases are skipped instead of inserted', () => {
  const result = classifyLegacyEanAliasCandidate({
    alias: OWNER.ean,
    owner: OWNER,
    ownersForAlias: [OWNER],
    primaryTarget: OWNER,
  })

  assert.equal(result.insertable, false)
  assert.equal(result.status, 'rejected')
  assert.ok(result.flags.includes('self_alias'))
})
