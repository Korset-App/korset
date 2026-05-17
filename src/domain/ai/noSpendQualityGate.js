import { evaluateAIResponseQuality } from './qualityEvaluator.js'

const STORE_EANS = [
  '4870000000011',
  '4870000000022',
  '4870000000033',
  '4870000000044',
  '4870000000055',
  '4870000000066',
  '4870000000077',
  '4870000000088',
]

const ISSUE_TAGS = {
  internal_label_leak: 'internal_label_leak',
  outside_store_product: 'outside_store',
  unsafe_allergy_wording: 'unsafe_allergy',
  uncontrolled_external_data: 'external_data',
  visible_markdown: 'visible_markdown',
  missing_next_step: 'missing_next_step',
  empty_reply: 'too_generic',
  too_verbose: 'too_verbose',
}

export const DEFAULT_NO_SPEND_QA_SCENARIOS = [
  {
    id: 'NS-RU-G-01',
    mode: 'general',
    lang: 'ru',
    intent: 'meal_set',
    prompt: 'Соберите продукты для плова',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Для плова в этом магазине я бы собрал основу из риса, моркови и масла. Ниже варианты из текущего каталога; мясо добавляйте только если оно видно в наличии.',
      productGroups: [
        {
          products: [
            { ean: '4870000000011', name: 'Рис' },
            { ean: '4870000000022', name: 'Морковь' },
          ],
        },
      ],
    },
  },
  {
    id: 'NS-RU-G-02',
    mode: 'general',
    lang: 'ru',
    intent: 'budget',
    prompt: 'Что купить на ужин до 5000 ₸?',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Для ужина до 5000 ₸ лучше взять простую связку из крупы, овощей и напитка. Я ориентируюсь только на видимые цены и наличие в этом магазине.',
      productGroups: [
        {
          products: [
            { ean: '4870000000011', name: 'Рис' },
            { ean: '4870000000033', name: 'Вода' },
          ],
        },
      ],
    },
  },
  {
    id: 'NS-RU-G-03',
    mode: 'general',
    lang: 'ru',
    intent: 'halal',
    prompt: 'Покажите халал-сладости',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'В этом магазине сначала стоит смотреть сладости с явной halal-маркировкой. Если сертификата нет, я отмечаю это как менее уверенный вариант и советую проверить упаковку.',
      productGroups: [
        {
          products: [{ ean: '4870000000044', name: 'Печенье halal' }],
        },
      ],
    },
  },
  {
    id: 'NS-RU-G-04',
    mode: 'general',
    lang: 'ru',
    intent: 'child_snack',
    prompt: 'Что можно ребенку на перекус?',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Для ребенка я бы начал с нейтральных вариантов из текущего магазина и проверил состав, сахар и следы аллергенов на упаковке. Возраст и аллергии лучше уточнить.',
      productGroups: [
        {
          products: [{ ean: '4870000000055', name: 'Яблочное пюре' }],
        },
      ],
    },
  },
  {
    id: 'NS-RU-G-05',
    mode: 'general',
    lang: 'ru',
    intent: 'no_match',
    prompt: 'Есть манго?',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Манго в видимом каталоге этого магазина я не вижу. Могу показать похожие фрукты или соки, если они есть в наличии.',
      productGroups: [],
    },
  },
  {
    id: 'NS-RU-G-06',
    mode: 'general',
    lang: 'ru',
    intent: 'allergy',
    prompt: 'Мне нельзя молоко, что из сладкого можно?',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Я бы выбирал сладости без молочных аллергенов в карточке и все равно проверил следы молока на упаковке. Товары с прямым молочным аллергеном лучше не брать.',
      productGroups: [
        {
          products: [{ ean: '4870000000066', name: 'Печенье без молока' }],
        },
      ],
    },
  },
  {
    id: 'NS-RU-P-01',
    mode: 'product',
    lang: 'ru',
    intent: 'alternatives',
    prompt: 'Есть вариант лучше?',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Если нужен более подходящий вариант, я бы посмотрел альтернативу ниже из этого же магазина. Перед покупкой проверьте состав и следы аллергенов на упаковке.',
      alternatives: [{ ean: '4870000000066', name: 'Печенье без молока' }],
    },
  },
  {
    id: 'NS-RU-P-02',
    mode: 'product',
    lang: 'ru',
    intent: 'missing_product_facts',
    prompt: 'Какой состав?',
    response: {
      reply:
        'В карточке товара состава нет, поэтому я не могу уверенно разобрать ингредиенты. Проверьте состав, следы аллергенов и halal-маркировку на упаковке.',
    },
  },
  {
    id: 'NS-KZ-G-01',
    mode: 'general',
    lang: 'kz',
    intent: 'meal_set',
    prompt: 'Палау үшін өнімдер жинап беріңіз',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Палау үшін осы дүкендегі күріш, сәбіз және май сияқты негізгі өнімдерден бастаған дұрыс. Төмендегі тауарлар ағымдағы каталогтан алынған.',
      productGroups: [
        {
          products: [
            { ean: '4870000000011', name: 'Күріш' },
            { ean: '4870000000022', name: 'Сәбіз' },
          ],
        },
      ],
    },
  },
  {
    id: 'NS-KZ-G-02',
    mode: 'general',
    lang: 'kz',
    intent: 'halal',
    prompt: 'Халал тәттілерді көрсетіңіз',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Алдымен halal белгісі бар тәттілерді қараған дұрыс. Егер сертификат көрсетілмесе, қаптамадағы белгіні тексеріңіз.',
      productGroups: [
        {
          products: [{ ean: '4870000000044', name: 'Halal печенье' }],
        },
      ],
    },
  },
  {
    id: 'NS-KZ-G-03',
    mode: 'general',
    lang: 'kz',
    intent: 'child_snack',
    prompt: 'Балаға тіскебасар не алуға болады?',
    storeProductEans: STORE_EANS,
    response: {
      reply:
        'Балаға бейтарап нұсқалардан бастаған дұрыс. Қаптамадан құрамын, қант мөлшерін және аллерген іздерін тексеріңіз.',
      productGroups: [
        {
          products: [{ ean: '4870000000055', name: 'Алма езбесі' }],
        },
      ],
    },
  },
  {
    id: 'NS-KZ-P-01',
    mode: 'product',
    lang: 'kz',
    intent: 'missing_product_facts',
    prompt: 'Құрамы қандай?',
    response: {
      reply:
        'Карточкада құрам туралы дерек жоқ, сондықтан нақты баға бере алмаймын. Қаптамадан құрамын, аллерген іздерін және halal белгісін тексеріңіз.',
    },
  },
]

