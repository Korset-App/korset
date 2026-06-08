import { getAllergyConfidence, getHalalConfidence } from '../ai/safetyContract.js'
import { checkProductFit } from '../../utils/fitCheck.js'
import { buildProductUnitPrice } from './unitPrice.js'

const LABELS = {
  best: 'best_choice',
  good: 'good_option',
  check: 'fits_but_check',
  avoid: 'choose_another',
}

const SUMMARY_BY_REASON = {
  safety: 'avoid_allergen',
  halal: 'confirmed_halal',
  availability: 'available_now',
  price: 'better_price',
  value: 'better_value',
  nutrition: 'better_nutrition',
  data: 'more_complete_card',
  similar: 'similar_fit',
  category_mismatch: 'different_category',
}

const CATEGORY_NUTRITION_RULES = {
  dairy_eggs: [
    ['sugar', 'lower', 4],
    ['protein', 'higher', 2],
    ['kcal', 'lower', 1],
    ['fat', 'lower', 1],
  ],
  water_beverages: [
    ['sugar', 'lower', 5],
    ['kcal', 'lower', 3],
  ],
  tea_coffee: [
    ['sugar', 'lower', 4],
    ['kcal', 'lower', 2],
  ],
  sweets: [
    ['sugar', 'lower', 4],
    ['kcal', 'lower', 2],
    ['fat', 'lower', 1],
  ],
  snacks: [
    ['salt', 'lower', 4],
    ['kcal', 'lower', 2],
    ['fat', 'lower', 2],
    ['protein', 'higher', 1],
  ],
  meat: [
    ['protein', 'higher', 3],
    ['fat', 'lower', 2],
    ['salt', 'lower', 2],
  ],
  deli: [
    ['salt', 'lower', 4],
    ['protein', 'higher', 2],
    ['fat', 'lower', 2],
  ],
  fish: [
    ['protein', 'higher', 3],
    ['salt', 'lower', 2],
    ['fat', 'lower', 1],
  ],
  grocery: [
    ['fiber', 'higher', 3],
    ['sugar', 'lower', 2],
    ['protein', 'higher', 1],
    ['kcal', 'lower', 1],
  ],
  sauces_spices: [
    ['salt', 'lower', 4],
    ['sugar', 'lower', 2],
    ['kcal', 'lower', 1],
  ],
  bread: [
    ['fiber', 'higher', 3],
    ['salt', 'lower', 2],
    ['sugar', 'lower', 2],
    ['protein', 'higher', 1],
  ],
  frozen: [
    ['salt', 'lower', 3],
    ['kcal', 'lower', 2],
    ['protein', 'higher', 1],
  ],
  fruits_veg: [
    ['salt', 'lower', 3],
    ['sugar', 'lower', 1],
    ['fiber', 'higher', 1],
  ],
  baby_food: [
    ['sugar', 'lower', 5],
    ['salt', 'lower', 5],
    ['kcal', 'lower', 1],
  ],
  ready_meals: [
    ['salt', 'lower', 4],
    ['protein', 'higher', 2],
    ['kcal', 'lower', 2],
    ['fat', 'lower', 1],
  ],
  healthy: [
    ['sugar', 'lower', 4],
    ['protein', 'higher', 3],
    ['fiber', 'higher', 3],
    ['kcal', 'lower', 1],
  ],
}

const SCORE_REASON_WEIGHTS = {
  safety: 45,
  halal: 18,
  profile: 18,
  availability: 18,
  nutrition: 28,
  composition: 12,
  value: 18,
  price: 18,
  data: 6,
}

function needsHalal(profile = {}) {
  return Boolean(profile?.halal || profile?.halalOnly || profile?.religion?.includes?.('halal'))
}

function hasFitCheckAllergenRisk(fit) {
  return (fit?.reasons || []).some(
    (reason) =>
      reason.category === 'allergen' &&
      (reason.severity === 'danger' || reason.severity === 'warning' || reason.type === 'fail')
  )
}

function allergyRank(allergy, fit) {
  if (hasFitCheckAllergenRisk(fit)) return 0
  if (allergy.level === 'direct_match') return 0
  if (allergy.level === 'insufficient_data') return 1
  return 3
}

function halalRank(halal) {
  if (halal.level === 'confirmed_halal') return 5
  if (halal.level === 'likely_compatible') return 4
  if (halal.level === 'insufficient_data') return 2
  if (halal.level === 'questionable') return 1
  if (halal.level === 'not_halal') return 0
  return 2
}

function availabilityRank(product = {}) {
  if (product.stockStatus === 'in_stock') return 3
  if (product.stockStatus === 'low_stock') return 2
  if (product.stockStatus === 'out_of_stock') return 0
  return 1
}

function dataCompletenessRank(product = {}) {
  let score = 0
  if (product.ingredients || product.ingredientsKz) score += 2
  if (product.nutrition || product.nutritionPer100) score += 1
  if (product.allergens?.length) score += 1
  if (product.halalStatus && product.halalStatus !== 'unknown') score += 1
  if (product.image || product.imageUrl || product.images?.length) score += 1
  return score
}

