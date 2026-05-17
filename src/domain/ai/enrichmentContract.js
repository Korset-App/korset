const BROAD_CATALOG_PATTERNS = [
  /что купить/i,
  /собери/i,
  /ужин/i,
  /завтрак/i,
  /дешевле/i,
  /покажи/i,
  /не алуға/i,
  /жина/i,
]

const SPECIFIC_FACT_PATTERNS = [
  /состав/i,
  /внутри/i,
  /ингредиент/i,
  /аллерген/i,
  /халал/i,
  /halal/i,
  /калори/i,
  /ккал/i,
  /сахар/i,
  /белок/i,
  /производител/i,
  /құрам/i,
  /аллерген/i,
  /қант/i,
  /ақуыз/i,
]

const NUTRITION_FACT_KEYS = ['calories', 'kcal', 'sugar', 'protein', 'fat', 'carbs']

function cleanString(value) {
  return String(value || '').trim()
}

function normalizeText(value) {
  return cleanString(value).toLowerCase().replace(/\s+/g, ' ')
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.values(value).some(hasValue)
  return cleanString(value).length > 0
}

function hasNutrition(nutrition) {
  if (!nutrition || typeof nutrition !== 'object') return false
  return NUTRITION_FACT_KEYS.some((key) => hasValue(nutrition[key]))
}

function hasPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text))
}

function isBroadCatalogRequest(userQuery) {
  const text = cleanString(userQuery)
  return hasPattern(text, BROAD_CATALOG_PATTERNS) && !hasPattern(text, SPECIFIC_FACT_PATTERNS)
}

function isUnknownHalal(value) {
  const normalized = normalizeText(value)
  return (
    !normalized || ['unknown', 'insufficient_data', 'unclear', 'неизвестно'].includes(normalized)
  )
}

function getMissingReasons({ product, userQuery, profile }) {
  const reasons = []
  const asksSpecificFact = hasPattern(cleanString(userQuery), SPECIFIC_FACT_PATTERNS)

  if (!hasValue(product?.ingredients)) reasons.push('missing_ingredients')
  if (
    isUnknownHalal(product?.halalStatus) &&
    (profile?.halalOnly || profile?.halal || /халал|halal/i.test(userQuery || ''))
  ) {
    reasons.push('unknown_halal_for_halal_profile')
  }
  if (
    !hasNutrition(product?.nutrition) &&
    /(калори|ккал|сахар|белок|protein|sugar|қант|ақуыз)/i.test(userQuery || '')
  ) {
    reasons.push('missing_nutrition')
  }
  if (!hasValue(product?.imageUrl) && !hasValue(product?.image)) reasons.push('missing_image')
  if (!hasValue(product?.manufacturer)) reasons.push('missing_manufacturer')
  if (asksSpecificFact) reasons.push('asked_missing_specific_fact')

  return [...new Set(reasons)]
}

function pickLookupKeys(product = {}) {
  const keys = {}
  for (const key of ['ean', 'name', 'brand', 'quantity', 'manufacturer']) {
    const value = cleanString(product[key])
    if (value) keys[key] = value
  }
  return keys
}

function buildCacheKey(lookupKeys) {
  if (lookupKeys.ean) return `ean:${lookupKeys.ean}`
  const parts = [lookupKeys.brand, lookupKeys.name, lookupKeys.quantity].filter(Boolean)
  return parts.length ? `product:${normalizeText(parts.join('|'))}` : null
}

function sameText(a, b) {
  return normalizeText(a) === normalizeText(b)
}

function getMatchScore({ product, candidate }) {
  let score = 0
  if (candidate?.ean && product?.ean && sameText(candidate.ean, product.ean)) score += 0.6
  if (candidate?.name && product?.name && sameText(candidate.name, product.name)) score += 0.18
  if (candidate?.brand && product?.brand && sameText(candidate.brand, product.brand)) score += 0.12
  if (candidate?.quantity && product?.quantity && sameText(candidate.quantity, product.quantity))
    score += 0.1
  return Number(score.toFixed(2))
}

