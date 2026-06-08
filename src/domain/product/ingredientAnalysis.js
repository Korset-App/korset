import { getAllergenName } from '../../constants/allergens.js'
import { ALLERGEN_SYNONYMS } from '../../constants/allergenSynonyms.js'

const TONE_PRIORITY = {
  neutral: 0,
  info: 1,
  additive: 2,
  warning: 3,
  danger: 4,
}

const ADDITIVE_PATTERNS = [
  'эмульгатор',
  'ароматизатор',
  'стабилизатор',
  'консервант',
  'краситель',
  'регулятор кислотности',
  'подсластитель',
  'загуститель',
  'антиокислитель',
  'разрыхлитель',
  'диоксид кремния',
  'каррагинан',
  'лецитин',
  {
    id: 'additive:модифицированный крахмал',
    label: 'модифицированный крахмал',
    terms: ['модифицированный крахмал', 'крахмал модифицированный'],
  },
  'влагоудерживающий агент',
  'глазирователь',
  'агент глазирователь',
  'усилитель вкуса',
  'глицерин',
  'пирофосфат',
  'фосфат',
  'сорбат',
  'бензоат',
  'нитрит',
  'нитрат',
  'лимонная кислота',
]

const NOTEWORTHY_PATTERNS = [
  {
    id: 'info:инвертный сироп',
    label: 'инвертный сироп',
    terms: ['инвертный сироп'],
    reasonKey: 'product.ingredients.reason.syrup',
    descriptionKey: 'product.ingredients.description.syrup',
  },
  {
    id: 'info:глюкозный сироп',
    label: 'глюкозный сироп',
    terms: ['глюкозный сироп'],
    reasonKey: 'product.ingredients.reason.syrup',
    descriptionKey: 'product.ingredients.description.syrup',
  },
  {
    id: 'info:растительные жиры',
    label: 'растительные жиры',
    terms: ['растительные жиры', 'жиры растительные', 'растительные масла', 'масла растительные'],
    reasonKey: 'product.ingredients.reason.vegetableFats',
    descriptionKey: 'product.ingredients.description.vegetableFats',
  },
  {
    id: 'info:пальмовое масло',
    label: 'пальмовое масло',
    terms: ['пальмовое', 'пальмовый', 'пальмового', 'пальмовое масло', 'масло пальмовое'],
    reasonKey: 'product.ingredients.reason.palmOil',
    descriptionKey: 'product.ingredients.description.palmOil',
  },
  {
    id: 'info:масло ши',
    label: 'масло ши',
    terms: ['масло ши', 'жир ши', 'ши'],
    reasonKey: 'product.ingredients.reason.sheaFat',
    descriptionKey: 'product.ingredients.description.sheaFat',
    rangeFilter: (text, range) => {
      const before = normalizeText(text.slice(Math.max(0, range.start - 38), range.start))
      const after = normalizeText(text.slice(range.end, Math.min(text.length, range.end + 18)))
      return before.includes('растительн') || before.includes('пальмов') || after.startsWith(')')
    },
  },
  {
    id: 'info:мальтодекстрин',
    label: 'мальтодекстрин',
    terms: ['мальтодекстрин'],
    reasonKey: 'product.ingredients.reason.fastCarb',
    descriptionKey: 'product.ingredients.description.fastCarb',
  },
  {
    id: 'info:декстроза',
    label: 'декстроза',
    terms: ['декстроза'],
    reasonKey: 'product.ingredients.reason.fastCarb',
    descriptionKey: 'product.ingredients.description.fastCarb',
  },
  {
    id: 'info:фруктоза',
    label: 'фруктоза',
    terms: ['фруктоза'],
    reasonKey: 'product.ingredients.reason.fastCarb',
    descriptionKey: 'product.ingredients.description.fastCarb',
  },
  {
    id: 'info:глюкозно-фруктозный сироп',
    label: 'глюкозно-фруктозный сироп',
    terms: ['глюкозно-фруктозный сироп', 'глюкозно фруктозный сироп'],
    reasonKey: 'product.ingredients.reason.syrup',
    descriptionKey: 'product.ingredients.description.syrup',
  },
  {
    id: 'info:патока',
    label: 'патока',
    terms: ['патока'],
    reasonKey: 'product.ingredients.reason.fastCarb',
    descriptionKey: 'product.ingredients.description.fastCarb',
  },
]

const HALAL_SENSITIVE_PATTERNS = [
  'желатин',
  'сычужный фермент',
  'фермент животного происхождения',
  'кармин',
  'кошениль',
  'шеллак',
  'глицерин',
  'e120',
  'e904',
  'e471',
  'e472',
]

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
}

