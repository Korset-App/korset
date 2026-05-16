import { getAllergyConfidence, getHalalConfidence } from './safetyContract.js'

const LABELS = {
  best: 'best_choice',
  good: 'good_option',
  check: 'fits_but_check',
  avoid: 'choose_another',
  insufficient: 'insufficient_data',
}

function stockScore(product = {}) {
  if (product.stockStatus === 'out_of_stock') return -120
  if (product.stockStatus === 'low_stock') return 25
  if (product.stockStatus === 'in_stock') return 60
  return 0
}

function halalScore(halal, intent = {}) {
  if (!intent?.halal) return 0
  if (halal.level === 'confirmed_halal') return 100
  if (halal.level === 'likely_compatible') return 65
  if (halal.level === 'questionable') return -45
  if (halal.level === 'not_halal') return -220
  return -35
}

function dataCompletenessScore(product = {}) {
  let score = 0
  if (product.ingredients || product.ingredientsKz) score += 12
  if (product.nutrition || product.nutritionPer100) score += 6
  if (product.image || product.imageUrl) score += 4
  if (product.halalStatus && product.halalStatus !== 'unknown') score += 5
  return score
}

function priceScore(product = {}) {
  const price = Number(product.priceKzt)
  if (!Number.isFinite(price) || price <= 0) return 0
  return Math.max(0, 2500 - price) / 100
}

export function buildFitPriority(product = {}, options = {}) {
  const profile = options.profile || null
  const intent = options.intent || {}
  const allergy = getAllergyConfidence(product, profile)
  const halal = getHalalConfidence(product)

  let sortScore = 0
  let label = LABELS.good
  const signals = []

  if (allergy.level === 'direct_match') {
    sortScore -= 1000
    label = LABELS.avoid
    signals.push('direct_allergen_match')
  } else if (allergy.level === 'insufficient_data') {
    sortScore -= 90
    label = LABELS.check
    signals.push('allergy_data_missing')
  } else {
    sortScore += 80
  }

  const hScore = halalScore(halal, intent)
  sortScore += hScore
  if (intent?.halal) signals.push(`halal_${halal.level}`)
  if (intent?.halal && (halal.level === 'questionable' || halal.level === 'insufficient_data')) {
    label = label === LABELS.avoid ? label : LABELS.check
  }
  if (intent?.halal && halal.level === 'not_halal') label = LABELS.avoid

  sortScore += stockScore(product)
  if (product.stockStatus === 'out_of_stock') {
    label = label === LABELS.avoid ? label : LABELS.check
    signals.push('out_of_stock')
  }

  sortScore += dataCompletenessScore(product)
  sortScore += priceScore(product)

  if (label !== LABELS.avoid && label !== LABELS.check && sortScore >= 245) {
    label = LABELS.best
  }
  if (label !== LABELS.avoid && label !== LABELS.check && halal.level === 'insufficient_data') {
    label = LABELS.insufficient
  }

  return {
    label,
    sortScore,
    signals,
    halal,
    allergy,
  }
}

export function compareFitPriority(productA = {}, productB = {}, options = {}) {
  const a = buildFitPriority(productA, options)
  const b = buildFitPriority(productB, options)
  if (a.sortScore !== b.sortScore) return b.sortScore - a.sortScore

  const priceA = Number.isFinite(Number(productA.priceKzt)) ? Number(productA.priceKzt) : Infinity
  const priceB = Number.isFinite(Number(productB.priceKzt)) ? Number(productB.priceKzt) : Infinity
  return priceA - priceB
}
