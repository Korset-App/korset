import {
  ALLERGEN_SYNONYMS,
  ASPARTAME_SYNONYMS,
  SUGAR_SYNONYMS,
} from '../constants/allergenSynonyms.js'

const EXACT_MATCH_TERMS = new Set([
  'сом',
  'сома',
  'кета',
  'кеты',
  'нерка',
  'нерки',
  'лещ',
  'леща',
  'хек',
  'хека',
  'карп',
  'карпа',
  'чир',
  'щука',
  'щуки',
  'рак',
  'раки',
  'раков',
  'рака',
  'пита',
  'питы',
  'соя',
  'сои',
  'сою',
  'соей',
  'мед',
  'меда',
  'медом',
  'меду',
  'вино',
  'вина',
  'вином',
  'ром',
  'рома',
  'ромом',
  'джин',
  'саке',
  'арак',
  'эль',
  'сало',
  'сала',
  'гусь',
  'гуся',
  'утка',
  'утки',
  'сыр',
  'сыра',
  'сыру',
  'сыром',
  'сыре',
  'сыры',
  'сыров',
  'яйцо',
  'яйца',
  'яиц',
  'рожь',
  'ржи',
  'овес',
  'лук',
  'чеснок',
  'oat',
  'oats',
  'rye',
  'bran',
  'egg',
  'eggs',
  'soy',
  'soya',
  'cod',
  'roe',
  'bass',
  'pike',
  'clam',
  'clams',
  'crab',
  'rum',
  'gin',
  'wine',
  'beer',
  'ham',
  'lard',
])

const TRACE_CLAUSE_SPLIT_REGEX =
  /(?:[.;\n]+|\b(?=(?:может\s+содержать|возможно\s+(?:наличие|содержание|присутствие)|содержит\s+следы|следы\s*:|произведено\s+на\s+(?:предприятии|оборудовании|фабрике)|производится\s+на\s+(?:предприятии|оборудовании|фабрике)|изготовлено\s+на\s+(?:линии|предприятии|оборудовании)|на\s+(?:производстве|предприятии|фабрике)\s+(?:использу|перерабатыва)|не\s+исключено\s+наличие|may\s+contain|traces\s+of|produced\s+in\s+a\s+facility|manufactured\s+on\s+(?:shared\s+)?equipment|processed\s+in\s+a\s+(?:plant|facility)|made\s+on\s+shared\s+equipment|құрамында\s+ізі\s+болуы\s+мүмкін|іздері\s+болуы\s+мүмкін)))/iu

export const TRACE_INTRO_REGEX =
  /(?:может\s+содержать|возможно\s+(?:наличие|содержание|присутствие)|содержит\s+следы|следы\s*:|произведено\s+на\s+(?:предприятии|оборудовании|фабрике)|производится\s+на\s+(?:предприятии|оборудовании|фабрике)|изготовлено\s+на\s+(?:линии|предприятии|оборудовании)|на\s+(?:производстве|предприятии|фабрике)\s+(?:использу|перерабатыва)|не\s+исключено\s+наличие|may\s+contain|traces\s+of|produced\s+in\s+a\s+facility|manufactured\s+on\s+(?:shared\s+)?equipment|processed\s+in\s+a\s+(?:plant|facility)|made\s+on\s+shared\s+equipment|құрамында\s+ізі\s+болуы\s+мүмкін|іздері\s+болуы\s+мүмкін)/iu

const NEGATION_PHRASE_REGEX =
  /(?:^|[^\p{L}\p{N}])(?:без\s+(?:добавления\s+|добавленного\s+)?|не\s+содержит\s+)(?:глютен[\p{L}]*|молок[\p{L}]*|молочн[\p{L}]*\s+продукт[\p{L}]*|лактоз[\p{L}]*|сахар[\p{L}]*|со[июяе][\p{L}]*|яиц[\p{L}]*|яйц[\p{L}]*|орех[\p{L}]*|арахис[\p{L}]*|консервант[\p{L}]*|красител[\p{L}]*|гмо|пальмов[\p{L}]*(?:\s+масл[\p{L}]*)?)(?:\s*(?:,|и|или)\s*(?:глютен[\p{L}]*|молок[\p{L}]*|лактоз[\p{L}]*|сахар[\p{L}]*|со[июяе][\p{L}]*|яиц[\p{L}]*|яйц[\p{L}]*|орех[\p{L}]*|арахис[\p{L}]*|гмо|пальмов[\p{L}]*(?:\s+масл[\p{L}]*)?))*/giu