function getNutrition(product = {}) {
  return product.nutritionPer100 || product.nutrition || {}
}

function nutritionWinner(productA = {}, productB = {}) {
  const category = getCompareCategory(productA) || getCompareCategory(productB)
  const rules = CATEGORY_NUTRITION_RULES[category] || []
  if (!rules.length) return null

  let scoreA = 0
  let scoreB = 0
  const nutritionA = getNutrition(productA)
  const nutritionB = getNutrition(productB)

  for (const [key, direction, weight] of rules) {
    const valueA = Number(nutritionA[key])
    const valueB = Number(nutritionB[key])
    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) continue

    const diff = Math.abs(valueA - valueB)
    const threshold = Math.max(0.5, Math.min(Math.abs(valueA), Math.abs(valueB)) * 0.08)
    if (diff <= threshold) continue

    const aWins = direction === 'higher' ? valueA > valueB : valueA < valueB
    if (aWins) scoreA += weight
    else scoreB += weight
  }

  if (scoreA === scoreB) return null
  if (Math.abs(scoreA - scoreB) < 2) return null
  return {
    winner: scoreA > scoreB ? 'A' : 'B',
    strength: Math.min(1, Math.abs(scoreA - scoreB) / 8),
  }
}

function priceValue(product = {}) {
  const value = Number(product.priceKzt)
  return Number.isFinite(value) && value > 0 ? value : null
}

function priceWinner(productA, productB) {
  const priceA = priceValue(productA)
  const priceB = priceValue(productB)
  if (priceA == null || priceB == null) return null

  const diff = Math.abs(priceA - priceB)
  const threshold = Math.max(50, Math.min(priceA, priceB) * 0.06)
  if (diff < threshold) return null
  return priceA < priceB ? 'A' : 'B'
}

function valueWinner(productA, productB) {
  const unitA = buildProductUnitPrice(productA)
  const unitB = buildProductUnitPrice(productB)

  if (unitA && unitB && unitA.kind === unitB.kind && unitA.suffix === unitB.suffix) {
    const diff = Math.abs(unitA.value - unitB.value)
    const threshold = Math.max(10, Math.min(unitA.value, unitB.value) * 0.06)
    if (diff >= threshold) {
      return {
        winner: unitA.value < unitB.value ? 'A' : 'B',
        reason: 'value',
        strength: Math.min(1, diff / Math.max(unitA.value, unitB.value)),
      }
    }
  }

  const winner = priceWinner(productA, productB)
  return winner ? { winner, reason: 'price', strength: 0.45 } : null
}

function getCompareCategory(product = {}) {
  return product.category || product.normalizedCategory || null
}

function categoriesAreComparable(productA = {}, productB = {}) {
  const categoryA = getCompareCategory(productA)
  const categoryB = getCompareCategory(productB)
  if (!categoryA || !categoryB) return true
  return categoryA === categoryB
}

function getDataCoverage(productA = {}, productB = {}) {
  const missing = []
  const hasIngredientsA = Boolean(productA.ingredients || productA.ingredientsKz)
  const hasIngredientsB = Boolean(productB.ingredients || productB.ingredientsKz)
  const hasNutritionA = Boolean(productA.nutrition || productA.nutritionPer100)
  const hasNutritionB = Boolean(productB.nutrition || productB.nutritionPer100)

  if (!hasIngredientsA || !hasIngredientsB) missing.push('ingredients')
  if (!hasNutritionA || !hasNutritionB) missing.push('nutrition')

  const level = missing.length >= 2 ? 'low' : missing.length === 1 ? 'medium' : 'high'
  return { level, missing }
}

function winnerFromRanks(rankA, rankB) {
  if (rankA === rankB) return null
  return rankA > rankB ? 'A' : 'B'
}

function halalWinner(sideA, sideB) {
  const levelA = sideA.halal.level
  const levelB = sideB.halal.level
  const decisiveLevels = new Set(['confirmed_halal', 'questionable', 'not_halal'])
  if (!decisiveLevels.has(levelA) && !decisiveLevels.has(levelB)) return null
  return winnerFromRanks(sideA.ranks.halal, sideB.ranks.halal)
}

function profileWinner(sideA, sideB, { halalIntent = false } = {}) {
  const safety = winnerFromRanks(sideA.ranks.allergy, sideB.ranks.allergy)
  if (safety) return { winner: safety, reason: 'safety' }
  const halal = halalIntent ? halalWinner(sideA, sideB) : null
  if (halal) return { winner: halal, reason: 'halal' }
  return { winner: 'draw', reason: 'similar' }
}

