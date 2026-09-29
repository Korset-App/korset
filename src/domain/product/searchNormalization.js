const EN_TO_RU = {
  q: 'й',
  w: 'ц',
  e: 'у',
  r: 'к',
  t: 'е',
  y: 'н',
  u: 'г',
  i: 'ш',
  o: 'щ',
  p: 'з',
  '[': 'х',
  ']': 'ъ',
  a: 'ф',
  s: 'ы',
  d: 'в',
  f: 'а',
  g: 'п',
  h: 'р',
  j: 'о',
  k: 'л',
  l: 'д',
  ';': 'ж',
  "'": 'э',
  z: 'я',
  x: 'ч',
  c: 'с',
  v: 'м',
  b: 'и',
  n: 'т',
  m: 'ь',
  ',': 'б',
  '.': 'ю',
  '`': 'ё',
}

const RU_TO_EN = Object.fromEntries(Object.entries(EN_TO_RU).map(([en, ru]) => [ru, en]))

export function convertKeyboardLayout(text) {
  if (!text || typeof text !== 'string') return ''
  const str = text.toLowerCase()

  let hasLatin = false
  let hasCyrillic = false
  for (const ch of str) {
    if (ch >= 'a' && ch <= 'z') hasLatin = true
    if (ch >= 'а' && ch <= 'я') hasCyrillic = true
  }

  if (hasLatin && !hasCyrillic) {
    let converted = ''
    for (const ch of str) {
      converted += EN_TO_RU[ch] || ch
    }
    return converted
  }

  if (hasCyrillic && !hasLatin) {
    let converted = ''
    for (const ch of str) {
      converted += RU_TO_EN[ch] || ch
    }
    return converted
  }

  return text
}

