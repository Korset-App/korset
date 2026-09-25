import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalize(s) {
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
}

const STOP_WORDS = new Set([
  'для', 'или', 'под', 'при', 'без', 'шт', 'кг', 'гр', 'мл', 'пэт', 'м/у', 'т/п', 'ст/б', 'ж/б', 'д/п', 'к/у', 'с', 'со', 'в', 'и', 'на', 'по', 'из', 'от', 'до'
]);

function getTokens(s) {
  return normalize(s).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function extractWeight(s) {
  const m = (s || '').match(/(\d+(?:[.,]\d+)?)\s*(г|кг|л|мл|гр)/i);
  if (!m) return null;
  let val = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].toLowerCase();
  if (unit === 'кг' || unit === 'л') val *= 1000;
  return Math.round(val);
}

// Load catalogs
const gmList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'galmart_catalog.json'), 'utf8'));
const rawArbuz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'v3_cache', 'arbuz_products.json'), 'utf8'));
const arbuzList = Array.isArray(rawArbuz) ? rawArbuz : Object.values(rawArbuz);
const kdvList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'kdv_catalog.json'), 'utf8'));
const korzinaList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json'), 'utf8'));

console.log('Galmart items:', gmList.length);
console.log('Arbuz items:', arbuzList.length);
console.log('KDV items:', kdvList.length);
console.log('Korzina items:', korzinaList.length);

// Extract known brands
const allBrands = new Set();
for (const x of [...gmList, ...arbuzList, ...kdvList, ...korzinaList]) {
  const b = normalize(x.brand);
  if (b && b.length > 2) allBrands.add(b);
}
console.log('Known retail brands in index:', allBrands.size);

function buildIndex(list, getTitle, getBrand) {
  const byBrand = new Map();
  for (const item of list) {
    const rawBrand = getBrand(item);
    const brand = normalize(rawBrand);
    if (!brand) continue;
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    const title = getTitle(item);
    const tokens = getTokens(title).filter(t => !brand.includes(t));
    byBrand.get(brand).push({
      item,
      title,
      brand,
      tokens: new Set(tokens),
      tokenList: tokens,
      vw: extractWeight(title)
    });
  }
  return byBrand;
}

const gmIndex = buildIndex(gmList, x => x.title, x => x.brand);
const arbuzIndex = buildIndex(arbuzList, x => x.name || x.catalog_name, x => x.brand);
const kdvIndex = buildIndex(kdvList, x => x.title, x => x.brand || 'kdv');
const korzinaIndex = buildIndex(korzinaList, x => x.productName, x => x.brand);

function detectBrand(name, givenBrand) {
  if (givenBrand) {
    const nb = normalize(givenBrand);
    if (nb) return nb;
  }
  const normName = normalize(name);
  for (const b of allBrands) {
    if (b.length > 3 && (normName === b || normName.startsWith(b + ' ') || normName.includes(' ' + b + ' ') || normName.endsWith(' ' + b))) {
      return b;
    }
  }
  return null;
}

function matchItem(name, givenBrand, index) {
  const brand = detectBrand(name, givenBrand);
  if (!brand || !index.has(brand)) return null;

  const candidates = index.get(brand);
  const pTokens = getTokens(name).filter(t => !brand.includes(t));
  const pVw = extractWeight(name);

  let best = null;
  let maxOverlap = 0;

  for (const c of candidates) {
    // If weights differ by more than 15%, skip
    if (pVw && c.vw && Math.abs(pVw - c.vw) > pVw * 0.15) continue;

    let overlap = 0;
    for (const t of pTokens) {
      if (c.tokens.has(t)) overlap++;
    }

    // At least 2 tokens overlap (or 1 if product has only 1 token)
    const minRequired = Math.min(2, pTokens.length);
    if (overlap >= minRequired && overlap > maxOverlap) {
      maxOverlap = overlap;
      best = c;
    }
  }

  return best ? best.item : null;
}

async function testAll() {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl')),
    crlfDelay: Infinity
  });

  let total = 0;
  let gmMatches = 0;
  let arbuzMatches = 0;
  let kdvMatches = 0;
  let korzinaMatches = 0;
  let withPhoto = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    const p = JSON.parse(line);
    const gm = matchItem(p.name, p.brand, gmIndex);
    const ab = matchItem(p.name, p.brand, arbuzIndex);
    const kdv = matchItem(p.name, p.brand, kdvIndex);
    const kz = matchItem(p.name, p.brand, korzinaIndex);

    let hasPhoto = false;
    if (gm) {
      gmMatches++;
      if (gm.photos?.length > 0) hasPhoto = true;
    }
    if (ab) {
      arbuzMatches++;
      if (ab.image_url) hasPhoto = true;
    }
    if (kdv) {
      kdvMatches++;
      if (kdv.image) hasPhoto = true;
    }
    if (kz) {
      korzinaMatches++;
    }

    if (hasPhoto) withPhoto++;
  }

  console.log(`\n=== Matched Across ALL ${total} Products ===`);
  console.log('Galmart matches:', gmMatches, `(out of ${gmList.length} items in Galmart)`);
  console.log('Arbuz matches:', arbuzMatches, `(out of ${arbuzList.length} items in Arbuz)`);
  console.log('KDV matches:', kdvMatches, `(out of ${kdvList.length} items in KDV)`);
  console.log('Korzina matches:', korzinaMatches, `(out of ${korzinaList.length} items in Korzina)`);
  console.log('Total products with clean studio photos:', withPhoto);
}

testAll();
