export function getFitProfileStatus(profile) {
  const source = profile || {}
  const halal = Boolean(source.halal || source.halalOnly)
  const diets = Array.isArray(source.dietGoals) ? source.dietGoals : []
  const allergens = Array.isArray(source.allergens) ? source.allergens : []
  const customAllergens = Array.isArray(source.customAllergens) ? source.customAllergens : []

  const hasDiet = halal || diets.length > 0
  const hasAllergens = allergens.length > 0 || customAllergens.length > 0
  const noDiet = Boolean(source.noDietPreferences) && !hasDiet
  const noAllergies = Boolean(source.noAllergies) && !hasAllergens

  const dietDecided = hasDiet || noDiet
  const allergensDecided = hasAllergens || noAllergies

  return {
    halal,
    diets,
    allergens,
    customAllergens,
    hasDiet,
    hasAllergens,
    noDiet,
    noAllergies,
    dietDecided,
    allergensDecided,
    complete: dietDecided && allergensDecided,
    untouched: !dietDecided && !allergensDecided,
    activeCount: (halal ? 1 : 0) + diets.length + allergens.length + customAllergens.length,
  }
}
