import {
  normalizeCompositionText,
  splitCompositionClauses,
  extractAllDirectAllergens,
  extractAllTraceAllergens,
  findMatchingTerm,
  hasAddedSugarInText,
} from '../../utils/compositionMatcher.js'

export const PACKAGING_TYPES = {
  bottle_plastic: {
    keywords: ['пэт', 'пет', 'п/э', 'пэт-бутылка', 'бут.пет', 'бут.пэт', 'бутылка пет', 'pet'],
    label: { ru: 'ПЭТ-бутылка', kz: 'ПЭТ-бөтелке' },
  },
  bottle_glass: {
    keywords: ['стекло', 'стеклянная'],
    label: { ru: 'Стеклянная бутылка', kz: 'Шыны бөтелке' },
  },
  can: {
    keywords: ['ж/б', 'жб', 'жестебанка', 'жесть', 'консервная'],
    label: { ru: 'Жестяная банка', kz: 'Қаңылтыр банка' },
  },
  tetrapak: {
    keywords: ['тба', 'т/б', 'тетра', 'тетрапак', 'тетра-пак', 'tetra', 'тетра брик'],
    label: { ru: 'Тетра-пак', kz: 'Тетра-пак' },
  },
  pouch: {
    keywords: [
      'п/б',
      'пб',
      'пакет',
      'пачка',
      'дой-пак',
      'дойпак',
      'п/пакете',
      'flow-pack',
      'флоу-пак',
    ],
    label: { ru: 'Пакет/пачка', kz: 'Пакет' },
  },
  tub: {
    keywords: ['тб', 'туба', 'ведёрко', 'контейнер', 'пл/б'],
    label: { ru: 'Пластиковый контейнер', kz: 'Пластикалық контейнер' },
  },
}

const VALID_PACKAGING_KEYS = new Set(Object.keys(PACKAGING_TYPES))

const PACKAGING_REGEXES = []
for (const [key, def] of Object.entries(PACKAGING_TYPES)) {
  for (const kw of def.keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    PACKAGING_REGEXES.push({
      key,
      regex: new RegExp(`(?:^|\\s|[,./])${escaped}(?:$|\\s|[,./]|\\d)`, 'i'),
    })
  }
}

const FAT_PERCENT_REGEX = /(\d{1,2}[,.]?\d?)\s*%/g

const CATEGORY_FAT_HINTS = {
  dairy_eggs: true,
  meat: true,
  deli: true,
  fish: false,
  sauces_spices: false,
  healthy: true,
  ready_meals: true,
  personal_care: false,
  household: false,
  baby_food: true,
}

const DIET_PATTERNS = [
  {
    tag: 'sugar_free',
    patterns: [
      /без\s*сахара/i,
      /б\.?\s*сах/i,
      /без\s*сах\./i,
      /no\s*sugar/i,
      /sugar\s*free/i,
      /без\s*добавлен.*сахар/i,
    ],
  },
  {
    tag: 'gluten_free',
    patterns: [/без\s*глютен/i, /безглютен/i, /gluten\s*free/i, /без\s*глют/i],
  },
  {
    tag: 'lactose_free',
    patterns: [/без\s*лактоз/i, /безлактозн/i, /лактоз\s*фри/i, /lactose\s*free/i],
  },
  { tag: 'vegan', patterns: [/\bvegan\b/i] },
  { tag: 'vegetarian', patterns: [/\bвегетариан/i, /\bvegetarian\b/i] },
  {
    tag: 'keto',
    patterns: [/(?:^|[^\p{L}\p{N}])(?:кето|keto|кетогенн|ketogenic|keto[_\-\s]?friendly)/iu],
  },
  {
    tag: 'low_carb',
    patterns: [
      /(?:^|[^\p{L}\p{N}])низкоуглевод/iu,
      /\blow[_\-\s]?carb\b/i,
      /\blow[_\-\s]?carb[_\-\s]?friendly\b/i,
    ],
  },
  {
    tag: 'fitness',
    patterns: [
      /\bфитнес\b/i,
      /\bfitness\b/i,
      /\bспорт\b/i,
      /\bprot?ein\b/i,
      /\bпротеин\b/i,
      /\bдиетич/i,
    ],
  },
  {
    tag: 'organic',
    patterns: [
      /\borganic\b/i,
      /\bорганик\b/i,
      /\bэко\s/i,
      /\beco\s/i,
      /\bбио\s/i,
      /\bbio\s/i,
      /\bнатуральн/i,
    ],
  },
  { tag: 'kosher', patterns: [/\bkosher\b/i, /\bкошерн/i] },
  { tag: 'diabetic', patterns: [/\bдиабетич/i, /\bdiabetic\b/i] },
  { tag: 'low_calorie', patterns: [/\bнизкокалор/i, /\bмало калор/i, /\blow\s*cal/i] },
  {
    tag: 'low_fat',
    patterns: [/\bнизк.*жирн/i, /\bобезжирен/i, /\blow\s*fat\b/i, /\b0\s*%?\s*жир/i],
  },
  { tag: 'enriched', patterns: [/\bобогащ[ёе]н/i, /\bfortified\b/i, /\bс\s*витамин/i] },
]

const HALAL_PATTERNS = [
  /\bhalal\b/i,
  /\bхаляль\b/i,
  /\bхалял\b/i,
  /\bхалал\b/i,
  /\bhalal\s*certified\b/i,
  /\bхалал\s*серт/i,
  /\bхаляльн/i,
]