const NEGATION_PHRASE_EN_REGEX =
  /\b(?:free\s+from|no\s+added|no|without)\s+(?:sugar|sugars|gluten|lactose|milk|dairy|soy|soya|egg|eggs|nuts|tree\s+nuts|peanuts|palm\s+oil)\b/gi

const PLANT_DAIRY_MASK_REGEX =
  /(?:(?:кокосов|миндальн|овсян|соев|рисов|гречнев|фундучн|кешью|коноплян|горохов|растительн|немолочн)[\p{L}-]*\s+(?:молок|сливк|масл|йогурт|сыр|творог|напиток)[\p{L}-]*|(?:молок|сливк|масл)[\p{L}-]*\s+(?:кокосов|миндальн|овсян|соев|рисов|гречнев|растительн|какао|ши)[\p{L}-]*|какао[-\s]*масл[\p{L}-]*|масл[\p{L}-]*\s+какао|масл[\p{L}-]*\s+ши|молочн[\p{L}-]*\s+кислот[\p{L}-]*|кислот[\p{L}-]*\s+молочн[\p{L}-]*|лактат\s+(?:кальция|натрия|калия|железа|магния)|\b(?:coconut|almond|oat|soy|soya|rice|plant|vegan|cashew|hazelnut|cocoa|shea|peanut)\s+(?:milk|cream|butter|cheese|yogurt)\b|\blactic\s+acid\b)/giu

const VEGETABLE_CAVIAR_MASK_REGEX =
  /(?:(?:кабачков|баклажанн|овощн|грибн|свекольн|томатн|морковн|тыквенн|имитированн)[\p{L}-]*\s+икр[\p{L}-]*|икр[\p{L}-]*\s+(?:из\s+)?(?:кабачк|баклажан|овощ|гриб|свекл|томат|морков|тыкв|морских\s+водорослей)[\p{L}-]*)/giu

const NON_GLUTEN_GRAIN_MASK_REGEX =
  /(?:(?:кукурузн|рисов|гречнев|картофельн|соев|кокосов|миндальн|нутов|чечевичн|горохов|амарантов|льнян|тапиоков|бобов|безглютенов)[\p{L}-]*\s+(?:хлопь|отруб|мук|крахмал|лапш|макарон|хлеб)[\p{L}-]*|(?:хлопь|отруб|мук|крахмал|лапш)[\p{L}-]*\s+(?:кукурузн|рисов|гречнев|картофельн|соев|кокосов|миндальн|нутов|чечевичн|горохов|амарантов|льнян|тапиоков|бобов|безглютенов)[\p{L}-]*|модифицированн[\p{L}-]*\s+(?:кукурузн|картофельн|тапиоков|рисов)[\p{L}-]*\s+крахмал[\p{L}-]*|(?:кукурузн|картофельн|тапиоков|рисов)[\p{L}-]*\s+модифицированн[\p{L}-]*\s+крахмал[\p{L}-]*|крахмал[\p{L}-]*\s+(?:кукурузн|картофельн|тапиоков|рисов)[\p{L}-]*\s+модифицированн[\p{L}-]*|\b(?:corn|rice|potato|tapioca|coconut|almond|buckwheat|chickpea)\s+(?:flakes|bran|flour|starch)\b)/giu

const NON_TREE_NUT_MASK_REGEX =
  /(?:(?:мускатн|кокосов|землян)[\p{L}-]*\s+орех[\p{L}-]*|орех[\p{L}-]*\s+(?:мускатн|кокосов|землян)[\p{L}-]*)/giu

