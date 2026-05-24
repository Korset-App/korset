const ORDERED_SEVERITIES = ['danger', 'warning', 'caution', 'safe']

const BADGE_META = {
  safe: {
    key: 'safe',
    icon: 'check_circle',
    labelKey: 'fit.verdict.safe',
  },
  caution: {
    key: 'caution',
    icon: 'warning',
    labelKey: 'fit.verdict.caution',
  },
  warning: {
    key: 'warning',
    icon: 'error_outline',
    labelKey: 'fit.verdict.warning',
  },
  danger: {
    key: 'danger',
    icon: 'cancel',
    labelKey: 'fit.verdict.danger',
  },
}

export function resolveFitSeverityKey(fit = {}) {
  if (ORDERED_SEVERITIES.includes(fit.verdict)) return fit.verdict

  const reasons = Array.isArray(fit.reasons) ? fit.reasons : []
  for (const severity of ORDERED_SEVERITIES) {
    if (reasons.some((reason) => reason.severity === severity)) return severity
  }

  for (const severity of ORDERED_SEVERITIES) {
    if (reasons.some((reason) => reason.type === severity)) return severity
  }

  if (fit.fits === false) return 'danger'
  return 'safe'
}

export function getFitBadgeMeta(severityKey) {
  return BADGE_META[severityKey] || BADGE_META.safe
}
