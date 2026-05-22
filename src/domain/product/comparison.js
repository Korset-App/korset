import { getAllergyConfidence, getHalalConfidence } from '../ai/safetyContract.js'
import { checkProductFit } from '../../utils/fitCheck.js'

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
  data: 'more_complete_card',
  similar: 'similar_fit',
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

export function buildProductComparison(productA = {}, productB = {}, options = {}) {
  const profile = options.profile || {}
  const halalIntent = needsHalal(profile) || Boolean(options.intent?.halal)
  const a = makeProductSide(productA, profile, { halalIntent })
  const b = makeProductSide(productB, profile, { halalIntent })

  const checks = [
    {
      reason: 'safety',
      winner: winnerFromRanks(a.ranks.allergy, b.ranks.allergy),
      confidence: 'clear',
    },
    {
      reason: 'halal',
      winner: halalIntent ? halalWinner(a, b) : null,
      confidence: 'clear',
    },
    {
      reason: 'availability',
      winner: winnerFromRanks(a.ranks.availability, b.ranks.availability),
      confidence: 'clear',
    },
    {
      reason: 'data',
      winner:
        Math.abs(a.ranks.data - b.ranks.data) >= 2
          ? winnerFromRanks(a.ranks.data, b.ranks.data)
          : null,
      confidence: 'slight',
    },
    {
      reason: 'price',
      winner: priceWinner(productA, productB),
      confidence: 'slight',
    },
  ]

  const decisive = checks.find((check) => check.winner)
  const winner = decisive?.winner || 'draw'
  const primaryReason = decisive?.reason || 'similar'
  const confidence = winner === 'draw' ? 'draw' : decisive.confidence

  return promoteWinnerLabels(
    {
      winner,
      confidence,
      primaryReason,
      summaryKey: SUMMARY_BY_REASON[primaryReason],
      a,
      b,
    },
    { halalIntent }
  )
}
