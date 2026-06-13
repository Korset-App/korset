export const EAN_ALIAS_STATUSES = ['trusted', 'review', 'quarantined', 'rejected']

export const EAN_ALIAS_SOURCES = [
  'global_primary',
  'store_import',
  'manual_admin',
  'audit_scan',
  'shopper_report',
  'external_exact_barcode',
  'npc_search',
  'legacy_alternate_eans',
  'arbuz_barcode',
  'arbuz_search',
  'kaspi',
  'korzinavdom',
  'openfoodfacts',
  'unknown',
]

const STATUS_SET = new Set(EAN_ALIAS_STATUSES)
const SOURCE_SET = new Set(EAN_ALIAS_SOURCES)
const TRUSTABLE_PROMOTION_SOURCES = new Set([
  'manual_admin',
  'audit_scan',
  'store_import',
  'external_exact_barcode',
  'arbuz_barcode',
  'openfoodfacts',
])
const UNTRUSTABLE_PROMOTION_SOURCES = new Set([
  'legacy_alternate_eans',
  'npc_search',
  'arbuz_search',
  'kaspi',
  'korzinavdom',
  'unknown',
])

export function normalizeEanAliasStatus(status) {
  return STATUS_SET.has(status) ? status : 'review'
}

export function normalizeEanAliasSource(source) {
  return SOURCE_SET.has(source) ? source : 'unknown'
}

export function isScannableAliasEan(ean) {
  return /^\d{8,14}$/.test(String(ean || '').trim())
}

export function canEanAliasResolveBuyerProduct(alias) {
  if (!alias || alias.isActive === false || alias.is_active === false) return false
  const status = normalizeEanAliasStatus(alias.status)
  const confidence = Number(alias.confidence ?? 0)
  return status === 'trusted' && Number.isFinite(confidence) && confidence >= 80
}

export function normalizeTrustedAliasResolverProduct(row = {}) {
  if (!canEanAliasResolveBuyerProduct(row)) return null
  if (!row.global_products || row.global_products.is_active === false) return null
  return row.global_products
}

function sameProductId(left, right) {
  if (!left || !right) return false
  return String(left) === String(right)
}

export function canPromoteEanAliasToTrusted({
  alias,
  currentTrustedForEan = null,
  primaryTargetForEan = null,
} = {}) {
  const reasons = []
  const source = normalizeEanAliasSource(alias?.source)
  const confidence = Number(alias?.confidence ?? 0)
  const aliasProductId = alias?.global_product_id || alias?.globalProductId || null
  const evidence = alias?.evidence_json || alias?.evidenceJson || {}

  if (!alias || alias.isActive === false || alias.is_active === false)
    reasons.push('alias_inactive')
  if (!isScannableAliasEan(alias?.ean)) reasons.push('ean_not_scannable')
  if (normalizeEanAliasStatus(alias?.status) === 'trusted') reasons.push('already_trusted')
  if (!Number.isFinite(confidence) || confidence < 80) reasons.push('confidence_too_low')
  if (UNTRUSTABLE_PROMOTION_SOURCES.has(source) || !TRUSTABLE_PROMOTION_SOURCES.has(source)) {
    reasons.push('source_not_trustable')
  }
  if (evidence?.reviewerConfirmedSameSku !== true)
    reasons.push('missing_reviewer_same_sku_confirmation')

  const primaryTargetId = primaryTargetForEan?.id || primaryTargetForEan?.global_product_id || null
  if (primaryTargetId && aliasProductId && !sameProductId(primaryTargetId, aliasProductId)) {
    reasons.push('ean_is_another_primary_product')
  }

  const trustedTargetId =
    currentTrustedForEan?.global_product_id || currentTrustedForEan?.globalProductId || null
  if (trustedTargetId && aliasProductId && !sameProductId(trustedTargetId, aliasProductId)) {
    reasons.push('ean_already_trusted_for_another_product')
  }

  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] }
}

export function buildTrustedAliasPromotionUpdate({
  alias,
  reviewerAuthId,
  currentTrustedForEan = null,
  primaryTargetForEan = null,
} = {}) {
  const guard = canPromoteEanAliasToTrusted({ alias, currentTrustedForEan, primaryTargetForEan })
  if (!guard.ok) return { ok: false, reasons: guard.reasons }
  if (!reviewerAuthId) return { ok: false, reasons: ['missing_reviewer'] }

  const source = normalizeEanAliasSource(alias.source)
  const evidence = alias.evidence_json || alias.evidenceJson || {}
  const now = new Date().toISOString()

  return {
    ok: true,
    reasons: [],
    update: {
      status: 'trusted',
      confidence: Number(alias.confidence),
      reviewed_by_auth_id: reviewerAuthId,
      reviewed_at: now,
      evidence_json: {
        ...evidence,
        trustedPromotion: {
          source,
          reviewerConfirmedSameSku: true,
          promotedAt: now,
        },
      },
    },
  }
}

export function buildTrustedAliasTypedConfirmation({ ean, input } = {}) {
  if (!isScannableAliasEan(ean)) {
    return { expectedText: '', isReady: false, isConfirmed: false }
  }

  const expectedText = String(ean).trim().slice(-4)
  const actualText = String(input || '').trim()
  return {
    expectedText,
    isReady: expectedText.length === 4,
    isConfirmed: actualText === expectedText,
  }
}

export function buildManualAliasCandidateRequest({ productId, ean } = {}) {
  const id = String(productId || '').trim()
  const cleanEan = String(ean || '').trim()

  if (!id) return { ok: false, reason: 'missing_product' }
  if (!isScannableAliasEan(cleanEan)) return { ok: false, reason: 'ean_not_scannable' }

  return {
    ok: true,
    payload: {
      action: 'create-manual-alias-candidate',
      id,
      ean: cleanEan,
    },
  }
}

export function normalizeTrustedAliasReviewCandidate(row = {}) {
  const evidence =
    row.evidence_json && typeof row.evidence_json === 'object' ? row.evidence_json : {}
  const guard = canPromoteEanAliasToTrusted({
    alias: row,
    currentTrustedForEan: null,
    primaryTargetForEan: null,
  })

  return {
    id: row.id || null,
    ean: row.ean || null,
    globalProductId: row.global_product_id || null,
    status: normalizeEanAliasStatus(row.status),
    source: normalizeEanAliasSource(row.source),
    confidence: Number(row.confidence ?? 0),
    productName: row.global_products?.name || null,
    productBrand: row.global_products?.brand || null,
    productPrimaryEan: row.global_products?.ean || null,
    flags: Array.isArray(evidence.flags) ? evidence.flags : [],
    reasons: guard.reasons,
    canRequestPromotion: guard.ok,
    localEligibility: guard.ok ? 'server_check_required' : 'blocked',
    updatedAt: row.updated_at || null,
  }
}
