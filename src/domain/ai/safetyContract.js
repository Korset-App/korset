import { ALLERGEN_SYNONYMS } from '../../constants/allergenSynonyms.js'

const HALAL_CONFIDENCE_PRIORITY = {
  confirmed_halal: 1,
  likely_compatible: 2,
  questionable: 3,
  not_halal: 4,
  insufficient_data: 5,
}

const HARAM_TERMS = [
  'pork',
  'swine',
  'lard',
  'bacon',
  'ham',
  'prosciutto',
  'alcohol',
  'ethanol',
  'wine',
  'beer',
  'rum',
  'свинина',
  'свиной',
  'свиная',
  'свиные',
  'бекон',
  'ветчина',
  'алкоголь',
  'этанол',
  'вино',
  'пиво',
]

const AMBIGUOUS_HALAL_TERMS = [
  'gelatin',
  'gelatine',
  'flavoring',
  'flavouring',
  'flavor',
  'flavour',
  'enzyme',
  'enzymes',
  'emulsifier',
  'emulsifiers',
  'rennet',
  'e120',
  'e441',
  'желатин',
  'ароматизатор',
  'ароматизаторы',
  'фермент',
  'ферменты',
  'эмульгатор',
  'эмульгаторы',
  'сычужный',
]

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
}

function normalizeAllergen(value) {
  return normalizeText(value).replace(/^en:/, '').trim()
}

function uniqueMatches(text, terms) {
  const result = []
  for (const term of terms) {
    const normalizedTerm = normalizeText(term)
    const overlapsExisting = result.some((match) => {
      const normalizedMatch = normalizeText(match)
      return normalizedMatch.includes(normalizedTerm) || normalizedTerm.includes(normalizedMatch)
    })
    if (text.includes(normalizedTerm) && !overlapsExisting) result.push(term)
  }
  return result
}

export function getHalalConfidence(product = {}) {
  if (product.halalStatus === 'yes') {
    return {
      level: 'confirmed_halal',
      priority: HALAL_CONFIDENCE_PRIORITY.confirmed_halal,
      source: 'trusted_status',
    }
  }

  if (product.halalStatus === 'no') {
    return {
      level: 'not_halal',
      priority: HALAL_CONFIDENCE_PRIORITY.not_halal,
      source: 'trusted_status',
    }
  }

  const ingredients = normalizeText(product.ingredients || product.ingredientsKz)
  if (!ingredients) {
    return {
      level: 'insufficient_data',
      priority: HALAL_CONFIDENCE_PRIORITY.insufficient_data,
      source: 'missing_ingredients',
    }
  }

  const haramMatches = uniqueMatches(ingredients, HARAM_TERMS)
  if (haramMatches.length > 0) {
    return {
      level: 'not_halal',
      priority: HALAL_CONFIDENCE_PRIORITY.not_halal,
      source: 'haram_ingredients',
      matches: haramMatches,
    }
  }

  const ambiguousMatches = uniqueMatches(ingredients, AMBIGUOUS_HALAL_TERMS)
  if (ambiguousMatches.length > 0) {
    return {
      level: 'questionable',
      priority: HALAL_CONFIDENCE_PRIORITY.questionable,
      source: 'ambiguous_ingredients',
      matches: ambiguousMatches,
    }
  }

  return {
    level: 'likely_compatible',
    priority: HALAL_CONFIDENCE_PRIORITY.likely_compatible,
    source: 'visible_ingredients',
  }
}

export function getAllergyConfidence(product = {}, profile = {}) {
  const profileAllergens = Array.isArray(profile?.allergens)
    ? profile.allergens.map(normalizeAllergen).filter(Boolean)
    : []
  const productAllergens = Array.isArray(product?.allergens)
    ? product.allergens.map(normalizeAllergen).filter(Boolean)
    : []

  const matches = productAllergens.filter((allergen) => profileAllergens.includes(allergen))
  if (matches.length > 0) {
    return {
      level: 'direct_match',
      source: 'allergen_fields',
      matches,
    }
  }

  const ingredients = normalizeText(product.ingredients || product.ingredientsKz)
  if (profileAllergens.length > 0 && !ingredients) {
    return {
      level: 'insufficient_data',
      source: 'missing_ingredients',
      matches: [],
    }
  }

  const ingredientMatches = profileAllergens.filter((allergen) => {
    const synonyms = ALLERGEN_SYNONYMS[allergen] || []
    return synonyms.some((synonym) => ingredients.includes(normalizeText(synonym)))
  })
  if (ingredientMatches.length > 0) {
    return {
      level: 'direct_match',
      source: 'ingredient_parse',
      matches: ingredientMatches,
    }
  }

  return {
    level: profileAllergens.length > 0 ? 'no_known_match' : 'not_personalized',
    source: productAllergens.length > 0 || ingredients ? 'known_product_data' : 'missing_profile',
    matches: [],
  }
}

function buildHalalNote(halal, lang) {
  if (lang === 'kz') {
    if (halal.level === 'confirmed_halal') return 'Тауар деректерінде halal ретінде белгіленген.'
    if (halal.level === 'likely_compatible') {
      return 'Көрінетін құрамда айқын тыйым салынған компоненттер көрінбейді, бірақ сертификат көрсетілмеген. Бұл сіз үшін қатаң болса, қаптамадағы таңбалауды тексеріңіз.'
    }
    if (halal.level === 'questionable') {
      return 'Halal мәртебесі күмәнді: құрамда шығу тегін тексеру маңызды ингредиенттер бар.'
    }
    if (halal.level === 'not_halal') return 'Тауар деректері бойынша halal ретінде сәйкес келмейді.'
    return 'Құрам туралы дерек аз, сондықтан halal мәртебесін сенімді бағалай алмаймын.'
  }

  if (halal.level === 'confirmed_halal') return 'По данным карточки товар отмечен как халал.'
  if (halal.level === 'likely_compatible') {
    return 'По видимому составу явных запрещённых компонентов не видно, но сертификат не указан. Если для вас это строго, проверьте упаковку и halal-маркировку.'
  }
  if (halal.level === 'questionable') {
    return 'Halal-статус сомнительный: в составе есть ингредиенты, происхождение которых важно проверить.'
  }
  if (halal.level === 'not_halal') return 'По данным карточки товар не подходит как халал.'
  return 'В карточке мало данных о составе, поэтому я не могу уверенно оценить halal-статус.'
}

function buildAllergyNote(allergy, lang) {
  if (allergy.level === 'direct_match') {
    const list = allergy.matches.join(', ')
    return lang === 'kz'
      ? `Профильдегі аллергенмен сәйкестік бар: ${list}. Аллергия күшті болса, бұл тауарды ұсынба.`
      : `Есть совпадение с аллергенами профиля: ${list}. Если аллергия сильная, не рекомендуй этот товар.`
  }

  if (allergy.level === 'insufficient_data') {
    return lang === 'kz'
      ? 'Пайдаланушыда аллергендер бар, ал құрам дерегі толық емес. Қаптамадағы құрам мен аллерген іздерін тексеруді ұсын.'
      : 'У пользователя есть аллергены, а данные о составе неполные. Посоветуй проверить состав и следы аллергенов на упаковке.'
  }

  return ''
}

export function buildSafetyNotes({ product = {}, profile = {}, lang = 'ru' } = {}) {
  const halal = getHalalConfidence(product)
  const allergy = getAllergyConfidence(product, profile)
  const userNotes = [buildHalalNote(halal, lang), buildAllergyNote(allergy, lang)].filter(Boolean)

  return {
    halal,
    allergy,
    userNotes,
  }
}
