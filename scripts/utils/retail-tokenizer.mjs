// Retail Tokenizer & Matcher for FMCG Kazakhstan
// Handles Kazakh-Russian letter normalization, retail packaging abbreviations, weights and inverted index

export const KAZAKH_CYRILLIC_MAP = {
  'қ': 'к', 'ғ': 'г', 'ұ': 'у', 'ү': 'у', 'ә': 'а', 'ө': 'о', 'ң': 'н', 'і': 'и', 'һ': 'х',
  'Қ': 'к', 'Ғ': 'г', 'Ұ': 'у', 'Ү': 'у', 'Ә': 'а', 'Ө': 'о', 'Ң': 'н', 'І': 'и', 'Һ': 'х'
};

export const RETAIL_ABBREVIATIONS = new Set([
  'к/у', 'м/у', 'д/п', 'т/п', 'в/у', 'ж/б', 'ст/б', 'с/бут', 'п/бут', 'пэт',
  'в/с', '1/с', 'б/к', 'с/к', 'в/к', 'п/к', 'б/г', 'с/м', 'б/а', 'кор', 'фас', 'вес'
]);

export const RETAIL_ABBR_REGEX = /(?:^|\s)(к\/у|м\/у|д\/п|т\/п|в\/у|ж\/б|ст\/б|с\/бут|п\/бут|пэт|в\/с|1\/с|б\/к|с\/к|в\/к|п\/к|б\/г|с\/м|б\/а|кор|фас|вес)(?:\s|$|[.,])/gi;

export const STOP_WORDS = new Set([
  'в', 'и', 'с', 'со', 'для', 'из', 'на', 'по', 'от', 'до', 'к', 'о', 'об',
  'вкус', 'вкусом', 'товар', 'продукт', 'штука', 'шт', 'упаковка', 'пакет',
  'kz', 'казахстан', 'россия', 'рф', 'импорт', 'набор', 'супермаркет', 'акция',
  'г', 'гр', 'грамм', 'кг', 'килограмм', 'мл', 'миллилитр', 'л', 'литр'
]);

export function normalizeKazakhChars(str) {
  if (!str) return '';
  return String(str).replace(/[қғұүәөңіһҚҒҰҮӘӨҢІҺ]/g, ch => KAZAKH_CYRILLIC_MAP[ch] || ch);
}

export function extractPackagingFromAbbr(title) {
  if (!title) return null;
  const match = title.match(RETAIL_ABBR_REGEX);
  if (!match) return null;
  const raw = match[0].trim().toLowerCase().replace(/^[^\wа-яё/]+|[^\wа-яё/]+$/g, '');
  const map = {
    'м/у': 'Мягкая упаковка',
    'пэт': 'ПЭТ-упаковка',
    'к/у': 'Картонная упаковка',
    'ж/б': 'Жестяная банка',
    'ст/б': 'Стеклянная банка',
    'с/бут': 'Стеклянная бутылка',
    'п/бут': 'Пластиковая бутылка',
    'д/п': 'Дой-пак',
    'т/п': 'Тетрапак',
    'в/у': 'Вакуумная упаковка'
  };
  return map[raw] || null;
}

export function extractNormalizedWeight(str) {
  if (!str) return null;
  const s = String(str);

  // Piece counts: e.g. "30 шт", "10шт", "20 пакетиков"
  const pcsMatch = s.match(/(\d+)\s*(?:шт|штук(?:и|а)?|пакетик(?:ов|а)?)(?![а-яёa-z0-9])/i);
  const pieces = pcsMatch ? parseInt(pcsMatch[1], 10) : null;

  // Kilograms: e.g. "1.5 кг", "1,5кг", "1 кг", "2кг"
  const kgMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:кг|килограмм(?:а|ов)?)(?![а-яёa-z0-9])/i);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return { grams: Math.round(val * 1000), pieces, raw: kgMatch[0] };
  }

  // Liters: e.g. "1.5 л", "1,5л", "1 л", "2л", "0.5 л", "0,8 л"
  const lMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:л|литр(?:а|ов)?)(?![а-яёa-z0-9])/i);
  if (lMatch) {
    const val = parseFloat(lMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return { ml: Math.round(val * 1000), pieces, raw: lMatch[0] };
  }

  // Milliliters: e.g. "500 мл", "500мл", "330 мл"
  const mlMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:мл|миллилитр(?:а|ов)?)(?![а-яёa-z0-9])/i);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return { ml: Math.round(val), pieces, raw: mlMatch[0] };
  }

  // Grams: e.g. "500 г", "500г", "500 гр", "500грамм", "400гр"
  const gMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм(?:а|ов)?)(?![а-яёa-z0-9])/i);
  if (gMatch) {
    const val = parseFloat(gMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return { grams: Math.round(val), pieces, raw: gMatch[0] };
  }

  if (pieces) return { pieces, raw: pcsMatch[0] };

  return null;
}

