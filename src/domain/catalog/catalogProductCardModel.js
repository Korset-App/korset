const CARD_BADGE_DEFS = [
  {
    id: 'halal',
    className: 'halal',
    icon: 'verified',
    labelKey: 'catalog.badge.halal',
    matches: (product) =>
      product.halalStatus === 'yes' || product.halal === 'yes' || product.halal === true,
  },
  {
    id: 'sugar_free',
    className: 'sugar-free',
    icon: 'block',
    labelKey: 'catalog.badge.sugarFree',
    matches: (_product, dietTags) => dietTags.includes('sugar_free'),
  },
  {
    id: 'gluten_free',
    className: 'gluten-free',
    icon: 'grain',
    labelKey: 'catalog.badge.glutenFree',
    matches: (_product, dietTags) => dietTags.includes('gluten_free'),
  },
  {
    id: 'lactose_free',
    className: 'lactose-free',
    icon: 'local_drink',
    labelKey: 'catalog.badge.lactoseFree',
    matches: (_product, dietTags) => dietTags.includes('lactose_free'),
  },
  {
    id: 'vegan',
    className: 'vegan',
    icon: 'eco',
    labelKey: 'catalog.badge.vegan',
    matches: (_product, dietTags) => dietTags.includes('vegan'),
  },
]

function parseJson(input, fallback) {
  if (input == null) return fallback
  if (typeof input === 'object') return input
  try {
    return JSON.parse(input)
  } catch {
    return fallback
  }
}

function normalizeDietTags(product) {
  const tags = product?.dietTags ?? product?.diet_tags_json ?? product?.diet_tags ?? []
  if (Array.isArray(tags)) return tags.filter(Boolean)
  const parsed = parseJson(tags, null)
  if (Array.isArray(parsed)) return parsed.filter(Boolean)
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return []
}

export function buildCatalogProductCardBadges(product, t, limit = 3) {
  const dietTags = normalizeDietTags(product)
  return CARD_BADGE_DEFS.filter((def) => def.matches(product || {}, dietTags))
    .slice(0, limit)
    .map((def) => ({
      id: def.id,
      className: def.className,
      icon: def.icon,
      label: t(def.labelKey),
    }))
}

export function getCatalogProductCardKcal(product) {
  const nutrition = parseJson(
    product?.nutritionPer100 ?? product?.nutriments ?? product?.nutriments_json,
    null
  )
  if (!nutrition || typeof nutrition !== 'object') return null

  const raw =
    nutrition.kcal ??
    nutrition.calories ??
    nutrition.energy_kcal ??
    nutrition.energy_kcal_100g ??
    nutrition['energy-kcal_100g']
  const value = Number(raw)

  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}