const PLANT_MEAT_MASK_REGEX =
  /(?:(?:соев|растительн|веганск|пшеничн|горохов)[\p{L}-]*\s+(?:мяс|фарш|белок|котлет|колбас|сосиск)[\p{L}-]*|(?:мяс|фарш)[\p{L}-]*\s+(?:соев|растительн|веганск)[\p{L}-]*)/giu

const NON_ALCOHOL_HARAM_MASK_REGEX =
  /(?:винн[\p{L}-]*\s+кислот[\p{L}-]*|кислот[\p{L}-]*\s+винн[\p{L}-]*|виннокаменн[\p{L}-]*|виноград[\p{L}-]*|винн[\p{L}-]*\s+уксус[\p{L}-]*|уксус[\p{L}-]*\s+винн[\p{L}-]*|пивн[\p{L}-]*\s+дрожж[\p{L}-]*|дрожж[\p{L}-]*\s+пивн[\p{L}-]*|ромов[\p{L}-]*\s+баб[\p{L}-]*|имбирн[\p{L}-]*\s+пив[\p{L}-]*|пив[\p{L}-]*\s+имбирн[\p{L}-]*|безалкогольн[\p{L}-]*\s+(?:пив|вин)[\p{L}-]*|(?:пив|вин)[\p{L}-]*\s+безалкогольн[\p{L}-]*)/giu

const SUNFLOWER_LECITHIN_MASK_REGEX =
  /(?:подсолнечн[\p{L}-]*\s+лецитин[\p{L}-]*(?:\s*\(\s*e\s*322\s*\))?|лецитин[\p{L}-]*\s+подсолнечн[\p{L}-]*(?:\s*\(\s*e\s*322\s*\))?)/giu

export function normalizeCompositionText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
}

export function splitCompositionClauses(rawText) {
  const normalized = normalizeCompositionText(rawText)
  if (!normalized.trim()) {
    return {
      mainText: '',
      traceText: '',
      negatedText: '',
    }
  }

  const rawClauses = normalized.split(TRACE_CLAUSE_SPLIT_REGEX)
  const mainClauses = []
  const traceClauses = []

  for (const clause of rawClauses) {
    const trimmed = clause.trim()
    if (!trimmed) continue
    if (TRACE_INTRO_REGEX.test(trimmed)) {
      traceClauses.push(trimmed)
    } else {
      mainClauses.push(trimmed)
    }
  }

  let mainText = mainClauses.join(' . ')
  const negatedMatches = []

  mainText = mainText.replace(NEGATION_PHRASE_REGEX, (match) => {
    negatedMatches.push(match.trim())
    return ' '
  })
  mainText = mainText.replace(NEGATION_PHRASE_EN_REGEX, (match) => {
    negatedMatches.push(match.trim())
    return ' '
  })

  return {
    mainText: mainText.replace(/\s+/g, ' ').trim(),
    traceText: traceClauses.join(' . ').replace(/\s+/g, ' ').trim(),
    negatedText: negatedMatches.join(' ; '),
  }
}

export function maskTextForDomain(text, domain) {
  if (!text) return ''
  let masked = text
  if (domain === 'milk' || domain === 'lactose' || domain === 'vegan') {
    masked = masked.replace(PLANT_DAIRY_MASK_REGEX, ' ')
  }
  if (domain === 'fish' || domain === 'vegan' || domain === 'vegetarian') {
    masked = masked.replace(VEGETABLE_CAVIAR_MASK_REGEX, ' ')
  }
  if (domain === 'gluten') {
    masked = masked.replace(NON_GLUTEN_GRAIN_MASK_REGEX, ' ')
  }
  if (domain === 'tree_nuts') {
    masked = masked.replace(NON_TREE_NUT_MASK_REGEX, ' ')
  }
  if (domain === 'soy') {
    masked = masked.replace(SUNFLOWER_LECITHIN_MASK_REGEX, ' ')
  }
  if (domain === 'vegan' || domain === 'vegetarian' || domain === 'halal') {
    masked = masked.replace(PLANT_MEAT_MASK_REGEX, ' ')
  }
  if (domain === 'halal') {
    masked = masked.replace(NON_ALCOHOL_HARAM_MASK_REGEX, ' ')
  }
  return masked
}

