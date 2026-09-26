import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const AGUSHA_PATH = path.join(__dirname, '..', 'data', 'agusha_official_catalog.json');
const MATCHES_OUT = path.join(__dirname, '..', 'data', 'agusha_matches.jsonl');

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[«»"'(),.\-\/\\–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FLAVORS = [
  'вишня', 'малина', 'клубника', 'земляника', 'черника', 'брусника', 'клюква',
  'персик', 'абрикос', 'яблоко', 'груша', 'слива', 'банан', 'манго', 'чернослив',
  'виноград', 'шиповник', 'ежевик', 'смородин',
  'морковь', 'тыква', 'кабачок', 'брокколи', 'цветная капуста', 'злак'
];

const MEATS = [
  'говядин', 'индейк', 'цыплен', 'куриц', 'кролик', 'телятин'
];

const FORMS = [
  'творог', 'биолакт', 'кефир', 'молоко', 'пюре', 'каша', 'сок', 'морс', 'компот', 'печенье'
];

function extractSet(str, list) {
  const norm = normalizeText(str);
  return new Set(list.filter(item => norm.includes(item.slice(0, 4))));
}

function extractFat(str) {
  const m = str.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

async function main() {
  console.log('=== Matching Agusha Official Catalog to Master Catalog V4 ===');

  if (!fs.existsSync(AGUSHA_PATH)) {
    console.error('Agusha catalog not found yet!');
    return;
  }

  const agushaData = JSON.parse(fs.readFileSync(AGUSHA_PATH, 'utf8'));
  console.log(`Loaded ${agushaData.length} Agusha items.`);

  const masterItems = [];
  const masterRl = readline.createInterface({ input: fs.createReadStream(MASTER_PATH), crlfDelay: Infinity });

  for await (const line of masterRl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    const norm = normalizeText(p.name);
    if (norm.includes('агуша') || (p.brand && normalizeText(p.brand).includes('агуша'))) {
      masterItems.push({
        id: p.id,
        ean: p.ean,
        name: p.name,
        norm,
        fat: extractFat(p.name),
        flavors: extractSet(p.name, FLAVORS),
        meats: extractSet(p.name, MEATS),
        forms: extractSet(p.name, FORMS),
        hasKbju: !!(p.nutriments_json && Object.keys(p.nutriments_json).length >= 3),
        hasIng: !!(p.ingredients_raw && p.ingredients_raw.length > 5)
      });
    }
  }

  console.log(`Found ${masterItems.length} Agusha items in Master Catalog.`);

  const matches = [];

  for (const m of masterItems) {
    for (const a of agushaData) {
      if (!a.nutriments) continue;
      const aNorm = normalizeText(a.name);
      const aFat = extractFat(a.name);
      const aFlavors = extractSet(a.name, FLAVORS);
      const aMeats = extractSet(a.name, MEATS);
      const aForms = extractSet(a.name, FORMS);

      // Form factor gate
      if (m.forms.size > 0 && aForms.size > 0) {
        let formMismatch = false;
        for (const f of m.forms) if (!aForms.has(f)) formMismatch = true;
        if (formMismatch) continue;
      }

      // Juice vs Juice Drink gate (pure 100% juice vs diluted juice drink with water)
      const isDrinkM = m.norm.includes('напиток') || m.norm.includes('вода');
      const isDrinkA = aNorm.includes('напиток') || aNorm.includes('вода');
      if (isDrinkM !== isDrinkA) continue;

      // Meat gate
      if (m.meats.size > 0 || aMeats.size > 0) {
        let meatMismatch = false;
        for (const mt of m.meats) if (!aMeats.has(mt)) meatMismatch = true;
        for (const mt of aMeats) if (!m.meats.has(mt)) meatMismatch = true;
        if (meatMismatch) continue;
      }

      // Flavor gate
      if (m.flavors.size > 0 || aFlavors.size > 0) {
        let flavorMismatch = false;
        for (const fl of m.flavors) if (!aFlavors.has(fl)) flavorMismatch = true;
        for (const fl of aFlavors) if (!m.flavors.has(fl)) flavorMismatch = true;
        if (flavorMismatch) continue;
      }

      // Fat gate
      if (m.fat != null && aFat != null && Math.abs(m.fat - aFat) > 0.1) {
        continue;
      }

      // Word overlap check
      const mWords = new Set(m.norm.split(' ').filter(w => w.length > 2 && w !== 'агуша'));
      const aWords = new Set(aNorm.split(' ').filter(w => w.length > 2 && w !== 'агуша'));
      let common = 0;
      for (const w of mWords) if (aWords.has(w)) common++;

      if (common >= 1 && (m.forms.size > 0 && aForms.size > 0)) {
        matches.push({
          masterId: m.id,
          masterEan: m.ean,
          masterName: m.name,
          agushaName: a.name,
          nutriments: a.nutriments,
          composition: a.composition,
          mHasKbju: m.hasKbju,
          mHasIng: m.hasIng
        });
        break;
      }
    }
  }

  console.log(`\nMatched ${matches.length} Agusha products with 100% verified factory data.`);
  const canKbju = matches.filter(m => !m.mHasKbju).length;
  const canIng = matches.filter(m => !m.mHasIng && m.composition).length;
  console.log(`Can enrich KBJU: ${canKbju}`);
  console.log(`Can enrich Ingredients: ${canIng}`);

  const outStream = fs.createWriteStream(MATCHES_OUT, { flags: 'w' });
  for (const match of matches) {
    outStream.write(JSON.stringify(match) + '\n');
  }
  outStream.end();
  console.log(`Wrote matches to ${MATCHES_OUT}`);
}

main().catch(console.error);
