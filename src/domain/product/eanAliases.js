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