export function isBlockedWordForStem(stem, word) {
  if (stem === 'сельд') {
    return word.startsWith('сельдере')
  }
  if (stem === 'сыр' || stem === 'сырн') {
    return /^сыр(?:ье|ья|ью|ьем|ой|ого|ому|ым|ом|ая|ую|ое|ые|ых|ыми|ость|окопч|овялен|оежк|омолот|омя)/u.test(
      word
    )
  }
  if (stem === 'сахар' || stem === 'сахароз') {
    return /^сахар(?:ин|озаменит)/u.test(word)
  }
  if (stem === 'мед') {
    return /^мед(?:ь|и|ью|ный|ная|ное|ные|ного|ицин|лен)/u.test(word)
  }
  if (stem === 'гус') {
    return /^гус(?:т|ениц|ар)/u.test(word)
  }
  if (stem === 'утк') {
    return /^утк(?:ос|ать)/u.test(word)
  }
  if (stem === 'пита') {
    return /^пита(?:н|тель|й|ть)/u.test(word)
  }
  if (stem === 'рак' || stem === 'раков') {
    return /^рак(?:ушк|итник|урс|ет|овин)/u.test(word)
  }
  if (stem === 'орех' || stem === 'орехов') {
    return /^орехоплод/u.test(word)
  }
  if (stem === 'egg') {
    return /^eggplant/i.test(word)
  }
  if (stem === 'butter') {
    return /^butter(?:nut|fly)/i.test(word)
  }
  return false
}

export function isWordMatchingStem(word, rawStem) {
  const normalizedWord = normalizeCompositionText(word).trim()
  const stem = normalizeCompositionText(rawStem).trim()
  if (!normalizedWord || !stem) return false
  if (EXACT_MATCH_TERMS.has(stem)) {
    return normalizedWord === stem
  }
  return normalizedWord.startsWith(stem) && !isBlockedWordForStem(stem, normalizedWord)
}

function tokenizeWords(text) {
  return String(text || '').match(/[\p{L}\p{N}]+/gu) || []
}

const MULTI_WORD_REGEX_CACHE = new Map()