function getIssueTag(code) {
  return ISSUE_TAGS[code] || code
}

function increment(map, key) {
  map[key] = (map[key] || 0) + 1
}

function emptySummary() {
  return {
    pass: 0,
    review: 0,
    fail: 0,
  }
}

export function runNoSpendAIQualityGate({ scenarios = DEFAULT_NO_SPEND_QA_SCENARIOS } = {}) {
  const summary = emptySummary()
  const issueTags = {}
  const byIntent = {}

  const results = scenarios.map((scenario) => {
    const evaluation = evaluateAIResponseQuality({
      ...(scenario.response || {}),
      storeProductEans: scenario.storeProductEans,
      allowExternalData: Boolean(scenario.allowExternalData),
      requireNextStep: Boolean(scenario.requireNextStep),
    })
    const tags = evaluation.issues.map((issue) => getIssueTag(issue.code))
    summary[evaluation.status] += 1
    increment(byIntent, `${scenario.mode}:${scenario.intent}:${evaluation.status}`)
    for (const tag of tags) increment(issueTags, tag)

    return {
      id: scenario.id,
      mode: scenario.mode,
      lang: scenario.lang,
      intent: scenario.intent,
      prompt: scenario.prompt,
      status: evaluation.status,
      score: evaluation.score,
      tags,
      issues: evaluation.issues,
    }
  })

  return {
    total: results.length,
    summary,
    issueTags,
    byIntent,
    results,
  }
}
