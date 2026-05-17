const INTERNAL_LABEL_PATTERNS = [
  /\bconfirmed_halal\b/i,
  /\blikely_compatible\b/i,
  /\bquestionable\b/i,
  /\bnot_halal\b/i,
  /\binsufficient_data\b/i,
  /\bdirect_match\b/i,
  /\bprofile_allergen_match\b/i,
  /\bhalalConfidence\b/i,
  /\ballergyConfidence\b/i,
  /\bin_stock\b/i,
  /\bout_of_stock\b/i,
  /\bstockStatus\b/i,
  /\bpriceKzt\b/i,
]

const UNSAFE_ALLERGY_POSITIVE_PATTERNS = [
  /безопасн/i,
  /точно подходит/i,
  /можно брать/i,
  /\bsafe\b/i,
  /\bdefinitely safe\b/i,
]

const EXTERNAL_DATA_PATTERNS = [
  /в интернете/i,
  /из интернета/i,
  /по данным интернета/i,
  /наш[её]л.*состав/i,
  /external source/i,
  /web source/i,
]

const EXTERNAL_UNCERTAINTY_PATTERNS = [
  /может отличаться/i,
  /проверь/i,
  /упаковк/i,
  /не точно/i,
  /могут быть ошибки/i,
  /lower-confidence/i,
]

const VISIBLE_MARKDOWN_PATTERNS = [
  /\*\*[^*\n]+\*\*/,
  /(^|\s)\*[^*\n]+\*(\s|$)/,
  /^[-*]\s+/m,
  /^#{1,6}\s+/m,
]

const NEXT_STEP_PATTERNS = [
  /могу/i,
  /хотите/i,
  /покаж/i,
  /проверь/i,
  /сравн/i,
  /замен/i,
  /дешев/i,
  /аллерген/i,
  /halal/i,
  /халал/i,
  /көрсет/i,
  /тексер/i,
  /таңда/i,
  /ұсын/i,
  /алмастыр/i,
  /\?/,
]

const ISSUE_WEIGHTS = {
  critical: 35,
  major: 20,
  minor: 8,
}

function getReplyText(reply) {
  return String(reply || '').trim()
}

function normalizeEan(value) {
  return String(value || '').trim()
}

function addIssue(issues, severity, code, message) {
  issues.push({ severity, code, message })
}

function hasPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text))
}

function getProductsFromGroups(productGroups) {
  if (!Array.isArray(productGroups)) return []
  return productGroups.flatMap((group) => (Array.isArray(group?.products) ? group.products : []))
}

function hasAllergyDirectMatch(warnings) {
  return Array.isArray(warnings) && warnings.includes('allergy_direct_match')
}

function getStatus(issues) {
  if (issues.some((issue) => issue.severity === 'critical')) return 'fail'
  if (issues.length > 0) return 'review'
  return 'pass'
}

function getScore(issues) {
  const penalty = issues.reduce((sum, issue) => sum + (ISSUE_WEIGHTS[issue.severity] || 0), 0)
  return Math.max(0, 100 - penalty)
}

export function evaluateAIResponseQuality({
  reply = '',
  productGroups = [],
  storeProductEans = null,
  warnings = [],
  allowExternalData = false,
  requireNextStep = false,
} = {}) {
  const text = getReplyText(reply)
  const issues = []

  if (!text) {
    addIssue(issues, 'critical', 'empty_reply', 'AI response must not be empty.')
  }

  if (text.length > 1800) {
    addIssue(issues, 'minor', 'too_verbose', 'AI response is too long for shelf-side mobile use.')
  }

  if (hasPattern(text, VISIBLE_MARKDOWN_PATTERNS)) {
    addIssue(
      issues,
      'minor',
      'visible_markdown',
      'Shopper-facing AI responses should be plain conversational text, not visible markdown.'
    )
  }

  if (requireNextStep && text && !hasPattern(text, NEXT_STEP_PATTERNS)) {
    addIssue(
      issues,
      'minor',
      'missing_next_step',
      'Premium assistant responses should offer a useful next step when the scenario requires it.'
    )
  }

  if (hasPattern(text, INTERNAL_LABEL_PATTERNS)) {
    addIssue(
      issues,
      'critical',
      'internal_label_leak',
      'Internal confidence labels must not appear in shopper-facing text.'
    )
  }

  if (hasAllergyDirectMatch(warnings) && hasPattern(text, UNSAFE_ALLERGY_POSITIVE_PATTERNS)) {
    addIssue(
      issues,
      'critical',
      'unsafe_allergy_wording',
      'Direct allergy matches must not be described as safe or definitely suitable.'
    )
  }

  const usesExternalData = hasPattern(text, EXTERNAL_DATA_PATTERNS)
  const marksExternalUncertainty = hasPattern(text, EXTERNAL_UNCERTAINTY_PATTERNS)
  if (usesExternalData && (!allowExternalData || !marksExternalUncertainty)) {
    addIssue(
      issues,
      allowExternalData ? 'major' : 'major',
      'uncontrolled_external_data',
      'External product data must be explicitly allowed and marked as lower-confidence.'
    )
  }

  if (Array.isArray(storeProductEans)) {
    const allowed = new Set(storeProductEans.map(normalizeEan).filter(Boolean))
    const outsideProducts = getProductsFromGroups(productGroups).filter((product) => {
      const ean = normalizeEan(product?.ean)
      return ean && !allowed.has(ean)
    })
    if (outsideProducts.length > 0) {
      addIssue(
        issues,
        'critical',
        'outside_store_product',
        'Product recommendations must stay inside the active store catalog.'
      )
    }
  }

  return {
    status: getStatus(issues),
    score: getScore(issues),
    issues,
  }
}