function getMultiWordEntry(term) {
  let entry = MULTI_WORD_REGEX_CACHE.get(term)
  if (entry !== undefined) return entry
  const parts = term.split(/[\s-]+/).filter(Boolean)
  if (parts.length === 0) {
    MULTI_WORD_REGEX_CACHE.set(term, null)
    return null
  }
  const pattern = parts
    .map((part) => {
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (EXACT_MATCH_TERMS.has(part)) return escaped
      return `${escaped}[\\p{L}]*`
    })
    .join('[\\s\\-,()]+')
  entry = {
    firstPart: parts[0],
    regex: new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${pattern})(?=$|[^\\p{L}\\p{N}])`, 'iu'),
  }
  MULTI_WORD_REGEX_CACHE.set(term, entry)
  return entry
}

export function matchesTermWithBoundary(
  text,
  rawTerm,
  { domain = null, alreadyMasked = false, words: preTokenizedWords = null } = {}
) {
  const normalizedText = alreadyMasked
    ? text
    : maskTextForDomain(normalizeCompositionText(text), domain)
  const term = normalizeCompositionText(rawTerm).trim()
  if (!normalizedText || !term) return false

  if (/[\s-]/.test(term)) {
    const entry = getMultiWordEntry(term)
    if (!entry) return false
    if (!normalizedText.includes(entry.firstPart)) return false
    return entry.regex.test(normalizedText)
  }

  if (!normalizedText.includes(term)) return false

  const words = preTokenizedWords || tokenizeWords(normalizedText)

  if ((term === 'сом' || term === 'сома') && domain === 'fish') {
    if (!words.includes(term)) return false
    return /(?:рыб|филе|мясо\s+сома|икра\s+сома|печень\s+сома|сом\s+(?:свеж|морожен|копчен|вялен|солен|охлажден))/iu.test(
      normalizedText
    )
  }

  if (EXACT_MATCH_TERMS.has(term)) {
    return words.includes(term)
  }

  for (const word of words) {
    if (word.startsWith(term) && !isBlockedWordForStem(term, word)) {
      return true
    }
  }

  return false
}

export function findMatchingTerm(text, terms = [], options = {}) {
  if (!text || !Array.isArray(terms) || terms.length === 0) return null
  const domain = options.domain || null
  const maskedText = maskTextForDomain(normalizeCompositionText(text), domain)
  if (!maskedText) return null
  const words = tokenizeWords(maskedText)

  for (const rawTerm of terms) {
    if (matchesTermWithBoundary(maskedText, rawTerm, { domain, alreadyMasked: true, words })) {
      return rawTerm
    }
  }
  return null
}

export function findDirectAllergenInText(mainText, allergenId) {
  const synonyms = ALLERGEN_SYNONYMS[allergenId] || []
  return findMatchingTerm(mainText, synonyms, { domain: allergenId })
}

export function extractAllDirectAllergens(rawIngredients) {
  const { mainText } = splitCompositionClauses(rawIngredients)
  if (!mainText) return []
  const detected = []
  for (const allergenId of Object.keys(ALLERGEN_SYNONYMS)) {
    if (findDirectAllergenInText(mainText, allergenId)) {
      detected.push(allergenId)
    }
  }
  return detected
}

export function extractAllTraceAllergens(rawIngredients, allergenSynonyms = ALLERGEN_SYNONYMS) {
  const { traceText } = splitCompositionClauses(rawIngredients)
  if (!traceText) return []

  const results = []
  for (const [allergenId, synonyms] of Object.entries(allergenSynonyms)) {
    const matchedSynonym = findMatchingTerm(traceText, synonyms, { domain: allergenId })
    if (matchedSynonym) {
      results.push({
        allergenId,
        matchedPhrase: 'trace',
        matchedSynonym,
      })
    }
  }
  return results
}

export function hasAddedSugarInText(rawIngredients) {
  const { mainText } = splitCompositionClauses(rawIngredients)
  if (!mainText) return null
  return findMatchingTerm(mainText, SUGAR_SYNONYMS, { domain: 'sugar' })
}

export function hasAspartameInText(rawIngredients) {
  const { mainText } = splitCompositionClauses(rawIngredients)
  if (!mainText) return null
  return findMatchingTerm(mainText, ASPARTAME_SYNONYMS, { domain: 'aspartame' })
}

export function isRangeInsideTraceClause(text, range) {
  const normalized = normalizeCompositionText(text)
  const sliceStart = Math.max(0, range.start - 160)
  const before = normalized.slice(sliceStart, range.start)
  const lastSentenceBreak = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf(';'),
    before.lastIndexOf('\n')
  )
  const currentClausePrefix = lastSentenceBreak >= 0 ? before.slice(lastSentenceBreak + 1) : before
  return TRACE_INTRO_REGEX.test(currentClausePrefix) || currentClausePrefix.includes('след')
}

export function isRangeInsideNegatedPhrase(text, range) {
  const normalized = normalizeCompositionText(text)
  const sliceStart = Math.max(0, range.start - 48)
  const before = normalized.slice(sliceStart, range.start)
  const lastBreak = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf(';'),
    before.lastIndexOf(','),
    before.lastIndexOf('('),
    before.lastIndexOf(')')
  )
  const clausePrefix = lastBreak >= 0 ? before.slice(lastBreak + 1) : before
  return /(?:^|\s)(?:без|не\s+содержит|free\s+from|no\s+added|without)\s+/iu.test(clausePrefix)
}
