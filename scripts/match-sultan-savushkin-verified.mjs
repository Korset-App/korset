import fs from 'fs';
import readline from 'readline';

const MASTER_PATH = 'data/korset_master_catalog_v4_final.jsonl';
const SULTAN_PATH = 'data/sultan_official_catalog.json';
const SAVUSHKIN_PATH = 'data/savushkin_official_catalog.json';
const OUT_LOG = 'data/sultan_savushkin_matches.jsonl';

const sultanItems = fs.existsSync(SULTAN_PATH) ? JSON.parse(fs.readFileSync(SULTAN_PATH, 'utf8')) : [];
const savushkinItems = fs.existsSync(SAVUSHKIN_PATH) ? JSON.parse(fs.readFileSync(SAVUSHKIN_PATH, 'utf8')) : [];

console.log(`Loaded ${sultanItems.length} Sultan items and ${savushkinItems.length} Savushkin items.`);

const FLAVORS = [
  'клубник', 'малин', 'землян', 'черник', 'вишн', 'черешн', 'персик', 'абрикос', 'манgo',
  'маракуй', 'ананас', 'кокос', 'лимон', 'лайм', 'апельсин', 'грейпфрут', 'дыня', 'киви',
  'банан', 'чернослив', 'злак', 'мак', 'изюм', 'бисквит', 'страчателла', 'шоколад', 'ваниль',
  'карамел', 'фундук', 'трюфел', 'марципан', 'халва', 'томат', 'чеснок', 'прованск',
  'ягод', 'смородин', 'облепих', 'имбир', 'мята', 'огурец', 'груш', 'кактус', 'сгущен'
];

const PASTA_SHAPES = [
  'спагетти', 'спирали', 'рожки', 'вермишель', 'перья', 'ракушки', 'гнезда', 'паутинка',
  'букатини', 'лингвини', 'трубочки', 'бантики', 'лапша', 'колечки'
];

function extractFlavors(str) {
  const s = (str || '').toLowerCase();
  return FLAVORS.filter(f => s.includes(f)).sort();
}