const FLAVOR_ENTRIES = [
  { value: 'Абрикос', variants: ['абрикос', 'өрік'] },
  { value: 'Апельсин', variants: ['апельсин', 'апельсинов', 'orange'] },
  { value: 'Банан', variants: ['банан', 'бананов'] },
  { value: 'Ваниль', variants: ['ваниль', 'ванильн', 'vanilla'] },
  { value: 'Вишня', variants: ['вишн', 'cherry'] },
  { value: 'Вяленые томаты', variants: ['вяленые томаты', 'вялеными томатами'] },
  { value: 'Грибы', variants: ['гриб', 'грибн'] },
  { value: 'Огурчики и зелень', variants: ['маринованными огурчиками и зеленью'] },
  { value: 'Зелень', variants: ['зеленью', 'зелень'] },
  { value: 'Карамель', variants: ['карамел', 'caramel'] },
  { value: 'Клубника', variants: ['клубнич', 'клубник', 'strawberry'] },
  { value: 'Кокос', variants: ['кокос', 'coconut'] },
  { value: 'Крем-брюле', variants: ['крем-брюле', 'крем брюле'] },
  { value: 'Лимон', variants: ['лимон', 'lemon'] },
  { value: 'Лосось', variants: ['лосос', 'семг', 'сёмг'] },
  { value: 'Манго', variants: ['манго', 'mango'] },
  { value: 'Малина', variants: ['малин', 'raspberry'] },
  { value: 'Миндаль', variants: ['миндал', 'almond'] },
  { value: 'Острый перец', variants: ['острый перец', 'перец острый'] },
  { value: 'Паприка', variants: ['паприк'] },
  { value: 'Персик', variants: ['персик', 'персиков', 'peach'] },
  { value: 'Сливочный', variants: ['сливочн'] },
  { value: 'Сыр', variants: ['сырн', 'сыром', 'сыр'] },
  { value: 'Томаты', variants: ['томат', 'помидор'] },
  { value: 'Фундук', variants: ['фундук', 'hazelnut'] },
  { value: 'Шоколад', variants: ['шоколад', 'chocolate'] },
  { value: 'Яблоко', variants: ['яблок', 'apple'] },
]

const AMBIGUOUS_WITH_CATEGORIES = new Set(['deli', 'meat', 'fish', 'ready_meals'])
const PRODUCT_TYPE_TOKENS = new Set([
  'сыр',
  'сыры',
  'сырок',
  'сырки',
  'сырный',
  'сырные',
  'масло',
  'молоко',
  'сливки',
  'сливочный',
  'яйцо',
  'яйца',
  'томат',
  'томаты',
])

