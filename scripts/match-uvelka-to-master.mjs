import fs from 'fs';
import path from 'path';
import readline from 'readline';

const MASTER_PATH = 'data/korset_master_catalog_v4_final.jsonl';
const UVELKA_PATH = 'data/uvelka_official_catalog.json';
const OUT_LOG = 'data/uvelka_matches.jsonl';

const uvelkaItems = fs.existsSync(UVELKA_PATH) ? JSON.parse(fs.readFileSync(UVELKA_PATH, 'utf8')) : [];
console.log(`Loaded ${uvelkaItems.length} official Uvelka items.`);

const GRAIN_TYPES = [
  'гречневая', 'гречка', 'рис', 'пшено', 'перловая', 'ячневая', 'пшеничная',
  'манная', 'овсяная', 'овсяные', 'геркулес', 'кукурузная', 'булгур', 'кускус',
  'киноа', 'чечевица', 'горох', 'полба', 'маш', 'дружба'
];

const RICE_VARIETIES = [
  'круглозерный', 'длиннозерный', 'басмати', 'жасмин', 'бурый', 'пропаренный', 'красный', 'черный'
];

const KNOWN_FLAVORS = [
  'черника', 'клубника', 'малина', 'яблоко', 'персик', 'абрикос', 'вишня', 'лесные ягоды',
  'сливки', 'молоко', 'курага', 'изюм', 'чернослив', 'банан', 'шоколад', 'грибы', 'овощи'
];

function cleanWords(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[0-9]+([\,\.][0-9]+)?\s*(гр|г|мл|л|кг|шт|%)/gi, ' ')
    .replace(/[^a-zа-я]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['для', 'без', 'под', 'вес', 'м/у', 'к/у', 'увелка', 'uvelka', 'крупа', 'пакетиках', 'варки'].includes(w));
}

function extractGrainType(name) {
  const lower = name.toLowerCase();
  return GRAIN_TYPES.find(g => lower.includes(g)) || null;
}

function extractRiceVariety(name) {
  const lower = name.toLowerCase();
  return RICE_VARIETIES.find(v => lower.includes(v)) || null;
}

function extractFlavors(str) {
  const lower = (str || '').toLowerCase();
  return KNOWN_FLAVORS.filter(f => lower.includes(f));
}

const masterRl = readline.createInterface({
  input: fs.createReadStream(MASTER_PATH),
  crlfDelay: Infinity
});

const verifiedMatches = [];

for await (const line of masterRl) {
  if (!line.trim()) continue;
  const p = JSON.parse(line);
  const hasPhoto = p.image_url && !p.image_url.includes('empty_photo') && !p.image_url.includes('no-photo');
  const isFood = (p.category !== 'personal_care' && p.category !== 'household');
  const needsKbju = !p.nutriments_json || Object.keys(p.nutriments_json).length === 0;

  if (!hasPhoto || !isFood || !needsKbju) continue;

  const pNameLower = p.name.toLowerCase();
  const pBrandLower = (p.brand || '').toLowerCase();

  const isUvelka = pNameLower.includes('увелк') || pBrandLower.includes('увелк') || pNameLower.includes('uvelka');
  if (!isUvelka) continue;

  const pGrain = extractGrainType(p.name);
  if (!pGrain) continue;

  const pRice = pGrain === 'рис' ? extractRiceVariety(p.name) : null;
  const pFlavors = extractFlavors(p.name);
  const pInBags = /пакет/i.test(p.name);

  let best = null;
  let bestScore = 0;

  for (const u of uvelkaItems) {
    if (u.protein === null || u.fat === null || u.carbs === null || u.calories === null) continue;
    const uLower = (u.title + ' ' + (u.subtitle || '')).toLowerCase();
    const uGrain = extractGrainType(u.title + ' ' + (u.subtitle || ''));

    // 1. Strict Grain Type Invariant
    if (pGrain !== uGrain) continue;

    // Check specific полба vs пшеничная
    if (/полба/i.test(p.name) && !/полба/i.test(uLower)) continue;
    if (!/полба/i.test(p.name) && /полба/i.test(uLower)) continue;

    // Strict brand check
    if (!pNameLower.includes('увелк') && !pBrandLower.includes('увелк')) continue;

    // 2. Strict Rice Variety Invariant
    if (pGrain === 'рис') {
      const uRice = extractRiceVariety(u.title + ' ' + (u.subtitle || ''));
      if (pRice && uRice && pRice !== uRice) continue;
      if (pRice && !uRice) continue;
      if (!pRice && uRice) continue;
    }

    // 3. Strict Boil-in-bag Invariant
    const uInBags = /пакетиках/i.test(u.source_url) || /пакетик/i.test(uLower);
    if (pInBags !== uInBags) continue;

    // 4. Strict Flavor Invariant
    const uFlavors = extractFlavors(uLower);
    if (pFlavors.length > 0 || uFlavors.length > 0) {
      const matchAllMaster = pFlavors.every(pf => uFlavors.includes(pf) || uLower.includes(pf));
      const matchAllCandidate = uFlavors.every(uf => pFlavors.includes(uf) || pNameLower.includes(uf));
      if (!matchAllMaster || !matchAllCandidate) continue;
    }

    const pWords = cleanWords(p.name);
    const uWords = cleanWords(u.title + ' ' + (u.subtitle || ''));
    let inter = 0;
    for (const w of pWords) {
      if (uWords.includes(w)) inter++;
    }
    const score = inter / Math.max(1, new Set([...pWords, ...uWords]).size);
    if (score > bestScore) {
      bestScore = score;
      best = u;
    }
  }

  if (best && bestScore >= 0.25) {
    // Physical validation check
    const pVal = best.protein || 0;
    const fVal = best.fat || 0;
    const cVal = best.carbs || 0;
    if (pVal + fVal + cVal <= 100) {
      verifiedMatches.push({
        masterId: p.id,
        masterEan: p.ean,
        masterName: p.name,
        brand: 'Увелка',
        manufacturerTitle: best.title,
        url: best.source_url,
        score: bestScore.toFixed(2),
        nutriments: {
          energy_kcal: best.calories,
          protein_100g: best.protein,
          fat_100g: best.fat,
          carbohydrates_100g: best.carbs
        },
        composition: best.composition || null
      });
    }
  }
}

console.log(`\nStrict Verified Uvelka Matches: ${verifiedMatches.length}`);
fs.writeFileSync(OUT_LOG, verifiedMatches.map(m => JSON.stringify(m)).join('\n') + '\n');
console.log(`Saved to ${OUT_LOG}`);
console.log('Sample verified matches:');
verifiedMatches.slice(0, 15).forEach((m, i) => {
  console.log(`${i+1}. [${m.brand}] ${m.masterName} => ${m.manufacturerTitle} (score: ${m.score}) | P:${m.nutriments.protein_100g} F:${m.nutriments.fat_100g} C:${m.nutriments.carbohydrates_100g} Cal:${m.nutriments.energy_kcal}`);
});
