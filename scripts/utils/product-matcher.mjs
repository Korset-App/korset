// Product matching utility for brand normalization, weight extraction, and token comparison

const BRAND_ALIASES = {
  'рахат': 'rakhat',
  'rakhat': 'rakhat',
  'лактель': 'lactel',
  'lactel': 'lactel',
  'баян сулу': 'bayansulu',
  'баян сұлу': 'bayansulu',
  'bayan sulu': 'bayansulu',
  'фудмастер': 'foodmaster',
  'foodmaster': 'foodmaster',
  'данон': 'danone',
  'danone': 'danone',
  'президент': 'president',
  'président': 'president',
  'president': 'president',
  'нестле': 'nestle',
  'nestle': 'nestle',
  'ferrero': 'ferrero',
  'ферреро': 'ferrero',
  'storck': 'storck',
  'шторк': 'storck',
  'первомайские деликатесы': 'pervomayskie',
  'первомайские': 'pervomayskie',
  'первомайский': 'pervomayskie',
  'цесна': 'tsesna',
  'tsesna': 'tsesna',
  'султан': 'sultan',
  'sultan': 'sultan',
  'макси чай': 'maxichai',
  'maxi чай': 'maxichai',
  'maxi tea': 'maxichai',
  'махi чай': 'maxichai',
  'ассам': 'assam',
  'assam': 'assam',
  'пиала': 'piala',
  'piala': 'piala',
  'пиала gold': 'piala',
  'гринфилд': 'greenfield',
  'greenfield': 'greenfield',
  'тесс': 'tess',
  'tess': 'tess',
  'липтон': 'lipton',
  'lipton': 'lipton',
  'ахмад': 'ahmad',
  'ahmad tea': 'ahmad',
  'ahmad': 'ahmad',
  'макфа': 'makfa',
  'makfa': 'makfa',
  'барилла': 'barilla',
  'barilla': 'barilla',
  'домик в деревне': 'domikvderevne',
  'чудо': 'chudo',
  'chudo': 'chudo',
  'простоквашино': 'prostokvashino',
  'ак-булак': 'akbulak',
  'ақ-бұлақ': 'akbulak',
  'ак булак': 'akbulak',
  'курочка ряба': 'kurochkaryaba',
  'алель': 'alel',
  'alel': 'alel',
  'lays': 'lays',
  'лейс': 'lays',
  'лейз': 'lays',
  'добрый': 'dobry',
  'добрый сок': 'dobry',
  'рич': 'rich',
  'rich': 'rich',
  'моя семья': 'moyasemiya',
  'натура': 'natura',
  'natura': 'natura',
  'петропавловский': 'petropavlovskiy',
  'кдв': 'kdv',
  'kdv': 'kdv',
  'яшкино': 'yashkino',
  'yashkino': 'yashkino'
};

export function normalizeBrand(brand) {
  if (!brand) return '';
  const clean = String(brand)
    .toLowerCase()
    .replace(/[«»""''`]/g, '')
    .replace(/^(ао|тоо|ип|ооо|зао|llc|jsc|kz)\s+/i, '')
    .replace(/\s+(ао|тоо|ип|ооо|зао|llc|jsc|kz)$/i, '')
    .trim();

  if (BRAND_ALIASES[clean]) return BRAND_ALIASES[clean];

  // Try direct lookup without punctuation
  const stripped = clean.replace(/[-_.\s]+/g, ' ').trim();
  if (BRAND_ALIASES[stripped]) return BRAND_ALIASES[stripped];

  return stripped;
}

export function extractNormalizedWeight(str) {
  if (!str) return null;
  const s = String(str);

  // Pattern for KG: e.g. "1.5 кг", "1,5кг", "1 кг", "2кг"
  const kgMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:кг|килограмм(?:а|ов)?)(?![а-яёa-z0-9])/i);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return { grams: Math.round(val * 1000), raw: kgMatch[0] };
  }

  // Pattern for Liters: e.g. "1.5 л", "1,5л", "1 л", "2л", "0.5 л"
  const lMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:л|литр(?:а|ов)?)(?![а-яёa-z0-9])/i);
  if (lMatch) {
    const val = parseFloat(lMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return { ml: Math.round(val * 1000), raw: lMatch[0] };
  }

  // Pattern for Milliliters: e.g. "500 мл", "500мл", "330 мл"
  const mlMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:мл|миллилитр(?:а|ов)?)(?![а-яёa-z0-9])/i);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return { ml: Math.round(val), raw: mlMatch[0] };
  }

  // Pattern for Grams: e.g. "500 г", "500г", "500 гр", "500грамм"
  const gMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм(?:а|ов)?)(?![а-яёa-z0-9])/i);
  if (gMatch) {
    const val = parseFloat(gMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return { grams: Math.round(val), raw: gMatch[0] };
  }

  return null;
}

export function areWeightsCompatible(w1, w2) {
  if (!w1 || !w2) return true; // Can't rule out if one is missing
  if (w1.grams !== undefined && w2.grams !== undefined) {
    return Math.abs(w1.grams - w2.grams) <= 1; // 1 gram tolerance for rounding
  }
  if (w1.ml !== undefined && w2.ml !== undefined) {
    return Math.abs(w1.ml - w2.ml) <= 2; // 2 ml tolerance
  }
  // Cross check: e.g. 1000g vs 1000ml for liquids
  const v1 = w1.grams || w1.ml;
  const v2 = w2.grams || w2.ml;
  if (v1 && v2 && Math.abs(v1 - v2) <= 2) return true;

  return false;
}

const STOP_WORDS = new Set([
  'в', 'и', 'с', 'со', 'для', 'из', 'на', 'по', 'от', 'до', 'к', 'о', 'об',
  'вкус', 'вкусом', 'товар', 'продукт', 'штука', 'шт', 'упаковка', 'пакет',
  'kz', 'казахстан', 'россия', 'рф', 'импорт'
]);

export function cleanTokens(title, brand = '') {
  if (!title) return [];
  const bTokens = new Set(normalizeBrand(brand).split(/\s+/));

  return title
    .toLowerCase()
    .replace(/[«»""''`(),.:;!/?\\#№*+%-]/g, ' ')
    .replace(/\b\d+([.,]\d+)?\s*(г|гр|кг|мл|л|шт)\b/gi, ' ')
    .replace(/\b\d+\b/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t) && !bTokens.has(t));
}

export function calculateTokenOverlap(tokens1, tokens2) {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  const s1 = new Set(tokens1);
  const s2 = new Set(tokens2);

  let intersection = 0;
  for (const t of s1) {
    if (s2.has(t)) intersection++;
  }

  const union = new Set([...s1, ...s2]).size;
  return union === 0 ? 0 : intersection / union;
}