function normalizeECode(value) {
  return String(value || '')
    .replace(/\s|-/g, '')
    .toUpperCase()
}

function includesHalalProfile(profile = {}) {
  return Boolean(
    profile.halal ||
    profile.halalOnly ||
    profile.halalStrict ||
    (Array.isArray(profile.religion) && profile.religion.includes('halal'))
  )
}

function countIngredients(text) {
  return String(text || '')
    .split(/[,;]/g)
    .map((item) => item.trim())
    .filter(Boolean).length
}

function findTermRanges(text, term) {
  const ranges = []
  const normalizedText = normalizeText(text)
  const normalizedTerm = normalizeText(term)
  if (!normalizedText || !normalizedTerm) return ranges

  let from = 0
  while (from < normalizedText.length) {
    const index = normalizedText.indexOf(normalizedTerm, from)
    if (index === -1) break
    ranges.push({ start: index, end: index + normalizedTerm.length })
    from = index + Math.max(normalizedTerm.length, 1)
  }
  return ranges
}

function createCandidate({
  id,
  kind,
  tone,
  label,
  labelKey,
  reasonKey,
  terms,
  priority,
  rangeFilter,
}) {
  return {
    id,
    kind,
    tone,
    label,
    labelKey,
    reasonKey,
    terms,
    priority: priority ?? TONE_PRIORITY[tone] ?? 0,
    rangeFilter,
  }
}

function isTraceRange(text, range) {
  const before = normalizeText(text.slice(Math.max(0, range.start - 42), range.start))
  return before.includes('след') || before.includes('может содерж')
}

function getProfileAllergenIds(profile = {}) {
  const ids = new Set(Array.isArray(profile.allergens) ? profile.allergens : [])
  if (Array.isArray(profile.healthConditions) && profile.healthConditions.includes('celiac')) {
    ids.add('gluten')
  }
  if (Array.isArray(profile.dietGoals) && profile.dietGoals.includes('gluten_free')) {
    ids.add('gluten')
  }
  return [...ids].map((id) => String(id).replace(/^en:/, ''))
}

function buildAllergenCandidates(profile = {}, lang = 'ru') {
  const profileAllergens = getProfileAllergenIds(profile)
  return profileAllergens
    .filter((id) => ALLERGEN_SYNONYMS[id])
    .map((id) =>
      createCandidate({
        id: `allergen:${id}`,
        kind: 'allergen',
        tone: 'danger',
        label: getAllergenName(id, lang),
        reasonKey: 'product.ingredients.reason.profileAllergen',
        terms: ALLERGEN_SYNONYMS[id],
      })
    )
}

function buildTraceCandidates(product = {}, profile = {}, lang = 'ru') {
  const profileAllergens = new Set(getProfileAllergenIds(profile))
  const traces = Array.isArray(product.traces) ? product.traces : []
  return traces
    .map((trace) => String(trace).replace(/^en:/, ''))
    .filter((id) => profileAllergens.has(id) && ALLERGEN_SYNONYMS[id])
    .map((id) =>
      createCandidate({
        id: `trace:${id}`,
        kind: 'trace',
        tone: 'warning',
        label: getAllergenName(id, lang),
        reasonKey: 'product.ingredients.reason.traceAllergen',
        terms: ALLERGEN_SYNONYMS[id],
        priority: TONE_PRIORITY.danger + 1,
        rangeFilter: isTraceRange,
      })
    )
}

function buildHalalCandidates(product = {}, profile = {}) {
  if (!includesHalalProfile(profile)) return []
  if (product.halalStatus === 'yes') return []

  return HALAL_SENSITIVE_PATTERNS.map((term) =>
    createCandidate({
      id: `halal:${term.toLowerCase().startsWith('e') ? normalizeECode(term) : term}`,
      kind: 'halal',
      tone: 'warning',
      label: term.toUpperCase().startsWith('E') ? normalizeECode(term) : term,
      reasonKey: 'product.ingredients.reason.halalSensitive',
      terms: [term],
    })
  )
}

function buildAdditiveCandidates() {
  return ADDITIVE_PATTERNS.map((pattern) => {
    const item = typeof pattern === 'string' ? { label: pattern, terms: [pattern] } : pattern
    return createCandidate({
      id: item.id || `additive:${item.label}`,
      kind: 'additive',
      tone: 'additive',
      label: item.label,
      reasonKey: 'product.ingredients.reason.additive',
      terms: item.terms,
    })
  })
}