export function normalizeSearchInput(query) {
  if (!query || typeof query !== 'string') return ''
  return query
    .toLowerCase()
    .replace(/[ёЁ]/g, 'е')
    .replace(/[-–—_/.,;:()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeKazakhDiacritics(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/[әӘ]/g, 'а')
    .replace(/[іІ]/g, 'и')
    .replace(/[ңҢ]/g, 'н')
    .replace(/[ғҒ]/g, 'г')
    .replace(/[үҮ]/g, 'у')
    .replace(/[ұҰ]/g, 'у')
    .replace(/[қҚ]/g, 'к')
    .replace(/[өӨ]/g, 'о')
    .replace(/[һҺ]/g, 'х')
}

export const GROCERY_TYPO_MAP = {
  // Молочные продукты / Dairy
  малако: 'молоко',
  молочко: 'молоко',
  молокоо: 'молоко',
  малачко: 'молоко',
  тварог: 'творог',
  тварожок: 'творог',
  творожок: 'творог',
  сметано: 'сметана',
  сметанк: 'сметана',
  сметанка: 'сметана',
  згущенка: 'сгущенка',
  мароженое: 'мороженое',
  марожное: 'мороженое',
  мороженное: 'мороженое',
  йогурд: 'йогурт',
  иогурт: 'йогурт',
  егурт: 'йогурт',
  маргаринн: 'маргарин',
  маслице: 'масло',
  сливкии: 'сливки',
  сливачное: 'сливочное',
  сыркы: 'сырки',

  // Хлеб и выпечка / Bakery
  хлеп: 'хлеб',
  хлебушек: 'хлеб',
  хлебчик: 'хлеб',
  булка: 'булочка',
  батонн: 'батон',
  лавашш: 'лаваш',
  печенья: 'печенье',
  печеньки: 'печенье',
  пиченье: 'печенье',
  печене: 'печенье',
  прянники: 'пряники',
  сухари: 'сухарики',

  // Мясо и колбасы / Meat & Sausages
  калбаса: 'колбаса',
  колбаска: 'колбаса',
  калбаска: 'колбаса',
  сасиски: 'сосиски',
  сосиськи: 'сосиски',
  сасиска: 'сосиски',
  сасисочки: 'сосиски',
  сарделькии: 'сардельки',
  сарделька: 'сардельки',
  паштетт: 'паштет',
  курочка: 'курица',
  курицо: 'курица',
  пильмени: 'пельмени',
  пельмешки: 'пельмени',
  вариники: 'вареники',
  фаршш: 'фарш',

  // Бакалея и крупы / Grocery & Grains
  макороны: 'макароны',
  макаронны: 'макароны',
  макарошки: 'макароны',
  спагети: 'спагетти',
  ролтон: 'роллтон',
  ролтонн: 'роллтон',
  ролтончик: 'роллтон',
  дошик: 'доширак',
  доширакк: 'доширак',
  гричка: 'гречка',
  греча: 'гречка',
  авсянка: 'овсянка',
  мукаа: 'мука',
  сахор: 'сахар',
  сольь: 'соль',
  падсолнечное: 'подсолнечное',
  пасолничное: 'подсолнечное',
  подсолнух: 'подсолнечное',

  // Овощи, фрукты, яйца / Fresh & Eggs
  картоха: 'картофель',
  картошка: 'картофель',
  картофельь: 'картофель',
  памидоры: 'помидоры',
  помидорки: 'помидоры',
  агурцы: 'огурцы',
  огурчики: 'огурцы',
  марковь: 'морковь',
  морковка: 'морковь',
  капусто: 'капуста',
  яица: 'яйца',
  яицо: 'яйцо',
  яички: 'яйца',
  бананчики: 'бананы',
  яблочки: 'яблоки',

  // Напитки и соусы / Drinks & Sauces
  маенез: 'майонез',
  майанез: 'майонез',
  майонезз: 'майонез',
  кетчуб: 'кетчуп',
  кетчупп: 'кетчуп',
  вадичка: 'вода',
  сочок: 'сок',
  газеровка: 'газировка',
  газированая: 'газированная',

  // Сладости / Sweets
  шокалад: 'шоколад',
  шоколатка: 'шоколад',
  шоколадка: 'шоколад',
  шоколадки: 'шоколад',
  канфеты: 'конфеты',
  конфетки: 'конфеты',
  вафельки: 'вафли',

  // Казахские термины без диакритики / Common Kazakh variations
  сут: 'сүт',
  каймак: 'қаймақ',
  шужык: 'шұжық',
  балык: 'балық',
  жумыртка: 'жұмыртқа',
  кантсыз: 'қантсыз',
  секер: 'шекер',
}

export function correctGroceryTypos(text) {
  if (!text || typeof text !== 'string') return ''
  const words = text.split(/\s+/)
  let changed = false
  const corrected = words.map((word) => {
    const clean = word.toLowerCase().replace(/^[^\wа-яёәіңғүұқөһ]+|[^\wа-яёәіңғүұқөһ]+$/giu, '')
    if (clean && GROCERY_TYPO_MAP[clean]) {
      changed = true
      return word.toLowerCase().replace(clean, GROCERY_TYPO_MAP[clean])
    }
    return word
  })
  return changed ? corrected.join(' ') : text
}

export function buildSearchQueryVariants(rawQuery) {
  const norm = normalizeSearchInput(rawQuery)
  if (!norm) return []

  const variants = [norm]

  const converted = normalizeSearchInput(convertKeyboardLayout(norm))
  if (converted && converted !== norm && !variants.includes(converted)) {
    variants.push(converted)
  }

  const kzNorm = normalizeKazakhDiacritics(norm)
  if (kzNorm && kzNorm !== norm && !variants.includes(kzNorm)) {
    variants.push(kzNorm)
  }

  const typoFixed = normalizeSearchInput(correctGroceryTypos(norm))
  if (typoFixed && typoFixed !== norm && !variants.includes(typoFixed)) {
    variants.push(typoFixed)
  }

  return variants
}
