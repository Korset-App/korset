function hasArrayItems(value) {
  return Array.isArray(value) && value.length > 0
}

function hasProfileSignals(profile = {}) {
  return Boolean(
    profile.halal ||
    profile.halalOnly ||
    profile.halalStrict ||
    hasArrayItems(profile.allergens) ||
    hasArrayItems(profile.customAllergens) ||
    hasArrayItems(profile.dietGoals) ||
    hasArrayItems(profile.healthConditions) ||
    profile.sugarFree
  )
}

function getStatus(comparison = {}) {
  if (comparison.isComparable === false) return 'blocked'
  if (comparison.winner === 'draw') return 'draw'
  return 'winner'
}

function getVerdictKey(status, comparison = {}) {
  if (status === 'blocked') return 'compare.verdict.blocked'
  if (status === 'draw') return 'compare.verdict.draw'
  if (comparison.confidence === 'preliminary') return 'compare.verdict.preliminary'
  return 'compare.verdict.winner'
}

function getProfileNote(comparison = {}, profile = {}) {
  if (!hasProfileSignals(profile)) {
    return {
      type: 'setup',
      messageKey: 'compare.profile.setupPrompt',
    }
  }

  const perspective = comparison.profilePerspective
  if (
    perspective?.winner &&
    perspective.winner !== 'draw' &&
    perspective.winner !== comparison.winner
  ) {
    return {
      type: 'diverges',
      winnerSide: perspective.winner,
      reason: perspective.reason,
      messageKey: 'compare.profile.differs',
    }
  }

  return null
}

function getFactorLabelKey(reason) {
  if (reason === 'safety') return 'compare.factor.safety'
  if (reason === 'halal') return 'compare.factor.halal'
  if (reason === 'availability') return 'compare.factor.availability'
  if (reason === 'nutrition') return 'compare.factor.nutrition'
  if (reason === 'value') return 'compare.factor.value'
  if (reason === 'price') return 'compare.factor.price'
  if (reason === 'data') return 'compare.factor.data'
  if (reason === 'category_mismatch') return 'compare.factor.category'
  return 'compare.factor.similar'
}

function buildTopFactors(comparison = {}) {
  const factors = []
  if (comparison.primaryReason) {
    factors.push({
      id: comparison.primaryReason,
      winnerSide: comparison.winner === 'draw' ? null : comparison.winner,
      labelKey: getFactorLabelKey(comparison.primaryReason),
      reasonKey: comparison.summaryKey ? `compare.reason.${comparison.summaryKey}` : null,
    })
  }

  if (comparison.dataCoverage?.level && comparison.dataCoverage.level !== 'high') {
    factors.push({
      id: `data_${comparison.dataCoverage.level}`,
      winnerSide: null,
      labelKey: 'compare.factor.data',
      reasonKey: `compare.data.${comparison.dataCoverage.level}`,
    })
  }

  return factors
}

function getDataNote(comparison = {}) {
  const level = comparison.dataCoverage?.level
  if (!level || level === 'high') return null
  return {
    level,
    missing: comparison.dataCoverage.missing || [],
    messageKey: `compare.data.${level}`,
  }
}

function buildSections(comparison = {}) {
  return [
    {
      id: 'decision',
      titleKey: 'compare.section.decision',
      factorIds: [comparison.primaryReason].filter(Boolean),
    },
    {
      id: 'profile',
      titleKey: 'compare.section.profile',
      factorIds: [comparison.profilePerspective?.reason].filter(Boolean),
    },
    {
      id: 'data',
      titleKey: 'compare.section.data',
      factorIds: comparison.dataCoverage?.missing || [],
    },
  ]
}

export function buildProductComparisonViewModel({ productA, productB, comparison, profile } = {}) {
  const status = getStatus(comparison)
  const winnerSide = status === 'winner' ? comparison?.winner || null : null

  return {
    status,
    winnerSide,
    loserSide: winnerSide === 'A' ? 'B' : winnerSide === 'B' ? 'A' : null,
    confidence: comparison?.confidence || 'draw',
    verdictKey: getVerdictKey(status, comparison),
    reasonKey: comparison?.summaryKey ? `compare.reason.${comparison.summaryKey}` : null,
    actionKey: status === 'blocked' ? 'compare.action.findSameCategory' : null,
    productRefs: {
      A: productA?.ean || null,
      B: productB?.ean || null,
    },
    profileNote: getProfileNote(comparison, profile),
    dataNote: getDataNote(comparison),
    topFactors: buildTopFactors(comparison),
    sections: buildSections(comparison),
  }
}