function makeProductSide(product, profile, { halalIntent = false } = {}) {
  const allergy = getAllergyConfidence(product, profile)
  const halal = getHalalConfidence(product)
  const fit = checkProductFit(product, profile)
  const fitCheckAllergenRisk = hasFitCheckAllergenRisk(fit)
  const reasons = []

  if (allergy.level === 'direct_match') reasons.push('direct_allergen_match')
  if (fitCheckAllergenRisk) reasons.push('fit_check_allergen_risk')
  if (allergy.level === 'insufficient_data') reasons.push('allergy_data_missing')
  if (product.stockStatus === 'out_of_stock') reasons.push('out_of_stock')
  if (halal.level) reasons.push(halal.level)

  let label = LABELS.good
  if (allergy.level === 'direct_match' || fitCheckAllergenRisk || halal.level === 'not_halal') {
    label = LABELS.avoid
  } else if (
    allergy.level === 'insufficient_data' ||
    (halalIntent && halal.level !== 'confirmed_halal') ||
    product.stockStatus === 'out_of_stock'
  ) {
    label = LABELS.check
  }

  return {
    label,
    reasons,
    allergy,
    halal,
    ranks: {
      allergy: allergyRank(allergy, fit),
      halal: halalRank(halal),
      availability: availabilityRank(product),
      data: dataCompletenessRank(product),
    },
  }
}

function promoteWinnerLabels(result, { halalIntent = false } = {}) {
  if (result.winner === 'draw') return result

  const winnerSide = result.winner === 'A' ? result.a : result.b
  const hasOnlyLowerConfidenceHalal =
    halalIntent && !['confirmed_halal', 'not_halal'].includes(winnerSide.halal.level)

  if (winnerSide.label === LABELS.good && !hasOnlyLowerConfidenceHalal) {
    winnerSide.label = result.primaryReason === 'price' ? LABELS.good : LABELS.best
  }

  return result
}

function applyDataConfidence(result) {
  if (result.winner === 'draw') return result
  if (result.confidence === 'clear') return result
  if (result.dataCoverage?.level === 'low') {
    return { ...result, confidence: 'preliminary' }
  }
  return result
}

function addScore(scores, winner, reason, strength = 1) {
  if (!winner) return
  const amount = (SCORE_REASON_WEIGHTS[reason] || 0) * strength
  if (winner === 'A') scores.A += amount
  if (winner === 'B') scores.B += amount
}

function getScoreWinner(scores) {
  const diff = Math.abs(scores.A - scores.B)
  if (diff < 6) return null
  return scores.A > scores.B ? 'A' : 'B'
}

function strongestReason(contributions, winner) {
  return (
    contributions.filter((item) => item.winner === winner).sort((a, b) => b.weight - a.weight)[0]
      ?.reason || 'similar'
  )
}

function buildScoreDecision(productA, productB, sideA, sideB, { halalIntent = false } = {}) {
  const scores = { A: 0, B: 0 }
  const contributions = []
  const push = (winner, reason, strength = 1) => {
    if (!winner) return
    const weight = (SCORE_REASON_WEIGHTS[reason] || 0) * strength
    addScore(scores, winner, reason, strength)
    contributions.push({ winner, reason, weight })
  }

  const safety = winnerFromRanks(sideA.ranks.allergy, sideB.ranks.allergy)
  push(safety, 'safety', 1)

  const halal = halalIntent ? halalWinner(sideA, sideB) : null
  push(halal, 'halal', 1)

  push(winnerFromRanks(sideA.ranks.availability, sideB.ranks.availability), 'availability', 1)

  const nutrition = nutritionWinner(productA, productB)
  push(nutrition?.winner, 'nutrition', nutrition?.strength || 0)

  const value = valueWinner(productA, productB)
  push(value?.winner, value?.reason || 'value', value?.strength || 0)

  const dataWinner =
    Math.abs(sideA.ranks.data - sideB.ranks.data) >= 2
      ? winnerFromRanks(sideA.ranks.data, sideB.ranks.data)
      : null
  push(dataWinner, 'data', 1)

  const winner = getScoreWinner(scores) || 'draw'
  const primaryReason = winner === 'draw' ? 'similar' : strongestReason(contributions, winner)
  const confidence =
    winner === 'draw' ? 'draw' : Math.abs(scores.A - scores.B) >= 18 ? 'clear' : 'slight'

  return { winner, primaryReason, confidence, scores, contributions }
}

export function buildProductComparison(productA = {}, productB = {}, options = {}) {
  const profile = options.profile || {}
  const halalIntent = needsHalal(profile) || Boolean(options.intent?.halal)
  const a = makeProductSide(productA, profile, { halalIntent })
  const b = makeProductSide(productB, profile, { halalIntent })
  const dataCoverage = getDataCoverage(productA, productB)

  if (!categoriesAreComparable(productA, productB)) {
    return {
      isComparable: false,
      winner: 'draw',
      confidence: 'blocked',
      primaryReason: 'category_mismatch',
      summaryKey: SUMMARY_BY_REASON.category_mismatch,
      dataCoverage,
      a,
      b,
    }
  }

  const decision = buildScoreDecision(productA, productB, a, b, { halalIntent })
  const profilePerspective = profileWinner(a, b, { halalIntent })

  const result = promoteWinnerLabels(
    {
      isComparable: true,
      winner: decision.winner,
      confidence: decision.confidence,
      primaryReason: decision.primaryReason,
      summaryKey: SUMMARY_BY_REASON[decision.primaryReason],
      dataCoverage,
      profilePerspective,
      a,
      b,
    },
    { halalIntent }
  )

  return applyDataConfidence(result)
}