function extractFat(str) {
  const m = (str || '').match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

function getPastaShape(str) {
  const s = str.toLowerCase();
  return PASTA_SHAPES.find(shape => s.includes(shape)) || null;
}

function cleanTokens(str) {
  return str.toLowerCase()
    .replace(/[0-9]+([\,\.][0-9]+)?\s*(гр|г|мл|л|кг|шт|%)/gi, ' ')
    .replace(/[^a-zа-я]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['для', 'без', 'под', 'вес', 'м/у', 'к/у', 'шоубокс', 'пэт', 'ст/б', 'ж/б', 'савушкин', 'султан', 'sultan'].includes(w));
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

  const pName = p.name.toLowerCase();
  const pBrand = (p.brand || '').toLowerCase();

  // --- SULTAN MATCHING ---
  const isSultanMfr = (pName.includes('султан') || pBrand.includes('султан')) &&
                      !/чай|пакистан|hurrem|suleyman|носки|следки|колбас/i.test(pName);

  if (isSultanMfr) {
    const isWaffles = /вафли/i.test(pName);
    const isCookies = /печенье/i.test(pName);
    const isFlour = /мука/i.test(pName);
    const isPasta = /макарон|спагетти|рожки|перья|спирали|вермишель|ракушки|лапша/i.test(pName);

    const pPasta = getPastaShape(pName);
    const pFlavors = extractFlavors(pName);
    const pTokens = cleanTokens(pName);

    let best = null;
    let bestScore = -1;

    for (const s of sultanItems) {
      if (!s.calories && !s.protein) continue;
      const sTitle = s.title.toLowerCase();
      const sIsWaffles = /вафли/i.test(sTitle);
      const sIsCookies = /печенье/i.test(sTitle);
      const sIsFlour = /мука/i.test(sTitle);
      const sIsPasta = !sIsWaffles && !sIsCookies && !sIsFlour;

      if (isWaffles !== sIsWaffles || isCookies !== sIsCookies || isFlour !== sIsFlour || isPasta !== sIsPasta) continue;

      if (isPasta) {
        const sPasta = getPastaShape(sTitle);
        if (!pPasta || !sPasta || pPasta !== sPasta) continue;
      }

      const sFlavors = extractFlavors(sTitle);
      if (pFlavors.length > 0 || sFlavors.length > 0) {
        if (pFlavors.join(',') !== sFlavors.join(',')) continue;
      }

      // Check specific tokens for cookies / waffles
      const sTokens = cleanTokens(sTitle);
      let inter = 0;
      for (const t of pTokens) {
        if (sTokens.includes(t)) inter++;
      }
      const score = inter / Math.max(1, new Set([...pTokens, ...sTokens]).size);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }

    if (best && bestScore >= 0.40) {
      verifiedMatches.push({
        masterId: p.id,
        masterEan: p.ean,
        masterName: p.name,
        brand: 'Султан',
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
      continue;
    }
  }

  // --- SAVUSHKIN GROUP MATCHING ---
  const isSav = /савушкин|теос|\bteos\b|свеза|\bsveza\b|оптималь|активил|брест.*литовск/i.test(pName) ||
                /савушкин|теос|\bteos\b|свеза|\bsveza\b|оптималь|активил|брест.*литовск/i.test(pBrand);

  if (isSav) {
    const pFat = extractFat(pName);
    const pFlavors = extractFlavors(pName);

    const isPitevoy = /пить/i.test(pName);
    const isSyrok = /сырок/i.test(pName);
    const isTvorogZern = /зернен/i.test(pName);
    const isPasta = /паста.*творож|творож.*паста/i.test(pName);
    const isPuding = /пудинг/i.test(pName);
    const isBionapitok = /бионапиток/i.test(pName);

    let best = null;

    for (const s of savushkinItems) {
      if (!s.calories && !s.protein) continue;
      const sTitle = s.title.toLowerCase();

      // Form gates
      if (isPitevoy && !/пить/i.test(sTitle)) continue;
      if (!isPitevoy && /пить/i.test(sTitle)) continue;
      if (isSyrok && !/сырок/i.test(sTitle)) continue;
      if (!isSyrok && /сырок/i.test(sTitle)) continue;
      if (isTvorogZern && !/зернен/i.test(sTitle)) continue;
      if (!isTvorogZern && /зернен/i.test(sTitle)) continue;
      if (isPasta && !/паста/i.test(sTitle)) continue;
      if (!isPasta && /паста/i.test(sTitle)) continue;
      if (isPuding && !/пудинг/i.test(sTitle)) continue;
      if (!isPuding && /пудинг/i.test(sTitle)) continue;
      if (isBionapitok && !/бионапиток/i.test(sTitle)) continue;
      if (!isBionapitok && /бионапиток/i.test(sTitle)) continue;

      // Fat gate
      const sFat = extractFat(sTitle) || (s.fat_percent ? extractFat(s.fat_percent) : null);
      if (pFat !== null && sFat !== null && Math.abs(pFat - sFat) > 0.1) continue;

      // Flavor gate: EXACT set
      const sFlavors = extractFlavors(sTitle + ' ' + (s.flavor || ''));
      if (pFlavors.join(',') !== sFlavors.join(',')) continue;

      // Sub-brand gate
      const isTeosP = /теос|teos/i.test(pName);
      const isTeosS = /теос|teos/i.test(sTitle);
      if (isTeosP !== isTeosS) continue;

      const isOptP = /оптималь/i.test(pName);
      const isOptS = /оптималь/i.test(sTitle);
      if (isOptP !== isOptS) continue;

      const isAktP = /активил/i.test(pName);
      const isAktS = /активил/i.test(sTitle);
      if (isAktP !== isAktS) continue;

      // Prevent sweet vs sour butter mixup
      if (/кислосливочн|финск/i.test(pName) && !/кислосливочн|финск/i.test(sTitle)) continue;
      if (/сладкосливочн|классическ/i.test(pName) && !/сладкосливочн|классическ/i.test(sTitle)) continue;

      // Prevent syrok brand mixups (e.g. Плюш / Коровка / Аленка)
      if (isSyrok && !/плюш/i.test(pName) && /плюш/i.test(sTitle)) continue;
      if (isSyrok && !/коровка/i.test(pName) && /коровка/i.test(sTitle)) continue;
      if (isSyrok && !/аленка/i.test(pName) && /аленка/i.test(sTitle)) continue;

      best = s;
      break;
    }

    if (best) {
      verifiedMatches.push({
        masterId: p.id,
        masterEan: p.ean,
        masterName: p.name,
        brand: best.brand || 'Савушкин',
        manufacturerTitle: best.title,
        url: best.source_url,
        score: '1.00',
        nutriments: {
          energy_kcal: best.calories,
          protein_100g: best.protein,
          fat_100g: best.fat,
          carbohydrates_100g: best.carbs
        },
        composition: null
      });
    }
  }
}

console.log(`\nStrict Verified Matches: ${verifiedMatches.length}`);
fs.writeFileSync(OUT_LOG, verifiedMatches.map(m => JSON.stringify(m)).join('\n') + '\n');
console.log(`Saved to ${OUT_LOG}`);
console.log('Sample verified matches:');
verifiedMatches.slice(0, 20).forEach((m, i) => {
  console.log(`${i+1}. [${m.brand}] "${m.masterName}" <=> "${m.manufacturerTitle}" | P:${m.nutriments.protein_100g} F:${m.nutriments.fat_100g} C:${m.nutriments.carbohydrates_100g} Cal:${m.nutriments.energy_kcal}`);
});
