const DICTIONARY = {
  ru: {
    otherQuery: 'Попробовать другой запрос',
    storeProducts: 'Что есть в этом магазине?',
    categoryProducts: 'Показать товары по категории',
    halalOnly: 'Только халал',
    cheaper: 'Показать дешевле',
    compare: 'Сравнить варианты',
    inStock: 'Только в наличии',
    noAllergens: 'Без моих аллергенов',
    packagingCheck: 'Что проверить на упаковке?',
  },
  kz: {
    otherQuery: 'Басқа сұрау жасап көру',
    storeProducts: 'Бұл дүкенде не бар?',
    categoryProducts: 'Санат бойынша көрсету',
    halalOnly: 'Тек халал',
    cheaper: 'Арзанырақ көрсету',
    compare: 'Нұсқаларды салыстыру',
    inStock: 'Тек бар тауарлар',
    noAllergens: 'Менің аллергендерімсіз',
    packagingCheck: 'Қаптамадан нені тексеру керек?',
  },
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
}

function pushUnique(items, value) {
  if (value && !items.includes(value)) items.push(value)
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word))
}

export function buildGeneralAIFollowUps({
  query = '',
  catalogContext = [],
  profile = null,
  lang = 'ru',
  limit = 3,
} = {}) {
  const t = DICTIONARY[lang] || DICTIONARY.ru
  const text = normalizeText(query)
  const hasCatalog = Array.isArray(catalogContext) && catalogContext.length > 0
  const result = []

  if (!hasCatalog) {
    return [t.otherQuery, t.storeProducts, t.categoryProducts].slice(0, limit)
  }

  const profileHasAllergens = Array.isArray(profile?.allergens) && profile.allergens.length > 0
  const allergyIntent = hasAny(text, ['аллерг', 'без мол', 'лактоз', 'глютен', 'жаңғақ', 'аллерг'])
  const halalIntent = hasAny(text, ['халал', 'halal'])
  const budgetIntent = hasAny(text, ['дешев', 'арзан', 'до ', '₸', 'тенге', 'бюджет'])

  if (profileHasAllergens || allergyIntent) {
    pushUnique(result, t.noAllergens)
    pushUnique(result, t.packagingCheck)
  }

  if (halalIntent) {
    pushUnique(result, t.halalOnly)
  }

  if (budgetIntent || catalogContext.some((product) => Number.isFinite(Number(product.priceKzt)))) {
    pushUnique(result, t.cheaper)
  }

  pushUnique(result, t.compare)

  if (catalogContext.some((product) => product.stockStatus === 'out_of_stock')) {
    pushUnique(result, t.inStock)
  }

  return result.slice(0, limit)
}
