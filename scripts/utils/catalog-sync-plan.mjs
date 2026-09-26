const NUTRITION_KEYS = ['energy_kcal', 'protein_100g', 'fat_100g', 'carbohydrates_100g']

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function hasFullNutrition(nutrition) {
  return nutrition && NUTRITION_KEYS.every((key) =>
    hasValue(nutrition[key]) && Number.isFinite(Number(nutrition[key])) && Number(nutrition[key]) >= 0
  )
}

export function buildCatalogSyncPlan(local, remote, { sameEanPhoto = false } = {}) {
  if (!local?.ean || String(local.ean) !== String(remote?.ean)) return null

  const plan = { ean: String(local.ean), requiresReview: true }
  let hasChanges = false

  if (!hasValue(remote.image_url) && sameEanPhoto && local.image_url?.startsWith('https://semeiniy.kz/')) {
    plan.image_url = local.image_url
    hasChanges = true
  }

  if (!hasValue(remote.ingredients_raw) && typeof local.ingredients_raw === 'string' && local.ingredients_raw.trim().length >= 5) {
    plan.ingredients_raw = local.ingredients_raw
    hasChanges = true
  }

  if (hasFullNutrition(local.nutriments_json)) {
    const missing = {}
    let conflict = false
    for (const key of NUTRITION_KEYS) {
      const current = remote.nutriments_json?.[key]
      const candidate = local.nutriments_json[key]
      if (!hasValue(current)) missing[key] = candidate
      else if (Number(current) !== Number(candidate)) conflict = true
    }
    if (Object.keys(missing).length > 0) {
      plan.nutriments_json = missing
      plan.nutritionConflict = conflict
      hasChanges = true
    }
  }

  return hasChanges ? plan : null
}
