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

export function extractDietTags(name, existingTags = []) {
  if (!name) return [...new Set(existingTags)]
  const tags = [...existingTags]
  for (const { tag, patterns } of DIET_PATTERNS) {
    if (tags.includes(tag)) continue
    if (patterns.some((p) => p.test(name))) tags.push(tag)
  }
  return [...new Set(tags)]
}

export function extractHalalFromName(name, currentStatus = 'unknown') {
  if (!name) return currentStatus
  if (currentStatus === 'yes') return 'yes'
  if (currentStatus === 'no') return 'no'
  if (HALAL_PATTERNS.some((p) => p.test(name))) return 'yes'
  return currentStatus
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

export function extractAllAttributes({ name, category, halalStatus, dietTags }) {
  const packaging = extractPackaging(name)
  const fatPercent = extractFatPercent(name, category)
  const newDietTags = extractDietTags(name, dietTags || [])
  const newHalalStatus = extractHalalFromName(name, halalStatus || 'unknown')

  return {
    packaging_type: packaging,
    fat_percent: fatPercent,
    diet_tags_json: newDietTags.length > 0 ? JSON.stringify([...new Set(newDietTags)]) : null,
    halal_status: newHalalStatus,
  }
}

export function isValidPackagingType(value) {
  return value === null || VALID_PACKAGING_KEYS.has(value)
}
