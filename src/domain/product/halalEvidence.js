const HALAL_YES_MARKERS = [
  { type: 'phrase', value: 'halal certified' },
  { type: 'phrase', value: 'halal certificate' },
  { type: 'phrase', value: 'halal cert' },
  { type: 'phrase', value: 'halal label' },
  { type: 'token', value: 'halal' },
  { type: 'token', value: 'халал' },
  { type: 'token', value: 'халяль' },
]

const HALAL_NO_MARKERS = [
  { type: 'token', value: 'свинина' },
  { type: 'token', value: 'порк' },
  { type: 'token', value: 'бекон' },
  { type: 'token', value: 'сало' },
  { type: 'token', value: 'ветчина' },
  { type: 'token', value: 'лард' },
  { type: 'token', value: 'bacon' },
  { type: 'token', value: 'pork' },
  { type: 'token', value: 'ham' },
  { type: 'token', value: 'lard' },
  { type: 'token', value: 'alcohol' },
  { type: 'token', value: 'ethanol' },
  { type: 'token', value: 'spirits' },
  { type: 'token', value: 'vodka' },
  { type: 'token', value: 'wine' },
  { type: 'token', value: 'beer' },
  { type: 'token', value: 'rum' },
  { type: 'token', value: 'gin' },
  { type: 'token', value: 'whisky' },
  { type: 'token', value: 'whiskey' },
  { type: 'token', value: 'liqueur' },
  { type: 'token', value: 'liquor' },
  { type: 'token', value: 'brandy' },
  { type: 'token', value: 'cognac' },
  { type: 'token', value: 'absinthe' },
  { type: 'token', value: 'champagne' },
  { type: 'token', value: 'sake' },
  { type: 'token', value: 'e120' },
  { type: 'token', value: 'e904' },
  { type: 'token', value: 'кармин' },
  { type: 'token', value: 'шеллак' },
]

const HALAL_AMBIGUOUS_MARKERS = [
  { type: 'token', value: 'желатин' },
  { type: 'token', value: 'желатина' },
  { type: 'token', value: 'ароматизатор' },
  { type: 'token', value: 'ароматизаторы' },
  { type: 'token', value: 'flavoring' },
  { type: 'token', value: 'flavouring' },
  { type: 'token', value: 'flavor' },
  { type: 'token', value: 'flavour' },
  { type: 'token', value: 'фермент' },
  { type: 'token', value: 'ферменты' },
  { type: 'token', value: 'enzyme' },
  { type: 'token', value: 'enzymes' },
  { type: 'token', value: 'rennet' },
  { type: 'token', value: 'сычужный' },
  { type: 'token', value: 'кармин' },
  { type: 'token', value: 'e441' },
  { type: 'token', value: 'e471' },
  { type: 'token', value: 'e472a' },
  { type: 'token', value: 'e472b' },
  { type: 'token', value: 'e472c' },
  { type: 'token', value: 'e472e' },
  { type: 'token', value: 'e473' },
  { type: 'token', value: 'e474' },
  { type: 'token', value: 'e475' },
  { type: 'token', value: 'e476' },
  { type: 'token', value: 'e477' },
  { type: 'token', value: 'e481' },
  { type: 'token', value: 'e482' },
  { type: 'token', value: 'e483' },
  { type: 'token', value: 'e631' },
  { type: 'token', value: 'e635' },
  { type: 'token', value: 'e901' },
  { type: 'token', value: 'e310' },
  { type: 'token', value: 'e170' },
  { type: 'token', value: 'e101' },
  { type: 'token', value: 'e415' },
]

