import { parseQuantityTokens } from '../../utils/parseQuantity.js'
import { isScannableAliasEan } from './eanAliases.js'

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeBrand(value) {
  return normalizeText(value).replace(/\s+/g, '') || null
}

function getPrimaryQuantity(product) {
  const text = [product?.quantity, product?.name].filter(Boolean).join(' ')
  const tokens = parseQuantityTokens(text) || []
  const primary = tokens.find((token) => token.unitType === 'weight' || token.unitType === 'volume')
  if (!primary || primary.value == null) return null
  const normalized =
    primary.unit === 'кг' || primary.unit === 'л' ? primary.value * 1000 : primary.value
  return { ...primary, normalized }
}

function addIdentityFlags(flags, owner, target) {
  if (!target || target.id === owner?.id) return

  const ownerBrand = normalizeBrand(owner?.brand)
  const targetBrand = normalizeBrand(target?.brand)
  if (ownerBrand && targetBrand && ownerBrand !== targetBrand) flags.push('brand_mismatch')

  if (owner?.category && target?.category && owner.category !== target.category) {
    flags.push('category_mismatch')
  }
  if (owner?.subcategory && target?.subcategory && owner.subcategory !== target.subcategory) {
    flags.push('subcategory_mismatch')
  }

  const ownerQuantity = getPrimaryQuantity(owner)
  const targetQuantity = getPrimaryQuantity(target)
  if (ownerQuantity && targetQuantity) {
    if (ownerQuantity.unitType !== targetQuantity.unitType) {
      flags.push('quantity_unit_type_mismatch')
    } else if (Math.abs(ownerQuantity.normalized - targetQuantity.normalized) > 0.01) {
      flags.push('quantity_mismatch')
    }
  }
}

function uniqueFlags(flags) {
  return [...new Set(flags)]
}

export function classifyLegacyEanAliasCandidate({
  alias,
  owner,
  ownersForAlias = [],
  primaryTarget,
}) {
  const normalizedAlias = String(alias || '').trim()
  const flags = ['legacy_without_per_alias_evidence']

  if (!isScannableAliasEan(normalizedAlias)) {
    return {
      insertable: false,
      ean: normalizedAlias,
      status: 'rejected',
      source: 'legacy_alternate_eans',
      confidence: 0,
      flags: uniqueFlags([...flags, 'non_scannable_alias']),
    }
  }

  if (owner?.ean && String(owner.ean) === normalizedAlias) {
    return {
      insertable: false,
      ean: normalizedAlias,
      status: 'rejected',
      source: 'legacy_alternate_eans',
      confidence: 0,
      flags: uniqueFlags([...flags, 'self_alias']),
    }
  }

  if (ownersForAlias.length > 1) flags.push('alias_used_by_multiple_products')
  if (primaryTarget && primaryTarget.id !== owner?.id) flags.push('alias_is_another_primary_ean')
  addIdentityFlags(flags, owner, primaryTarget)

  const critical = flags.some((flag) =>
    [
      'alias_used_by_multiple_products',
      'alias_is_another_primary_ean',
      'brand_mismatch',
      'category_mismatch',
      'subcategory_mismatch',
      'quantity_unit_type_mismatch',
      'quantity_mismatch',
    ].includes(flag)
  )

  return {
    insertable: true,
    ean: normalizedAlias,
    status: critical ? 'quarantined' : 'review',
    source: 'legacy_alternate_eans',
    confidence: critical ? 20 : 60,
    flags: uniqueFlags(flags),
  }
}