function normalizeFlavorText(value) {
  if (value === null || value === undefined) return null
  const trimmed = String(value)
    .replace(/[«»"“”]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+\d+[,.]?\d*\s*(?:г|гр|кг|мл|л|шт|g|kg|ml|l)\b.*$/i, '')
    .replace(/[,.):;]+$/g, '')
    .trim()
  if (!trimmed || trimmed.length < 3 || trimmed.length > 48) return null
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[«»"“”]/g, ' ')
    .replace(/[.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isProductTypeOnly(value) {
  const normalized = normalizeSearchText(value)
  return PRODUCT_TYPE_TOKENS.has(normalized)
}

function findFlavorEntry(value) {
  return findFlavorMatches(value)[0]?.entry || null
}

function findFlavorMatches(value) {
  const normalized = normalizeSearchText(value)
  if (!normalized) return []
  const matches = []
  for (const entry of FLAVOR_ENTRIES) {
    for (const variant of entry.variants) {
      if (variant.includes(' ')) {
        const index = normalized.indexOf(variant)
        if (index >= 0) {
          matches.push({
            entry,
            index,
            end: index + variant.length,
          })
          break
        }
      }
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?:^|\\s)(${escaped}[\\p{L}-]*)(?=\\s|$)`, 'iu')
      const match = regex.exec(normalized)
      if (match) {
        matches.push({
          entry,
          index: match.index + match[0].indexOf(match[1]),
          end: match.index + match[0].length,
        })
        break
      }
    }
  }
  return matches.sort((a, b) => a.index - b.index)
}

function canUseFlavorEntry(entry, category) {
  return !isProductTypeOnly(entry.value) || (category === 'snacks' && entry.value === 'Сыр')
}

function findCompoundFlavor(name, category) {
  const normalized = normalizeSearchText(name)
  const matches = findFlavorMatches(name).filter((match) =>
    canUseFlavorEntry(match.entry, category)
  )
  for (let i = 0; i < matches.length - 1; i += 1) {
    const first = matches[i]
    const second = matches[i + 1]
    if (first.entry.value === second.entry.value) continue
    const between = normalized.slice(first.end, second.index)
    if (/^\s+(?:и|and)\s+$/i.test(between)) {
      return `${first.entry.value} и ${second.entry.value.toLowerCase()}`
    }
  }
  return null
}

export function extractPackaging(name) {
  if (!name) return null
  const upper = name.toUpperCase()

  const SUFFIX_PRIORITY = [
    'КНВРТ',
    'ТБА',
    'Т/Б',
    'Ж/Б',
    'ЖБ',
    'П/Б',
    'ПБ',
    'ПЭТ',
    'ПЕТ',
    'П/Э',
    'ТБ',
    'С/Б',
  ]
  const SUFFIX_WORD_CHECK = new Set(['СТБ', 'СТ.Б'])
  for (const suffix of SUFFIX_PRIORITY) {
    const idx = upper.indexOf(suffix)
    if (idx >= 0) {
      const before = idx > 0 ? upper[idx - 1] : ' '
      const after = idx + suffix.length < upper.length ? upper[idx + suffix.length] : ' '
      if (before === ' ' || before === ',' || before === '/' || before === '-' || before === '(') {
        if (
          after === ' ' ||
          after === '' ||
          after === ',' ||
          after === '/' ||
          after === '-' ||
          after === ')' ||
          /\d/.test(after)
        ) {
          if (suffix === 'Ж/Б' || suffix === 'ЖБ') {
            if (
              /консерв|туш[ёе]|сардин|скумбр|шпрот|кильк|горбуш|сайр|икр|печен|сгущён|сгущен|фасол|кублей|чахохб|кофе|напиток|пиво|энерг|кол|пепси|фант|лимон|сидр|джин|тоник|персик|оливк|анчо|тун[её]|рыб|горош|кукуруз|гриб|томат|закуск|маринад|сироп/i.test(
                name
              )
            )
              return 'can'
            if (
              /фрукт|ягод|овощ|маслин|капер|шпинат|баклажан|перц|патиссон|кабачок|томат|паштет|сосиск|сард/i.test(
                name
              )
            )
              return 'can'
            return 'bottle_glass'
          }
          if (suffix === 'ТБ') return 'tub'
          if (suffix === 'КНВРТ') return 'pouch'
          if (suffix === 'ТБА' || suffix === 'Т/Б') return 'tetrapak'
          if (suffix === 'П/Б' || suffix === 'ПБ') return 'pouch'
          if (suffix === 'ПЭТ' || suffix === 'ПЕТ' || suffix === 'П/Э') return 'bottle_plastic'
          if (suffix === 'С/Б') return 'bottle_glass'
        }
      }
    }
  }

  for (const suffix of SUFFIX_WORD_CHECK) {
    const wordRegex = new RegExp(
      `(?:^|\\s)${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$|,|\\.|\\d)`,
      'i'
    )
    if (wordRegex.test(name)) {
      return 'bottle_glass'
    }
  }

  for (const { key, regex } of PACKAGING_REGEXES) {
    if (regex.test(name)) return key
  }

  return null
}

export function extractFatPercent(name, category) {
  if (!name) return null

  if (category && !CATEGORY_FAT_HINTS[category]) return null

  const matches = []
  let match
  FAT_PERCENT_REGEX.lastIndex = 0
  while ((match = FAT_PERCENT_REGEX.exec(name)) !== null) {
    const raw = match[1].replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val >= 0.5 && val <= 100) {
      matches.push({ value: val, index: match.index, fullMatch: match[0] })
    }
  }

  if (matches.length === 0) return null

  const fatContextBefore =
    /(?:жир|жирн|fat|масл|сливочн|сливк|сметан|кефир|йогурт|творог|сыр|молочн|слив|морож|крем|кисломол|м\.д\.ж|мдж)/i
  const fatContextAfter = /(?:жир|жирн|fat)/i

  for (const m of matches) {
    const before = name.slice(Math.max(0, m.index - 30), m.index)
    const after = name.slice(m.index + m.fullMatch.length, m.index + m.fullMatch.length + 20)
    if (fatContextBefore.test(before) || fatContextAfter.test(after)) {
      return m.value
    }
  }

  if (category && CATEGORY_FAT_HINTS[category] === true) {
    if (matches.length === 1) return matches[0].value

    const sorted = [...matches].sort((a, b) => a.index - b.index)
    const first = sorted[0]
    const before = name.slice(Math.max(0, first.index - 15), first.index)
    const weightPattern = /\d{2,5}\s*[гк]/
    if (!weightPattern.test(before)) return first.value
  }

  return null
}

const NON_FOOD_CATEGORIES = new Set([
  'household',
  'personal_care',
  'pet_supplies',
  'other',
  'non_food',
  'tobacco',
  'alcohol',
  'beauty',
  'hygiene',
])

const ALLERGEN_ID_NORMALIZE_MAP = {
  milk: 'milk',
  dairy: 'milk',
  lactose: 'milk',
  eggs: 'eggs',
  egg: 'eggs',
  gluten: 'gluten',
  wheat: 'gluten',
  cereals_containing_gluten: 'gluten',
  rye: 'gluten',
  barley: 'gluten',
  oats: 'gluten',
  soy: 'soy',
  soya: 'soy',
  soybeans: 'soy',
  peanuts: 'peanuts',
  peanut: 'peanuts',
  nuts: 'tree_nuts',
  tree_nuts: 'tree_nuts',
  almonds: 'tree_nuts',
  hazelnuts: 'tree_nuts',
  walnuts: 'tree_nuts',
  cashews: 'tree_nuts',
  pistachios: 'tree_nuts',
  fish: 'fish',
  crustaceans: 'crustaceans',
  shellfish: 'crustaceans',
  mollusks: 'mollusks',
  molluscs: 'mollusks',
  sesame: 'sesame',
  'sesame-seeds': 'sesame',
  sesame_seeds: 'sesame',
  mustard: 'mustard',
  celery: 'celery',
  sulfites: 'sulfites',
  sulphites: 'sulfites',
  'sulphur-dioxide-and-sulphites': 'sulfites',
  lupin: 'lupin',
}

export function normalizeCanonicalAllergenIds(list = []) {
  if (!Array.isArray(list)) return []
  const result = new Set()
  for (const raw of list) {
    const clean = String(raw || '')
      .toLowerCase()
      .replace(/^[a-z]{2}:/, '')
      .trim()
    if (!clean) continue
    const mapped = ALLERGEN_ID_NORMALIZE_MAP[clean] || clean
    if (ALLERGEN_ID_NORMALIZE_MAP[mapped]) {
      result.add(ALLERGEN_ID_NORMALIZE_MAP[mapped])
    }
  }
  return [...result]
}

const PLANT_ALT_NAME_REGEX =
  /(?:растительн|кокосов|миндальн|овсян|соев|рисов|гречнев|фундучн|кешью|коноплян|горохов|немолоко|nemoloko|alpro|bite|green\s*milk|velle)/i

const DEFINITE_HARAM_MARKERS = [
  'свинина',
  'свиной',
  'свиная',
  'свиное',
  'свиные',
  'свиного',
  'свиному',
  'свинины',
  'шпик',
  'бекон',
  'сало',
  'ветчина свиная',
  'грудинка свиная',
  'корейка свиная',
  'шейка свиная',
  'окорок свиной',
  'карбонад свиной',
  'жир свиной',
  'желатин свиной',
  'кровь пищевая',
  'альбумин черный',
  'гематоген',
  'спирт этиловый',
  'этанол',
  'водка',
  'коньяк',
  'виски',
  'текила',
  'шампанское',
  'бренди',
  'ликер',
  'ликёр',
  'кармин',
  'e120',
  'е120',
]

const NON_VEGETARIAN_MARKERS = [
  'говядина',
  'говяжий',
  'говяжья',
  'говяжье',
  'телятина',
  'телячий',
  'свинина',
  'свиной',
  'свиная',
  'баранина',
  'бараний',
  'конина',
  'конский',
  'курица',
  'куриный',
  'куриная',
  'куриное',
  'цыпленок',
  'цыпленка',
  'индейка',
  'индюшиный',
  'утка',
  'утиный',
  'гусь',
  'гусиный',
  'кролик',
  'оленина',
  'мясо',
  'мясной',
  'мясная',
  'фарш',
  'ветчина',
  'бекон',
  'шпик',
  'сало',
  'колбаса',
  'сосиски',
  'сардельки',
  'печень говяжья',
  'печень куриная',
  'печень свиная',
  'печень трески',
  'субпродукты',
  'желатин',
  'рыба',
  'рыбный',
  'лосось',
  'семга',
  'форель',
  'тунец',
  'треска',
  'минтай',
  'сельдь',
  'скумбрия',
  'сардина',
  'шпроты',
  'килька',
  'горбуша',
  'кета',
  'анчоус',
  'креветки',
  'краб',
  'кальмар',
  'мидии',
  'осьминог',
  'икра',
  'сурими',
  'сычужный фермент',
  'кармин',
  'e120',
  'е120',
]

const NON_VEGAN_EXTRA_MARKERS = [
  ...NON_VEGETARIAN_MARKERS,
  'молоко',
  'молочный',
  'молочная',
  'молочное',
  'сливки',
  'сливочное масло',
  'масло сливочное',
  'сметана',
  'творог',
  'творожный',
  'сыр',
  'кефир',
  'йогурт',
  'ряженка',
  'простокваша',
  'сыворотка молочная',
  'молочная сыворотка',
  'пахта',
  'казеин',
  'казеинат',
  'лактоза',
  'молочный белок',
  'молочный жир',
  'сухое молоко',
  'сгущенное молоко',
  'яйцо',
  'яйца',
  'яичный',
  'яичный порошок',
  'меланж',
  'альбумин',
  'мед',
  'мёд',
  'пчелиный воск',
  'воск пчелиный',
  'e901',
  'е901',
  'шеллак',
  'e904',
  'е904',
  'ланолин',
  'животный жир',
]

const CHILD_UNFRIENDLY_MARKERS = [
  'кофеин',
  'таурин',
  'гуарана',
  'энергетический',
  'алкоголь',
  'спирт этиловый',
  'пиво',
  'вино',
  'водка',
  'коньяк',
  'виски',
  'глутамат натрия',
  'e621',
  'е621',
  'нитрит натрия',
  'e250',
  'е250',
  'бензоат натрия',
  'e211',
  'е211',
  'диоксид серы',
  'e220',
  'е220',
  'аспартам',
  'e951',
  'е951',
  'ацесульфам',
  'e950',
  'е950',
  'сахарин',
  'e954',
  'е954',
  'цикламат',
  'e952',
  'е952',
  'сукралоза',
  'e955',
  'е955',
  'тартразин',
  'e102',
  'е102',
  'желтый хинолиновый',
  'e104',
  'е104',
  'желтый солнечный закат',
  'e110',
  'е110',
  'кармуазин',
  'азорубин',
  'e122',
  'е122',
  'понсо',
  'e124',
  'е124',
  'красный очаровательный',
  'e129',
  'е129',
  'жидкий дым',
  'перец чили',
  'халапеньо',
  'васаби',
]

function stripFlavorPhrasesFromName(name) {
  return normalizeCompositionText(name).replace(
    /(?:со\s+вкусом|вкус(?:ом)?|аромат(?:ом)?)\s+[^,.();]+/giu,
    ' '
  )
}

export function extractProductAllergens({
  name = '',
  category = '',
  ingredients = '',
  existingAllergens = [],
} = {}) {
  const result = new Set(normalizeCanonicalAllergenIds(existingAllergens))
  if (NON_FOOD_CATEGORIES.has(category)) {
    return []
  }

  const ingredientsText = String(ingredients || '')
  if (ingredientsText.trim()) {
    for (const allergenId of extractAllDirectAllergens(ingredientsText)) {
      result.add(allergenId)
    }
  }

  const cleanName = stripFlavorPhrasesFromName(name)
  const { mainText: nameMain, negatedText: nameNegated } = splitCompositionClauses(cleanName)
  const isPlantAlt = PLANT_ALT_NAME_REGEX.test(cleanName)

  // Unambiguous name-based allergen detection
  if (
    !isPlantAlt &&
    /\b(?:молоко\s+(?:коров|пастеризован|ультрапастеризован|стерилизован|топлен|цельн|сгущен|сух|питьев|отборн|фермерск|детск)|кефир|ряженка|снежок|варенец|айран|тан\b|курт\b|каймак|сметана|творог|творожн|сливки\s+(?:питьев|взбит|кулинарн|стерилизован|ультрапастеризован|сух)|масло\s+(?:сливочн|топленое\s+сливочн|крестьянск|традиционн)|сырок\s+(?:творожн|глазирован)|сыр\s+(?:тверд|полутверд|плавлен|творожн|рассольн|мягк|моцарелл|чеддер|гауда|пармезан|маскарпоне|рикотт|сулугуни|брынз|фета|российск|голландск|костромск|пошехонск|тильзитер|маасдам|ламбер|сливочн)|йогурт|биойогурт|простокваша|ацидофилин|бифидок|мороженое\s+(?:пломбир|сливочн|молочн))\b/iu.test(
      nameMain
    )
  ) {
    result.add('milk')
  }

  if (
    /\b(?:яйцо\s+(?:курин|перепелин|столов|пищев|отборн|с[012о])|яйца\s+(?:курин|перепелин|столов|пищев|отборн|с[012о])|меланж\s+яичн|белок\s+яичн|желток\s+яичн)\b/iu.test(
      nameMain
    ) &&
    !/шоколад|kinder|киндер|конфет|мармелад|игрушк|сюрприз/iu.test(nameMain)
  ) {
    result.add('eggs')
  }

  if (
    /\b(?:семга|сёмга|лосось|форель|тунец|скумбрия|сельдь|селедка|сардина|сардинелла|шпроты|килька|горбуша|кета|минтай|треска|хек|камбала|палтус|дорадо|сибас|окунь|судак|щука|карп|сазан|лещ|вобла|тарань|анчоус|мойва|сайра|ставрида|икра\s+(?:лососев|красн|черн|осетров|треск|минта|сельди|щук)|печень\s+трески|филе\s+(?:сельди|лосося|форели|трески|минтая|тунца|скумбрии|горбуши|пангасиуса|тилапии))\b/iu.test(
      nameMain
    ) &&
    !/морск\S*\s+капуст|чука|нори|ламинари/iu.test(nameMain)
  ) {
    result.add('fish')
  }

  if (
    /\b(?:креветк[аи]|лангустин|омар|лобстер|мясо\s+криля|криль|раки\s+(?:варен|жив))\b/iu.test(
      nameMain
    ) &&
    !/имитац|сурими|крабов\S*\s+палочк/iu.test(nameMain)
  ) {
    result.add('crustaceans')
  }

  if (/\b(?:кальмар[ыа]?|мидии|мидий|осьминог|устриц|гребешок\s+морск|рапаны)\b/iu.test(nameMain)) {
    result.add('mollusks')
  }

  if (/\b(?:арахис|арахисов(?:ая|ое|ый)\s+(?:паста|масло|урбеч|халва))\b/iu.test(nameMain)) {
    result.add('peanuts')
  }

  if (
    /\b(?:миндаль|фундук|кешью|фисташк[иа]|грецк(?:ий|ое|их)\s+орех|орех\s+грецк|пекан|макадами|кедров(?:ый|ые)\s+орех|бразильск(?:ий|ие)\s+орех|урбеч\s+из\s+(?:миндал|фундук|кешью|грецк))\b/iu.test(
      nameMain
    )
  ) {
    result.add('tree_nuts')
  }

  const hasExplicitGlutenFree =
    /без\s*глютен|безглютен|gluten\s*free/iu.test(`${name} ${ingredientsText}`) ||
    nameNegated.includes('глютен')

  if (
    !hasExplicitGlutenFree &&
    /\b(?:пшеничн(?:ая|ый|ые|ое)|ржано-пшеничн|пшенично-ржаная|мука\s+(?:пшеничн|ржаная|ячменн|овсян)|хлопья\s+(?:овсян|пшеничн|ржаные|ячменн)|геркулес|крупа\s+(?:манная|перлов|ячневая|пшеничн|булгур|кускус|полба)|хлеб\s+(?:пшеничн|ржаной|бородинск|дарницк|столичн|нарезн|тостов|цельнозернов|отрубн)|батон\s+(?:нарезн|пшеничн|подмосковн|горчичн|столичн)|лаваш\s+(?:армянск|тонк|пшеничн)|спагетти|макароны|вермишель|рожки|перья|лапша\s+(?:пшеничн|яичн|удон|рамен|бешбармачн)|пельмени|манты|вареники|хинкали|чебуреки|самса|круассан|сушки|баранки|сухари\s+пшеничн|пряники|галеты|крекер)\b/iu.test(
      nameMain
    ) &&
    !/гречнев\S*\s+(?:лапш|макарон)|рисов\S*\s+(?:лапш|макарон|мук)|фунчоз|кукурузн\S*\s+(?:макарон|мук|хлопь)/iu.test(
      nameMain
    )
  ) {
    result.add('gluten')
  }

  if (
    /\b(?:кунжут|кунжутн(?:ое|ая|ый)\s+(?:масло|паста|семена|урбеч|халва)|тахини)\b/iu.test(
      nameMain
    )
  ) {
    result.add('sesame')
  }

  if (
    /\b(?:горчица|горчичн(?:ый|ое|ая)\s+(?:соус|масло|порошок|зернов))\b/iu.test(nameMain) &&
    !/батон\s+горчичн/iu.test(nameMain)
  ) {
    result.add('mustard')
  }

  if (
    /\b(?:соевый\s+соус|соус\s+соевый|тофу|соевое\s+молоко|соевое\s+мясо|соевые\s+бобы|эдамаме|мисо\s+паста)\b/iu.test(
      nameMain
    )
  ) {
    result.add('soy')
  }

  return [...result]
}

export function extractProductTraces({
  category = '',
  ingredients = '',
  existingTraces = [],
  directAllergens = [],
} = {}) {
  if (NON_FOOD_CATEGORIES.has(category)) return []
  const directSet = new Set(normalizeCanonicalAllergenIds(directAllergens))
  const result = new Set(
    normalizeCanonicalAllergenIds(existingTraces).filter((id) => !directSet.has(id))
  )

  const ingredientsText = String(ingredients || '')
  if (ingredientsText.trim()) {
    for (const traceEntry of extractAllTraceAllergens(ingredientsText)) {
      const traceId = typeof traceEntry === 'string' ? traceEntry : traceEntry?.allergenId
      if (traceId && !directSet.has(traceId)) {
        result.add(traceId)
      }
    }
  }

  return [...result]
}

export function extractHalalFromName(name, currentStatus = 'unknown', ingredients = '') {
  if (currentStatus === 'yes') return 'yes'
  if (currentStatus === 'no') return 'no'
  if (name && HALAL_PATTERNS.some((p) => p.test(name))) return 'yes'

  const cleanName = stripFlavorPhrasesFromName(name || '')
  const { mainText: ingMain } = splitCompositionClauses(ingredients || '')
  const combinedForHaram = `${cleanName} . ${ingMain}`

  if (
    combinedForHaram.trim() &&
    findMatchingTerm(combinedForHaram, DEFINITE_HARAM_MARKERS, { domain: 'halal' })
  ) {
    return 'no'
  }

  if (
    /\b(?:пиво\s+(?!безалкогольн|имбирн)|вино\s+(?:красн|бел|сух|полусладк|полусух|игрист|столов)|водка\b|коньяк\b|виски\b|шампанское\b)/iu.test(
      cleanName
    )
  ) {
    return 'no'
  }

  return currentStatus
}

function parseNumericNutriment(nutriments, keys) {
  if (!nutriments || typeof nutriments !== 'object') return NaN
  for (const key of keys) {
    const val = Number.parseFloat(nutriments[key])
    if (Number.isFinite(val)) return val
  }
  return NaN
}

export function extractDietTags(name, existingTags = [], context = {}) {
  const {
    category = '',
    ingredients = '',
    nutriments = null,
    halalStatus = 'unknown',
    allergens = null,
    traces = null,
    fatPercent = null,
  } = context || {}

  if (category && NON_FOOD_CATEGORIES.has(category)) {
    return []
  }

  const tags = new Set(Array.isArray(existingTags) ? existingTags : [])
  const safeName = String(name || '')
  const ingredientsRaw = String(ingredients || '')
  const { mainText, negatedText } = splitCompositionClauses(ingredientsRaw)
  const hasComposition = mainText.length >= 4

  const resolvedAllergens = Array.isArray(allergens)
    ? allergens
    : extractProductAllergens({ name: safeName, category, ingredients: ingredientsRaw })
  const resolvedTraces = Array.isArray(traces)
    ? traces
    : extractProductTraces({
        category,
        ingredients: ingredientsRaw,
        directAllergens: resolvedAllergens,
      })

  const resolvedHalal = extractHalalFromName(safeName, halalStatus, ingredientsRaw)

  for (const { tag, patterns } of DIET_PATTERNS) {
    if (tags.has(tag)) continue
    if (patterns.some((p) => p.test(safeName))) {
      tags.add(tag)
    }
  }

  // 1. Halal tag
  if (resolvedHalal === 'yes') {
    tags.add('halal')
  } else if (resolvedHalal === 'no') {
    tags.delete('halal')
  }

  // Parse nutriments
  const sugars100g = parseNumericNutriment(nutriments, ['sugars', 'sugar', 'sugars_100g'])
  const carbs100g = parseNumericNutriment(nutriments, [
    'carbs',
    'carbohydrates',
    'carbohydrates_100g',
  ])
  const fiber100g = parseNumericNutriment(nutriments, ['fiber', 'fiber_100g'])
  const fat100g = parseNumericNutriment(nutriments, ['fat', 'fat_100g'])
  const protein100g = parseNumericNutriment(nutriments, ['protein', 'proteins', 'proteins_100g'])
  const kcal100g = parseNumericNutriment(nutriments, ['kcal', 'energy-kcal_100g', 'energy_kcal'])
  const hasRealNutriments =
    Number.isFinite(protein100g) ||
    Number.isFinite(fat100g) ||
    Number.isFinite(carbs100g) ||
    Number.isFinite(kcal100g)

  const addedSugarMatch = hasAddedSugarInText(ingredientsRaw)
  const hasAddedSugar = Boolean(addedSugarMatch)
  const isPureSugarOrHoneyByName =
    /\b(?:сахар(?:\s+белый|\s+песок|\s+прессован|\s+тростников|\s+рафинад)?|пудра\s+сахарн|сахарная\s+пудра|мед\s+натуральн|мёд\s+натуральн|сироп\s+(?!без\s+сахар)|варенье|джем\b|сгущенка|молоко\s+сгущенн\S*\s+с\s+сахар)/iu.test(
      safeName
    ) && !/без\s*сахар|sugar\s*free|no\s*sugar/iu.test(safeName)

  // 2. sugar_free
  if (
    hasAddedSugar ||
    isPureSugarOrHoneyByName ||
    (Number.isFinite(sugars100g) && sugars100g > 5)
  ) {
    if (!DIET_PATTERNS[0].patterns.some((p) => p.test(safeName))) {
      tags.delete('sugar_free')
    }
  } else {
    const explicitSugarFreeInText =
      negatedText.includes('сахар') ||
      negatedText.includes('sugar') ||
      /без\s+(?:добавления\s+|добавленного\s+)?сахар|sugar\s*free|no\s*sugar|zero\s*sugar|0\s*%\s*сахар/iu.test(
        `${safeName} ${ingredientsRaw}`
      )
    const nutritionConfirmedSugarFree =
      hasComposition &&
      !hasAddedSugar &&
      Number.isFinite(sugars100g) &&
      sugars100g <= 0.5 &&
      hasRealNutriments
    const stapleSugarFree =
      hasComposition &&
      !hasAddedSugar &&
      (!Number.isFinite(sugars100g) || sugars100g <= 0.5) &&
      /\b(?:вода\s+(?:питьев|минеральн|природн|артезианск|родников|негазирован|газирован|детск)|чай\s+(?:черн|зелен|травян|байхов|листов|пакетирован)|кофе\s+(?:натуральн|молотый|в\s+зернах|растворим|сублимирован)|яйцо\s+курин|яйца\s+курин|масло\s+(?:подсолнечн|оливков|сливочн|кукурузн|рапсов|льнян)|крупа\s+(?:гречнев|рисов|манная|перлов|овсян|пшенн|кукурузн|ячнев|булгур)|рис\s+(?:круглозерн|длиннозерн|шлифован|пропарен|басмати|жасмин)|гречка|хлопья\s+овсян|геркулес|мука\s+(?:пшеничн|ржан|рисов|кукурузн|гречнев)|соль\s+(?:поваренн| пищев|морск|йодирован)|филе\s+(?:цыпленка|курин|индейки|лосося|форели|трески|минтая)|говядина|конина|баранина)\b/iu.test(
        safeName
      ) &&
      !/сладк|с\s+сахар|карамел|шоколад|глазур|сироп|медов/iu.test(safeName)

    if (explicitSugarFreeInText || nutritionConfirmedSugarFree || stapleSugarFree) {
      tags.add('sugar_free')
    }
  }

  // 3. gluten_free
  const hasGlutenAllergenOrTrace =
    resolvedAllergens.includes('gluten') || resolvedTraces.includes('gluten')
  const isLikelyGlutenProductByName =
    /\b(?:пшенич|ржан|ячмен|овсян|геркулес|перлов|ячнев|манн|булгур|кускус|полб|спельт|хлеб|батон|багет|булк|булочк|лаваш|пита\b|лепешк|круассан|слойк|сухар|сушк|баранк|пряник|печенье|вафл|бисквит|торт|пирожн|кекс|рулет|макарон|спагетти|вермишел|лапш|рожки|перья|пельмен|манты|вареник|хинкал|чебурек|самса|пицц|мука\b(?!\s*(?:рисов|кукурузн|гречнев|миндальн|кокосов|нутов|льнян|амарантов))|солод|пиво)\b/iu.test(
      safeName
    ) && !/без\s*глютен|безглютен|gluten\s*free/iu.test(safeName)

  if (hasGlutenAllergenOrTrace || isLikelyGlutenProductByName) {
    if (!/без\s*глютен|безглютен|gluten\s*free/iu.test(safeName)) {
      tags.delete('gluten_free')
    }
  } else {
    const explicitGlutenFree =
      negatedText.includes('глютен') ||
      negatedText.includes('gluten') ||
      /без\s*глютен|безглютен|gluten\s*free/iu.test(`${safeName} ${ingredientsRaw}`)
    if (explicitGlutenFree || hasComposition) {
      tags.add('gluten_free')
    }
  }

  // 4. lactose_free
  const explicitLactoseFree =
    negatedText.includes('лактоз') ||
    negatedText.includes('lactose') ||
    /без\s*лактоз|безлактозн|лактоз\s*фри|lactose\s*free/iu.test(`${safeName} ${ingredientsRaw}`)
  const hasDairyAllergenOrTrace =
    resolvedAllergens.includes('milk') || resolvedTraces.includes('milk')
  const isPlantMilkProduct = PLANT_ALT_NAME_REGEX.test(safeName) && !hasDairyAllergenOrTrace
  const isDairyCategoryOrName =
    !PLANT_ALT_NAME_REGEX.test(safeName) &&
    (category === 'dairy_eggs' ||
      /\b(?:молок|сливк|сметан|творог|творож|кефир|йогурт|ряженк|айран|тан\b|сыр\b|сырок|масло\s+сливочн|сгущен|морожен|пломбир)\b/iu.test(
        safeName
      )) &&
    !/\bяйц|\bяич|\bперепелин/iu.test(safeName)

  if (explicitLactoseFree || isPlantMilkProduct) {
    tags.add('lactose_free')
  } else if (hasDairyAllergenOrTrace || isDairyCategoryOrName) {
    tags.delete('lactose_free')
  } else if (hasComposition) {
    tags.add('lactose_free')
  }

  // 5. vegan & vegetarian
  const hasNonVegetarianInText =
    resolvedAllergens.includes('fish') ||
    resolvedAllergens.includes('crustaceans') ||
    resolvedAllergens.includes('mollusks') ||
    Boolean(
      findMatchingTerm(
        `${stripFlavorPhrasesFromName(safeName)} . ${mainText}`,
        NON_VEGETARIAN_MARKERS,
        {
          domain: 'vegetarian',
        }
      )
    ) ||
    (['meat', 'deli', 'fish'].includes(category) && !PLANT_ALT_NAME_REGEX.test(safeName))

  const hasNonVeganInText =
    hasNonVegetarianInText ||
    resolvedAllergens.includes('milk') ||
    resolvedAllergens.includes('eggs') ||
    Boolean(
      findMatchingTerm(
        `${stripFlavorPhrasesFromName(safeName)} . ${mainText}`,
        NON_VEGAN_EXTRA_MARKERS,
        {
          domain: 'vegan',
        }
      )
    ) ||
    (category === 'dairy_eggs' && !PLANT_ALT_NAME_REGEX.test(safeName))

  if (hasNonVeganInText) {
    tags.delete('vegan')
  } else if (
    hasComposition ||
    /\b(?:веган|vegan|постн(?:ый|ая|ое|ые)|100%\s*растительн)/iu.test(safeName) ||
    isPlantMilkProduct
  ) {
    tags.add('vegan')
    tags.add('vegetarian')
  }

  if (hasNonVegetarianInText) {
    tags.delete('vegetarian')
  } else if (hasComposition || tags.has('vegan')) {
    tags.add('vegetarian')
  }

  // 6. keto
  const netCarbs =
    Number.isFinite(carbs100g) &&
    Number.isFinite(fiber100g) &&
    fiber100g > 0 &&
    fiber100g <= carbs100g
      ? carbs100g - fiber100g
      : carbs100g
  const isHighCarbFoodByName =
    /\b(?:сахар|конфет|шоколад(?!.*(?:без\s*сахар|keto|кето))|карамел|мармелад|зефир|пастил|халв|варень|джем|мед\b|мёд\b|сироп|печенье(?!.*(?:keto|кето))|вафл|пряник|торт|пирожн|кекс|булк|булочк|хлеб(?!.*(?:keto|кето))|батон|лаваш|круассан|макарон|спагетти|лапш|вермишел|рис\b|рисов|гречк|гречнев|овсян|геркулес|манк|манная|перлов|пшено|пшенн|кукуруз|картофел|чипсы|сухарик|попкорн|мука\s+(?:пшеничн|ржан|рисов|кукурузн|овсян)|сок\b|нектар|морс|лимонад|квас|кисель|банан|виноград|финик|изюм|кураг|чернослив)\b/iu.test(
      safeName
    )

  if (
    !hasAddedSugar &&
    !isHighCarbFoodByName &&
    hasRealNutriments &&
    Number.isFinite(netCarbs) &&
    netCarbs <= 7 &&
    (!Number.isFinite(sugars100g) || sugars100g <= 5) &&
    ((Number.isFinite(protein100g) && protein100g > 0) || (Number.isFinite(fat100g) && fat100g > 0))
  ) {
    tags.add('keto')
  } else if (
    hasAddedSugar ||
    (Number.isFinite(netCarbs) && netCarbs > 10) ||
    (Number.isFinite(sugars100g) && sugars100g > 5)
  ) {
    tags.delete('keto')
  }

  // 7. low_fat
  const resolvedFatPercent =
    fatPercent !== null && fatPercent !== undefined
      ? Number.parseFloat(fatPercent)
      : extractFatPercent(safeName, category)
  const isHighFatProductByName =
    /\b(?:масло\s+(?:сливочн|подсолнечн|оливков|растительн|кокосов|кукурузн|топлен)|майонез|маргарин|спред|шпик|сало|бекон|орех|миндал|фундук|кешью|арахис|семечк|халва|шоколад|чипсы)\b/iu.test(
      safeName
    )

  if (!isHighFatProductByName) {
    if (Number.isFinite(resolvedFatPercent) && resolvedFatPercent <= 3) {
      tags.add('low_fat')
    } else if (
      hasRealNutriments &&
      Number.isFinite(fat100g) &&
      fat100g <= 3 &&
      ((Number.isFinite(protein100g) && protein100g > 0) ||
        (Number.isFinite(carbs100g) && carbs100g > 0) ||
        (Number.isFinite(kcal100g) && kcal100g > 0))
    ) {
      tags.add('low_fat')
    }
  }
  if (
    (Number.isFinite(resolvedFatPercent) && resolvedFatPercent > 10) ||
    (Number.isFinite(fat100g) && fat100g > 10)
  ) {
    tags.delete('low_fat')
  }

  // 8. kid_friendly
  const hasChildUnfriendly =
    Boolean(
      findMatchingTerm(
        `${stripFlavorPhrasesFromName(safeName)} . ${mainText}`,
        CHILD_UNFRIENDLY_MARKERS
      )
    ) ||
    (Number.isFinite(sugars100g) && sugars100g > 14) ||
    /\b(?:энергет|energy|burn\b|monster\b|red\s*bull|adrenaline|gorilla|flash\s*up|кофе\b|эспрессо|капучино|чипсы|кириешк|сухарик|лапша\s+быстр|доширак|ролтон|кока-кол|coca-cola|пепси|pepsi|фанта|fanta|спрайт|sprite|лимонад|газирован\S*\s+напиток|колбас\S*\s+копчен|горчиц|майонез|кетчуп\s+остр|хрен\b|уксус)/iu.test(
      safeName
    )

  if (hasChildUnfriendly) {
    tags.delete('kid_friendly')
  } else {
    const isExplicitBabyOrKids =
      category === 'baby_food' ||
      /\b(?:детск(?:ий|ая|ое|ие)|для\s+детей|для\s+малышей|с\s+\d+\s*месяц|агуша|фрутоняня|фруто\s+няня|бабушкино\s+лукошко|гербер|gerber|хейнц\s+детск|heinz\s+детск|сады\s+придонья\s+детск|тёма\b|малышок|малютка|нутрилак|nutrilak|симилак|similac|кабрита|kabrita|бибиколь|флер\s+альпин|fleur\s+alpine|педиашур|pediasure|растишка|актимель|actimel|иммунеле|kinder\s+молочн|киндер\s+молочн)\b/iu.test(
        safeName
      )
    const isWholesomeKidStaple =
      hasComposition &&
      (!Number.isFinite(sugars100g) || sugars100g <= 11) &&
      /\b(?:пюре\s+(?:фруктов|овощн|яблочн|грушев|бананов|персиков|абрикосов|тыквен|морковн|кабачков|мясн|из\s+индейк|из\s+цыпленк|из\s+говядин)|каша\s+(?:овсян|гречнев|рисов|кукурузн|пшенн|мультизлаков|молочн|безмолочн)|биолакт|творог\s+(?:классическ|детск|мягк|зернен|\d+\s*%)|молоко\s+(?:пастеризован|ультрапастеризован|стерилизован|отборн|детск)|кефир|ряженка|йогурт\s+(?:натуральн|греческ|питьев|детск|классическ)|вода\s+(?:детск|питьев\S*\s+негазирован)|хлебцы\s+(?:гречнев|рисов|кукурузн|цельнозернов|овсян)|хлопья\s+(?:овсян|гречнев|пшенн|рисов)|геркулес|сушки\s+малютка|печенье\s+детск)\b/iu.test(
        safeName
      )

    if (isExplicitBabyOrKids || isWholesomeKidStaple) {
      tags.add('kid_friendly')
    }
  }

  return [...tags]
}

export function extractFlavorAttribute({ name, category } = {}) {
  if (!name) return null

  const explicit = name.match(/(?:со\s+вкусом|вкусом|taste\s+of)\s+["«“]?([^",»”;()]+)["»”]?/i)
  if (explicit) {
    const value = normalizeFlavorText(explicit[1])
    if (value && !isProductTypeOnly(value)) {
      return { value, confidence: 'high', source: 'explicit_flavor_phrase' }
    }
  }

  const normalizedName = normalizeSearchText(name)
  for (const entry of FLAVOR_ENTRIES) {
    if (
      entry.variants.some((variant) => variant.includes(' ') && normalizedName.includes(variant))
    ) {
      return { value: entry.value, confidence: 'high', source: 'known_flavor_token' }
    }
  }

  const withMatch = name.match(/(?:^|\s)с\s+([а-яёa-z-]+)(?:\s|,|$)/i)
  if (withMatch) {
    const entry = findFlavorEntry(withMatch[1])
    if (entry) {
      const confidence = AMBIGUOUS_WITH_CATEGORIES.has(category) ? 'medium' : 'high'
      return {
        value: entry.value,
        confidence,
        source: confidence === 'high' ? 'with_known_flavor' : 'ambiguous_with_known_flavor',
      }
    }
  }

  const compoundFlavor = findCompoundFlavor(name, category)
  if (compoundFlavor) {
    return {
      value: compoundFlavor,
      confidence: 'high',
      source: 'compound_known_flavor_tokens',
    }
  }

  const entry = findFlavorEntry(name)
  if (!entry) return null
  if (!canUseFlavorEntry(entry, category)) return null
  return { value: entry.value, confidence: 'high', source: 'known_flavor_token' }
}

export function extractAllAttributes({
  name,
  category,
  halalStatus,
  dietTags,
  ingredients = '',
  nutriments = null,
  allergens = [],
  traces = [],
}) {
  const packaging = extractPackaging(name)
  const fatPercent = extractFatPercent(name, category)
  const newAllergens = extractProductAllergens({
    name,
    category,
    ingredients,
    existingAllergens: allergens,
  })
  const newTraces = extractProductTraces({
    category,
    ingredients,
    existingTraces: traces,
    directAllergens: newAllergens,
  })
  const newHalalStatus = extractHalalFromName(name, halalStatus || 'unknown', ingredients)
  const newDietTags = extractDietTags(name, dietTags || [], {
    category,
    ingredients,
    nutriments,
    halalStatus: newHalalStatus,
    allergens: newAllergens,
    traces: newTraces,
    fatPercent,
  })

  return {
    packaging_type: packaging,
    fat_percent: fatPercent,
    allergens: newAllergens,
    traces: newTraces,
    diet_tags: newDietTags,
    allergens_json: JSON.stringify(newAllergens),
    traces_json: JSON.stringify(newTraces),
    diet_tags_json: newDietTags.length > 0 ? JSON.stringify([...new Set(newDietTags)]) : null,
    halal_status: newHalalStatus,
  }
}

export function isValidPackagingType(value) {
  return value === null || VALID_PACKAGING_KEYS.has(value)
}
