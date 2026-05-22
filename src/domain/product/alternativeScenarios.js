export const ALTERNATIVE_SCENARIOS = ['similar', 'fits_me', 'cheaper', 'better_composition']

export const DEFAULT_ALTERNATIVE_SCENARIO = 'similar'

export const ALTERNATIVE_SCENARIO_LABEL_KEYS = {
  similar: 'alternatives.scenario.similar',
  fits_me: 'alternatives.scenario.fitsMe',
  cheaper: 'alternatives.scenario.cheaper',
  better_composition: 'alternatives.scenario.betterComposition',
}

export function normalizeAlternativeScenario(value) {
  return ALTERNATIVE_SCENARIOS.includes(value) ? value : DEFAULT_ALTERNATIVE_SCENARIO
}

export function getAlternativeScenarioLabelKey(value) {
  return ALTERNATIVE_SCENARIO_LABEL_KEYS[normalizeAlternativeScenario(value)]
}

export function getAlternativeReasonKey({ alternative = {}, scenario = 'similar' } = {}) {
  const normalizedScenario = normalizeAlternativeScenario(scenario)
  const meta = alternative.alternativeMeta || {}

  if (alternative.stockStatus === 'out_of_stock' || meta.unavailable) {
    return 'alternatives.reason.outOfStock'
  }

  if (normalizedScenario === 'cheaper' && Number(meta.priceDeltaKzt) < 0) {
    return 'alternatives.reason.cheaper'
  }

  if (normalizedScenario === 'fits_me') {
    if (meta.profileRisk === 'ok') return 'alternatives.reason.fitsProfile'
    if (meta.compositionIncomplete) return 'alternatives.reason.compositionIncomplete'
  }

  if (normalizedScenario === 'better_composition') {
    if (!meta.compositionIncomplete) return 'alternatives.reason.betterComposition'
    return 'alternatives.reason.compositionIncomplete'
  }

  if (meta.rankReason === 'same_group') return 'alternatives.reason.sameGroup'
  if (meta.rankReason === 'same_subcategory') return 'alternatives.reason.sameSubcategory'
  return 'alternatives.reason.sameCategory'
}

export function getAlternativeEmptyStateKeys(scenario = 'similar') {
  const normalizedScenario = normalizeAlternativeScenario(scenario)
  return {
    titleKey: `alternatives.empty.${normalizedScenario}.title`,
    bodyKey: `alternatives.empty.${normalizedScenario}.body`,
  }
}