function buildECodeCandidates(text) {
  const seen = new Set()
  const matches = String(text || '').match(/\bE\s?-?\d{3,4}[a-z]?\b/gi) || []
  return matches
    .map(normalizeECode)
    .filter((code) => {
      if (seen.has(code)) return false
      seen.add(code)
      return true
    })
    .map((code) =>
      createCandidate({
        id: `ecode:${code}`,
        kind: 'additive',
        tone: 'additive',
        label: code,
        reasonKey: 'product.ingredients.reason.ecode',
        terms: [code, code.replace('E', 'E-')],
      })
    )
}

function buildNoteworthyCandidates() {
  return NOTEWORTHY_PATTERNS.map((item) =>
    createCandidate({
      id: item.id,
      kind: 'info',
      tone: 'info',
      label: item.label,
      reasonKey: item.reasonKey,
      descriptionKey: item.descriptionKey,
      terms: item.terms,
      rangeFilter: item.rangeFilter,
    })
  )
}

function withRanges(text, candidates) {
  return candidates
    .map((candidate) => {
      const ranges = candidate.terms
        .flatMap((term) => findTermRanges(text, term))
        .filter((range) => (candidate.rangeFilter ? candidate.rangeFilter(text, range) : true))
      return { ...candidate, ranges }
    })
    .filter((candidate) => candidate.ranges.length > 0)
}

function selectRanges(candidates) {
  const ranges = candidates.flatMap((candidate) =>
    candidate.ranges.map((range) => ({
      ...range,
      highlightId: candidate.id,
      priority: candidate.priority,
      length: range.end - range.start,
    }))
  )

  const selected = []
  for (const range of ranges.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.length - a.length
  })) {
    const overlaps = selected.some((item) => range.start < item.end && range.end > item.start)
    if (!overlaps) selected.push(range)
  }

  return selected.sort((a, b) => a.start - b.start)
}

function buildTokens(text, ranges) {
  const tokens = []
  let cursor = 0
  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      tokens.push({ id: `text:${cursor}`, text: text.slice(cursor, range.start) })
    }
    tokens.push({
      id: `highlight:${index}:${range.start}`,
      text: text.slice(range.start, range.end),
      highlightId: range.highlightId,
    })
    cursor = range.end
  })
  if (cursor < text.length) tokens.push({ id: `text:${cursor}`, text: text.slice(cursor) })
  return tokens
}

function summarize(highlights, totalIngredients) {
  const counts = {
    totalIngredients,
    highlighted: highlights.length,
    conflicts: highlights.filter((item) => item.tone === 'danger' || item.tone === 'warning')
      .length,
    additives: highlights.filter((item) => item.tone === 'additive').length,
    other: highlights.filter((item) => item.tone === 'info').length,
  }

  const strongest = highlights.reduce(
    (current, item) => (TONE_PRIORITY[item.tone] > TONE_PRIORITY[current] ? item.tone : current),
    'neutral'
  )

  return {
    tone: strongest,
    counts,
    titleKey: `product.ingredients.summary.${strongest}.title`,
    bodyKey: `product.ingredients.summary.${strongest}.body`,
  }
}

export function analyzeProductIngredients({ product = {}, profile = {}, lang = 'ru' } = {}) {
  const text = lang === 'kz' && product.ingredientsKz ? product.ingredientsKz : product.ingredients
  if (!text) {
    return {
      text: '',
      tokens: [],
      highlights: [],
      summary: summarize([], 0),
    }
  }

  const candidates = withRanges(text, [
    ...buildAllergenCandidates(profile, lang),
    ...buildTraceCandidates(product, profile, lang),
    ...buildHalalCandidates(product, profile),
    ...buildAdditiveCandidates(),
    ...buildECodeCandidates(text),
    ...buildNoteworthyCandidates(),
  ])
  const selectedRanges = selectRanges(candidates)
  const selectedIds = new Set(selectedRanges.map((range) => range.highlightId))
  const highlights = candidates
    .filter((candidate) => selectedIds.has(candidate.id))
    .map(
      ({
        terms: _terms,
        ranges,
        priority: _priority,
        rangeFilter: _rangeFilter,
        ...candidate
      }) => ({
        ...candidate,
        matchedText: text.slice(ranges[0].start, ranges[0].end),
        aiQuestionKey: `product.ingredients.aiQuestion.${candidate.kind}`,
      })
    )
    .sort((a, b) => {
      if (TONE_PRIORITY[b.tone] !== TONE_PRIORITY[a.tone]) {
        return TONE_PRIORITY[b.tone] - TONE_PRIORITY[a.tone]
      }
      return a.label.localeCompare(b.label, lang === 'kz' ? 'kk' : 'ru')
    })

  return {
    text,
    tokens: buildTokens(text, selectedRanges),
    highlights,
    summary: summarize(highlights, countIngredients(text)),
  }
}
