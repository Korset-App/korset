import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EAN_ALIAS_SOURCES,
  EAN_ALIAS_STATUSES,
  buildManualAliasCandidateRequest,
  buildTrustedAliasPromotionUpdate,
  buildTrustedAliasTypedConfirmation,
  canEanAliasResolveBuyerProduct,
  canPromoteEanAliasToTrusted,
  isScannableAliasEan,
  normalizeEanAliasSource,
  normalizeEanAliasStatus,
  normalizeTrustedAliasResolverProduct,
  normalizeTrustedAliasReviewCandidate,
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

test('trusted alias resolver product exposes only trusted active alias targets', () => {
  const trustedProduct = normalizeTrustedAliasResolverProduct({
    ean: '4870035005035',
    status: 'trusted',
    confidence: 95,
    is_active: true,
    global_products: {
      id: 'product-1',
      ean: '4870000000001',
      name: 'Same product multipack',
      is_active: true,
    },
  })

  assert.equal(trustedProduct.id, 'product-1')
  assert.equal(trustedProduct.ean, '4870000000001')

  const reviewProduct = normalizeTrustedAliasResolverProduct({
    ean: '4870035005035',
    status: 'review',
    confidence: 95,
    is_active: true,
    global_products: { id: 'product-2', ean: '4879999999999', is_active: true },
  })

  assert.equal(reviewProduct, null)
})

test('scannable alias EANs are numeric 8 to 14 digit codes only', () => {
  assert.equal(isScannableAliasEan('4870035005035'), true)
  assert.equal(isScannableAliasEan('48705103'), true)
  assert.equal(isScannableAliasEan('0200020763972'), true)
  assert.equal(isScannableAliasEan('arbuz_123'), false)
  assert.equal(isScannableAliasEan('1234567'), false)
  assert.equal(isScannableAliasEan('123456789012345'), false)
})

test('trusted alias promotion accepts only strong conflict-free evidence', () => {
  const result = canPromoteEanAliasToTrusted({
    alias: {
      ean: '4870035005035',
      status: 'review',
      source: 'manual_admin',
      confidence: 95,
      evidence_json: { reviewerConfirmedSameSku: true },
      is_active: true,
    },
    currentTrustedForEan: null,
    primaryTargetForEan: null,
  })

  assert.deepEqual(result, { ok: true, reasons: [] })
})

test('trusted alias promotion blocks legacy and broad search evidence', () => {
  const result = canPromoteEanAliasToTrusted({
    alias: {
      ean: '4870035005035',
      status: 'review',
      source: 'legacy_alternate_eans',
      confidence: 95,
      evidence_json: { reviewerConfirmedSameSku: true },
      is_active: true,
    },
    currentTrustedForEan: null,
    primaryTargetForEan: null,
  })

  assert.equal(result.ok, false)
  assert.ok(result.reasons.includes('source_not_trustable'))
})

test('trusted alias promotion blocks primary and trusted EAN conflicts', () => {
  const baseAlias = {
    ean: '4870035005035',
    global_product_id: 'product-1',
    status: 'review',
    source: 'manual_admin',
    confidence: 95,
    evidence_json: { reviewerConfirmedSameSku: true },
    is_active: true,
  }

  const primaryConflict = canPromoteEanAliasToTrusted({
    alias: baseAlias,
    currentTrustedForEan: null,
    primaryTargetForEan: { id: 'product-2' },
  })
  assert.equal(primaryConflict.ok, false)
  assert.ok(primaryConflict.reasons.includes('ean_is_another_primary_product'))

  const trustedConflict = canPromoteEanAliasToTrusted({
    alias: baseAlias,
    currentTrustedForEan: { global_product_id: 'product-3' },
    primaryTargetForEan: null,
  })
  assert.equal(trustedConflict.ok, false)
  assert.ok(trustedConflict.reasons.includes('ean_already_trusted_for_another_product'))
})

