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

  return variants
}