function hasLocalConflict({ product, candidate }) {
  if (!product || !candidate) return false
  if (
    hasValue(product.ingredients) &&
    hasValue(candidate.ingredients) &&
    !sameText(product.ingredients, candidate.ingredients)
  ) {
    return true
  }
  if (hasValue(product.halalStatus) && hasValue(candidate.halalStatus)) {
    const localHalal = normalizeText(product.halalStatus)
    const externalHalal = normalizeText(candidate.halalStatus)
    if (localHalal !== 'unknown' && externalHalal !== 'unknown' && localHalal !== externalHalal)
      return true
  }
  return false
}

export function classifyEnrichmentTrigger({ product = null, userQuery = '', profile = {} } = {}) {
  if (!product) {
    return {
      allowed: false,
      reason: isBroadCatalogRequest(userQuery) ? 'broad_catalog_request' : 'missing_product',
      reasons: [],
    }
  }

  if (isBroadCatalogRequest(userQuery)) {
    return { allowed: false, reason: 'broad_catalog_request', reasons: [] }
  }

  const reasons = getMissingReasons({ product, userQuery, profile })
  const allowed = reasons.length > 0

  return {
    allowed,
    reason: allowed ? 'local_card_weak' : 'local_card_sufficient',
    reasons,
  }
}

export function buildEnrichmentRequest({ product = {}, userQuery = '', profile = {} } = {}) {
  const trigger = classifyEnrichmentTrigger({ product, userQuery, profile })
  const lookupKeys = pickLookupKeys(product)

  return {
    allowed:
      trigger.allowed && (Boolean(lookupKeys.ean) || Boolean(lookupKeys.name && lookupKeys.brand)),
    reason: trigger.reason,
    reasons: trigger.reasons,
    lookupKeys,
    cacheKey: buildCacheKey(lookupKeys),
    networkAllowed: false,
    reviewRequired: true,
  }
}

export function normalizeExternalCandidate({ product = {}, candidate = null, source = {} } = {}) {
  if (!candidate) {
    return {
      confidence: 'not_found',
      matchScore: 0,
      reviewStatus: 'candidate',
      fields: {},
      source,
    }
  }

  const matchScore = getMatchScore({ product, candidate })
  const conflict = hasLocalConflict({ product, candidate })
  let confidence = 'weak_match'

  if (conflict) confidence = 'conflict'
  else if (candidate.ean && product.ean && sameText(candidate.ean, product.ean))
    confidence = 'exact_ean_match'
  else if (matchScore >= 0.4 && candidate.name && candidate.brand && candidate.quantity)
    confidence = 'probable_product_match'

  return {
    confidence,
    matchScore,
    reviewStatus: 'candidate',
    fields: {
      ingredients: cleanString(candidate.ingredients),
      allergens: Array.isArray(candidate.allergens) ? candidate.allergens.filter(Boolean) : [],
      halalStatus: cleanString(candidate.halalStatus),
      nutrition:
        candidate.nutrition && typeof candidate.nutrition === 'object' ? candidate.nutrition : null,
      manufacturer: cleanString(candidate.manufacturer),
    },
    source: {
      domain: cleanString(source.domain),
      url: cleanString(source.url),
      fetchedAt: cleanString(source.fetchedAt),
    },
  }
}

export function canShowExternalCandidateToBuyer(candidate = {}) {
  if (candidate.reviewStatus === 'rejected') return false
  if (candidate.confidence === 'exact_ean_match') return true
  return (
    candidate.confidence === 'probable_product_match' && Number(candidate.matchScore || 0) >= 0.85
  )
}

export function buildExternalReferenceNotice({ lang = 'ru', candidate = {} } = {}) {
  const sourceLabel = 'external_reference'
  const text =
    lang === 'kz'
      ? 'Сыртқы деректер бойынша, бұл ақпаратты төмен сенімді анықтама ретінде қабылдау керек. Сатып алар алдында қаптамадағы құрамды, аллергендерді және halal белгісін тексеріңіз.'
      : 'По внешним данным, которые нужно считать менее надёжными, информация может помочь как ориентир. Перед покупкой проверьте состав, аллергены и halal-маркировку на упаковке.'

  return {
    text,
    sourceLabel,
    externalConfidence: candidate.confidence || 'not_found',
    fields: candidate.fields || {},
    needsPackageCheck: true,
  }
}