test('buildTrustedAliasPromotionUpdate returns trusted status payload only after guard pass', () => {
  const result = buildTrustedAliasPromotionUpdate({
    alias: {
      ean: '4870035005035',
      status: 'review',
      source: 'audit_scan',
      confidence: 90,
      evidence_json: { reviewerConfirmedSameSku: true },
      is_active: true,
    },
    reviewerAuthId: '00000000-0000-4000-8000-000000000001',
    currentTrustedForEan: null,
    primaryTargetForEan: null,
  })

  assert.equal(result.ok, true)
  assert.equal(result.update.status, 'trusted')
  assert.equal(result.update.confidence, 90)
  assert.equal(result.update.reviewed_by_auth_id, '00000000-0000-4000-8000-000000000001')
  assert.equal(result.update.evidence_json.trustedPromotion.source, 'audit_scan')
})

test('normalizeTrustedAliasReviewCandidate exposes read-only eligibility details', () => {
  const candidate = normalizeTrustedAliasReviewCandidate({
    id: 'alias-1',
    ean: '4870035005035',
    global_product_id: 'product-1',
    status: 'review',
    source: 'manual_admin',
    confidence: 95,
    evidence_json: { reviewerConfirmedSameSku: true, flags: ['manual_pack_check'] },
    is_active: true,
    updated_at: '2026-06-08T10:00:00.000Z',
    global_products: {
      name: 'Milk 3.2%',
      brand: 'FoodMaster',
      ean: '4870000000001',
    },
  })

  assert.equal(candidate.id, 'alias-1')
  assert.equal(candidate.ean, '4870035005035')
  assert.equal(candidate.productName, 'Milk 3.2%')
  assert.equal(candidate.productBrand, 'FoodMaster')
  assert.equal(candidate.localEligibility, 'server_check_required')
  assert.equal(candidate.canRequestPromotion, true)
  assert.deepEqual(candidate.reasons, [])
  assert.deepEqual(candidate.flags, ['manual_pack_check'])
})

test('normalizeTrustedAliasReviewCandidate keeps blocked reasons for legacy rows', () => {
  const candidate = normalizeTrustedAliasReviewCandidate({
    id: 'alias-2',
    ean: '4870035005035',
    global_product_id: 'product-1',
    status: 'review',
    source: 'legacy_alternate_eans',
    confidence: 60,
    evidence_json: { flags: ['legacy_without_per_alias_evidence'] },
    is_active: true,
  })

  assert.equal(candidate.localEligibility, 'blocked')
  assert.equal(candidate.canRequestPromotion, false)
  assert.ok(candidate.reasons.includes('source_not_trustable'))
  assert.ok(candidate.reasons.includes('confidence_too_low'))
  assert.ok(candidate.reasons.includes('missing_reviewer_same_sku_confirmation'))
})

test('typed confirmation requires the last 4 digits of a scannable EAN', () => {
  const confirmation = buildTrustedAliasTypedConfirmation({
    ean: '4870035005035',
    input: ' 5035 ',
  })

  assert.equal(confirmation.expectedText, '5035')
  assert.equal(confirmation.isReady, true)
  assert.equal(confirmation.isConfirmed, true)
})

test('typed confirmation rejects wrong input and non-scannable EANs', () => {
  const wrongInput = buildTrustedAliasTypedConfirmation({
    ean: '4870035005035',
    input: '0000',
  })
  assert.equal(wrongInput.expectedText, '5035')
  assert.equal(wrongInput.isReady, true)
  assert.equal(wrongInput.isConfirmed, false)

  const nonScannable = buildTrustedAliasTypedConfirmation({ ean: 'arbuz_123', input: '123' })
  assert.equal(nonScannable.expectedText, '')
  assert.equal(nonScannable.isReady, false)
  assert.equal(nonScannable.isConfirmed, false)
})

test('manual alias candidate request is review-only and requires scannable EAN', () => {
  const request = buildManualAliasCandidateRequest({
    productId: 'product-1',
    ean: ' 4870035005035 ',
  })

  assert.equal(request.ok, true)
  assert.deepEqual(request.payload, {
    action: 'create-manual-alias-candidate',
    id: 'product-1',
    ean: '4870035005035',
  })

  assert.deepEqual(buildManualAliasCandidateRequest({ productId: '', ean: '4870035005035' }), {
    ok: false,
    reason: 'missing_product',
  })
  assert.deepEqual(buildManualAliasCandidateRequest({ productId: 'product-1', ean: 'arbuz_1' }), {
    ok: false,
    reason: 'ean_not_scannable',
  })
})
