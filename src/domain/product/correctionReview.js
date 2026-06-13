const IDENTITY_REASONS = new Set([
  'wrong_product',
  'wrong_weight_or_volume',
  'wrong_fat_percent',
  'wrong_flavor',
  'wrong_package',
  'wrong_brand',
])

const RESOLVED_STATUSES = new Set(['fixed', 'rejected', 'duplicate'])
const OPEN_STATUSES = new Set(['new', 'reviewing'])
const ALLOWED_NEXT_STATUSES = new Set(['reviewing', 'fixed', 'rejected', 'duplicate'])

function cleanText(value, maxLength = 500) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text.slice(0, maxLength) : null
}

export function getProductCorrectionReasonGroup(reason) {
  return IDENTITY_REASONS.has(reason) ? 'identity' : 'data_quality'
}

export function normalizeProductCorrectionReviewEvent(row = {}) {
  const metadata =
    row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {}
  const reason = row.reason || 'other'

  return {
    id: row.id || null,
    ean: row.ean || null,
    shownEan: row.shown_ean || null,
    reason,
    reasonGroup: getProductCorrectionReasonGroup(reason),
    context: row.context || 'product_card',
    status: row.status || 'new',
    comment: cleanText(row.comment),
    shownProductName: cleanText(metadata.shownProductName, 160),
    createdAt: row.created_at || null,
  }
}

export function buildProductCorrectionReviewSummary(rows = []) {
  const summary = {
    total: rows.length,
    open: 0,
    newCount: 0,
    identityCount: 0,
    dataQualityCount: 0,
    resolvedCount: 0,
    latestAt: null,
  }

  for (const row of rows) {
    const status = row.status || 'new'
    const reasonGroup = getProductCorrectionReasonGroup(row.reason || 'other')

    const isOpen = OPEN_STATUSES.has(status)
    if (isOpen) summary.open += 1
    if (status === 'new') summary.newCount += 1
    if (RESOLVED_STATUSES.has(status)) summary.resolvedCount += 1
    if (isOpen && reasonGroup === 'identity') summary.identityCount += 1
    if (isOpen && reasonGroup !== 'identity') summary.dataQualityCount += 1
    if (row.created_at && (!summary.latestAt || row.created_at > summary.latestAt)) {
      summary.latestAt = row.created_at
    }
  }

  return summary
}

export function canTransitionProductCorrectionStatus(currentStatus, nextStatus) {
  const current = currentStatus || 'new'
  const next = nextStatus || ''
  if (!ALLOWED_NEXT_STATUSES.has(next)) return false
  if (current === 'new') return true
  if (current === 'reviewing') return next !== 'reviewing'
  return false
}

export function buildProductCorrectionStatusUpdate({ currentStatus, nextStatus, reviewerAuthId }) {
  if (!canTransitionProductCorrectionStatus(currentStatus, nextStatus)) {
    return { ok: false, reason: 'invalid_transition' }
  }
  if (!reviewerAuthId) return { ok: false, reason: 'missing_reviewer' }

  return {
    ok: true,
    update: {
      status: nextStatus,
      reviewed_by_auth_id: reviewerAuthId,
      reviewed_at: new Date().toISOString(),
      resolution_json: { action: nextStatus },
    },
  }
}