function normalizeHalalText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[«»"“”'’]/g, ' ')
    .replace(/[^a-zа-яё0-9+]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeHalalText(value) {
  const normalized = normalizeHalalText(value)
  if (!normalized) return []
  return normalized.split(' ').filter(Boolean)
}

function containsMarker(text, tokens, marker) {
  if (marker.type === 'phrase') {
    return text.includes(marker.value)
  }
  return tokens.includes(marker.value)
}

function findMarker(text, tokens, markers) {
  return markers.find((marker) => containsMarker(text, tokens, marker)) || null
}

function parseAlcoholValue(input) {
  const direct = input?.alcohol100g ?? input?.alcohol ?? input?.alcoholPercent
  const parsed = Number.parseFloat(String(direct ?? ''))
  if (!Number.isNaN(parsed) && parsed > 0) return parsed

  const nutriments = input?.nutriments || input?.nutritionPer100 || input?.nutriments_json || {}
  const nutrimentValue = nutriments.alcohol ?? nutriments.alcohol_100g
  const parsedNutriment = Number.parseFloat(String(nutrimentValue ?? ''))
  if (!Number.isNaN(parsedNutriment) && parsedNutriment > 0) return parsedNutriment

  return null
}

function normalizeHalalStatus(value) {
  if (value === true || value === 'yes' || value === 'halal') return 'yes'
  if (value === false || value === 'no' || value === 'haram') return 'no'
  if (value === 'unknown' || value == null || value === '') return 'unknown'
  return String(value).toLowerCase()
}

function makeSignal(kind, text, confidence = 'medium') {
  return { kind, text, confidence }
}

export function classifyHalalEvidence(input = {}) {
  const explicitStatus = normalizeHalalStatus(input.halalStatus ?? input.halal_status)
  const text = normalizeHalalText(
    [input.name, input.brand, input.ingredients, input.ingredients_raw, input.labels]
      .filter(Boolean)
      .join(' ')
  )
  const tokens = tokenizeHalalText(text)
  const registryMatches = Array.isArray(input.registryMatches) ? input.registryMatches : []
  const alcoholValue = parseAlcoholValue(input)

  const signals = []
  const noMarker = findMarker(text, tokens, HALAL_NO_MARKERS)
  const yesMarker = findMarker(text, tokens, HALAL_YES_MARKERS)
  const ambiguousMarker = findMarker(text, tokens, HALAL_AMBIGUOUS_MARKERS)

  if (alcoholValue != null) {
    signals.push(makeSignal('alcohol', `alcohol=${alcoholValue}`, 'high'))
  }
  if (noMarker) {
    signals.push(makeSignal('clear_no_marker', noMarker.value, 'high'))
  }
  if (registryMatches.length > 0) {
    const topMatch = registryMatches[0]
    signals.push(
      makeSignal('brand_registry', topMatch?.name || topMatch?.brand || 'registry match', 'high')
    )
  }
  if (yesMarker) {
    signals.push(makeSignal('halal_text_marker', yesMarker.value, 'medium'))
  }
  if (ambiguousMarker) {
    signals.push(makeSignal('ambiguous_marker', ambiguousMarker.value, 'low'))
  }

  const hasStrongYes = explicitStatus === 'yes' || registryMatches.length > 0
  const hasStrongNo = explicitStatus === 'no' || alcoholValue != null || Boolean(noMarker)
  const hasTextYes = Boolean(yesMarker)
  const hasAmbiguous = Boolean(ambiguousMarker)

  if (explicitStatus === 'yes' && hasStrongNo) {
    return {
      decision: 'conflict',
      confidence: 'high',
      shouldPromote: false,
      signals: [makeSignal('structured_status', 'halal_status=yes', 'high'), ...signals],
    }
  }

  if (explicitStatus === 'no' && (hasStrongYes || hasTextYes)) {
    return {
      decision: 'conflict',
      confidence: 'high',
      shouldPromote: false,
      signals: [makeSignal('structured_status', 'halal_status=no', 'high'), ...signals],
    }
  }

  if (hasStrongNo && (hasStrongYes || hasTextYes)) {
    return {
      decision: 'conflict',
      confidence: 'high',
      shouldPromote: false,
      signals,
    }
  }

  if (explicitStatus === 'yes') {
    return {
      decision: 'yes',
      confidence: 'high',
      shouldPromote: true,
      signals: [makeSignal('structured_status', 'halal_status=yes', 'high'), ...signals],
    }
  }

  if (explicitStatus === 'no') {
    return {
      decision: 'no',
      confidence: 'high',
      shouldPromote: true,
      signals: [makeSignal('structured_status', 'halal_status=no', 'high'), ...signals],
    }
  }

  if (hasStrongNo) {
    return {
      decision: 'no',
      confidence: 'high',
      shouldPromote: true,
      signals,
    }
  }

  if (hasStrongYes) {
    return {
      decision: 'yes',
      confidence: 'high',
      shouldPromote: true,
      signals,
    }
  }

  if (hasTextYes && hasAmbiguous) {
    return {
      decision: 'review',
      confidence: 'medium',
      shouldPromote: false,
      signals,
    }
  }

  if (hasTextYes) {
    return {
      decision: 'yes',
      confidence: 'medium',
      shouldPromote: false,
      signals,
    }
  }

  if (hasAmbiguous) {
    return {
      decision: 'review',
      confidence: 'low',
      shouldPromote: false,
      signals,
    }
  }

  return {
    decision: 'unknown',
    confidence: 'low',
    shouldPromote: false,
    signals,
  }
}

export {
  HALAL_YES_MARKERS,
  HALAL_NO_MARKERS,
  HALAL_AMBIGUOUS_MARKERS,
  normalizeHalalText,
  tokenizeHalalText,
  normalizeHalalStatus,
}
