const ISSUE_TAGS = {
  internal_label_leak: 'internal_label_leak',
  outside_store_product: 'outside_store',
  unsafe_allergy_wording: 'unsafe_allergy',
  uncontrolled_external_data: 'external_data',
  empty_reply: 'too_generic',
  too_verbose: 'too_verbose',
}

export const DEFAULT_LIVE_QA_SCENARIOS = [
  {
    id: 'L-G-01',
    mode: 'general',
    lang: 'ru',
    intent: 'meal_set',
    prompt: 'Соберите продукты для плова',
  },
  {
    id: 'L-G-02',
    mode: 'general',
    lang: 'ru',
    intent: 'budget',
    prompt: 'Что купить на ужин до 5000 ₸?',
  },
  {
    id: 'L-G-03',
    mode: 'general',
    lang: 'ru',
    intent: 'halal',
    prompt: 'Покажите халал-сладости',
  },
  {
    id: 'L-G-04',
    mode: 'general',
    lang: 'ru',
    intent: 'child_snack',
    prompt: 'Что можно ребёнку на перекус?',
  },
  {
    id: 'L-G-05',
    mode: 'general',
    lang: 'ru',
    intent: 'no_match',
    prompt: 'Есть манго?',
  },
  {
    id: 'L-G-06',
    mode: 'general',
    lang: 'ru',
    intent: 'allergy',
    prompt: 'Мне нельзя молоко, что из сладкого можно?',
  },
  {
    id: 'L-P-01',
    mode: 'product',
    lang: 'ru',
    intent: 'halal',
    productKey: 'simpleUnknownHalal',
    prompt: 'Можно ли считать халал?',
  },
  {
    id: 'L-P-02',
    mode: 'product',
    lang: 'ru',
    intent: 'allergy',
    productKey: 'milkAllergen',
    prompt: 'Есть риск для моих аллергий?',
  },
  {
    id: 'L-P-03',
    mode: 'product',
    lang: 'ru',
    intent: 'alternatives',
    productKey: 'milkAllergen',
    prompt: 'Есть вариант лучше?',
  },
  {
    id: 'L-P-04',
    mode: 'product',
    lang: 'ru',
    intent: 'missing_product_facts',
    productKey: 'missingComposition',
    prompt: 'Что проверить на упаковке?',
  },
  {
    id: 'L-KZ-G-01',
    mode: 'general',
    lang: 'kz',
    intent: 'meal_set',
    prompt: 'Палау үшін өнімдер жинап беріңіз',
  },
  {
    id: 'L-KZ-G-02',
    mode: 'general',
    lang: 'kz',
    intent: 'child_snack',
    prompt: 'Балаға тіскебасар не алуға болады?',
  },
  {
    id: 'L-KZ-P-01',
    mode: 'product',
    lang: 'kz',
    intent: 'missing_product_facts',
    productKey: 'missingComposition',
    prompt: 'Қаптамадан нені тексеру керек?',
  },
]

function normalizeIds(ids) {
  if (!ids) return null
  const list = Array.isArray(ids) ? ids : String(ids).split(',')
  const normalized = list.map((id) => String(id).trim()).filter(Boolean)
  return normalized.length > 0 ? new Set(normalized) : null
}

export function getLiveQAScenarios({ ids = null, limit = null } = {}) {
  const allowedIds = normalizeIds(ids)
  let scenarios = allowedIds
    ? DEFAULT_LIVE_QA_SCENARIOS.filter((scenario) => allowedIds.has(scenario.id))
    : DEFAULT_LIVE_QA_SCENARIOS.slice()

  const numericLimit = Number(limit)
  if (Number.isFinite(numericLimit) && numericLimit > 0) {
    scenarios = scenarios.slice(0, numericLimit)
  }

  return scenarios
}

function getIssueTag(code) {
  return ISSUE_TAGS[code] || code
}

function increment(target, key) {
  target[key] = (target[key] || 0) + 1
}

export function summarizeLiveQAResults(results = []) {
  const summary = {
    total: results.length,
    pass: 0,
    review: 0,
    fail: 0,
    issueTags: {},
  }

  for (const result of results) {
    const status = result?.evaluation?.status || 'fail'
    if (status === 'pass') summary.pass += 1
    else if (status === 'review') summary.review += 1
    else summary.fail += 1

    for (const issue of result?.evaluation?.issues || []) {
      increment(summary.issueTags, getIssueTag(issue.code))
    }
  }

  return summary
}