export function areWeightsCompatible(w1, w2) {
  if (!w1 || !w2) return true; // Can't rule out if one is missing

  // Pieces check (e.g. 30 eggs vs 10 eggs)
  if (w1.pieces && w2.pieces && w1.pieces !== w2.pieces) {
    return false;
  }

  if (w1.grams !== undefined && w2.grams !== undefined) {
    // 5% or 5g tolerance for slight manufacturer pack redesigns
    const diff = Math.abs(w1.grams - w2.grams);
    const maxG = Math.max(w1.grams, w2.grams);
    if (diff <= 5 || (diff / maxG) <= 0.06) return true;
    return false;
  }

  if (w1.ml !== undefined && w2.ml !== undefined) {
    const diff = Math.abs(w1.ml - w2.ml);
    const maxMl = Math.max(w1.ml, w2.ml);
    if (diff <= 10 || (diff / maxMl) <= 0.06) return true;
    return false;
  }

  // Cross check for liquids/dairy (1000g vs 1000ml)
  const v1 = w1.grams || w1.ml;
  const v2 = w2.grams || w2.ml;
  if (v1 && v2) {
    const diff = Math.abs(v1 - v2);
    const maxV = Math.max(v1, v2);
    return diff <= 10 || (diff / maxV) <= 0.06;
  }

  return true;
}

export function extractFatPercent(str) {
  if (!str) return null;
  const match = String(str).match(/(\d+(?:[.,]\d+)?)\s*%/);
  return match ? parseFloat(match[1].replace(',', '.')) : null;
}

export function cleanTokens(title) {
  if (!title) return [];
  // 1. Normalize Kazakh characters
  let clean = normalizeKazakhChars(title).toLowerCase();

  // 2. Strip retail packaging abbreviations
  clean = clean.replace(RETAIL_ABBR_REGEX, ' ');

  // 3. Remove punctuation and special symbols
  clean = clean.replace(/[«»""''`(),.:;!/?\\#№*+%_–—-]/g, ' ');

  // 4. Remove standalone numbers and weights (with or without space)
  clean = clean.replace(/\d+(?:[.,]\d+)?\s*(?:г|гр|грамм(?:а|ов)?|кг|килограмм(?:а|ов)?|мл|миллилитр(?:а|ов)?|л|литр(?:а|ов)?|шт|штук(?:и|а)?|пакетик(?:ов|а)?)\b/gi, ' ');
  clean = clean.replace(/\b\d+\b/g, ' ');

  // 5. Tokenize and filter stop words
  return clean
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t) && !RETAIL_ABBREVIATIONS.has(t));
}

export function calculateTokenOverlap(tokens1, tokens2) {
  if (!tokens1 || !tokens2 || tokens1.length === 0 || tokens2.length === 0) return 0;
  const s1 = new Set(tokens1);
  const s2 = new Set(tokens2);

  let intersection = 0;
  for (const t of s1) {
    if (s2.has(t)) intersection++;
  }

  const union = new Set([...s1, ...s2]).size;
  return union === 0 ? 0 : intersection / union;
}

// Inverted Index Class for high-performance candidate retrieval
export class InvertedIndex {
  constructor() {
    this.index = new Map(); // token -> Set<donorId>
    this.donors = new Map(); // donorId -> donorObject
  }

  addDonor(donor) {
    const id = `${donor.source}_${donor.id}`;
    this.donors.set(id, donor);
    for (const token of donor.cleanTokens) {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token).add(id);
    }
  }

  search(masterTokens, masterWeight, masterFat, topK = 5) {
    if (!masterTokens || masterTokens.length === 0) return [];

    const candidateScores = new Map(); // id -> score

    for (const token of masterTokens) {
      const matchingIds = this.index.get(token);
      if (!matchingIds) continue;

      // Rare tokens have higher weight (simple IDF proxy)
      const tokenWeight = matchingIds.size < 50 ? 2.5 : matchingIds.size < 200 ? 1.5 : 1.0;

      for (const id of matchingIds) {
        candidateScores.set(id, (candidateScores.get(id) || 0) + tokenWeight);
      }
    }

    const scored = [];
    for (const [id, rawScore] of candidateScores.entries()) {
      const donor = this.donors.get(id);

      // Strict weight compatibility gate
      if (!areWeightsCompatible(masterWeight, donor.weight)) continue;

      // Fat percent check (e.g. 2.5% vs 3.2% milk MUST NOT match)
      if (masterFat !== null && donor.fatPercent !== null && Math.abs(masterFat - donor.fatPercent) > 0.1) {
        continue;
      }

      // Calculate Jaccard similarity on tokens
      const jaccard = calculateTokenOverlap(masterTokens, donor.cleanTokens);
      if (jaccard < 0.30) continue; // High-precision threshold

      const finalScore = jaccard * 0.7 + (rawScore / (masterTokens.length * 2)) * 0.3;
      scored.push({ donor, score: finalScore, jaccard });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}
