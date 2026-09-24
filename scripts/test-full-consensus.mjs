import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalize(s) {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/[^a-zа-яё0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(s) {
  return normalize(s).split(' ').filter(w => w.length > 2);
}

// 1. Load Local Galmart Index
function loadGalmart() {
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'galmart_catalog.json'), 'utf8'));
  const byBrand = new Map();
  for (const g of list) {
    const brand = normalize(g.brand);
    if (!brand) continue;
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    byBrand.get(brand).push({
      item: g,
      tokens: new Set(getTokens(g.title))
    });
  }
  return byBrand;
}

// 2. Load Local Arbuz Index
function loadArbuz() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'v3_cache', 'arbuz_products.json'), 'utf8'));
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  const byBrand = new Map();
  for (const a of list) {
    const brand = normalize(a.brand);
    if (!brand) continue;
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    byBrand.get(brand).push({
      item: a,
      tokens: new Set(getTokens(a.name || a.catalog_name))
    });
  }
  return byBrand;
}

// 3. Load Korzina v Dom Index
function loadKorzina() {
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json'), 'utf8'));
  const byBrand = new Map();
  for (const k of list) {
    const brand = normalize(k.brand);
    if (!brand) continue;
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    byBrand.get(brand).push({
      item: k,
      tokens: new Set(getTokens(k.productName))
    });
  }
  return byBrand;
}

// 4. Load OFF Cache
function loadOffCache() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'v3_cache', 'off_products.json'), 'utf8'));
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  const map = new Map();
  for (const p of list) {
    if (p.ean) map.set(p.ean, p);
  }
  return map;
}

async function test() {
  const gmMap = loadGalmart();
  const arbuzMap = loadArbuz();
  const korzinaMap = loadKorzina();
  const offMap = loadOffCache();

  console.log('Indexes loaded:');
  console.log('Galmart brands:', gmMap.size);
  console.log('Arbuz brands:', arbuzMap.size);
  console.log('Korzina brands:', korzinaMap.size);
  console.log('OFF cache items:', offMap.size);

  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl')),
    crlfDelay: Infinity
  });

  let total = 0;
  let gmMatches = 0;
  let arbuzMatches = 0;
  let korzinaMatches = 0;
  let offMatches = 0;
  let withIngredients = 0;
  let withNutriments = 0;
  let withManufacturer = 0;
  let withCountry = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    const p = JSON.parse(line);
    const pBrand = normalize(p.brand);
    const pTokens = getTokens(p.name);

    let hasIng = !!(p.ingredients_raw || p.ingredients_kz);
    let hasNutr = !!(p.nutriments_json && Object.keys(p.nutriments_json).length > 0);
    let hasMfr = !!p.manufacturer;
    let hasCtry = !!p.country_of_origin;

    // OFF exact EAN
    if (offMap.has(p.ean)) {
      offMatches++;
      const o = offMap.get(p.ean);
      if (o.ingredients_raw) hasIng = true;
      if (o.nutriments_json) hasNutr = true;
    }

    // Galmart match
    if (pBrand && gmMap.has(pBrand)) {
      const candidates = gmMap.get(pBrand);
      let best = null;
      let maxOverlap = 0;
      for (const c of candidates) {
        let overlap = 0;
        for (const t of pTokens) {
          if (c.tokens.has(t)) overlap++;
        }
        if (overlap >= 2 && overlap > maxOverlap) {
          maxOverlap = overlap;
          best = c.item;
        }
      }
      if (best) {
        gmMatches++;
        if (best.composition) hasIng = true;
        if (best.calories || best.protein) hasNutr = true;
        if (best.manufacturer) hasMfr = true;
        if (best.country) hasCtry = true;
      }
    }

    // Arbuz match
    if (pBrand && arbuzMap.has(pBrand)) {
      const candidates = arbuzMap.get(pBrand);
      let best = null;
      let maxOverlap = 0;
      for (const c of candidates) {
        let overlap = 0;
        for (const t of pTokens) {
          if (c.tokens.has(t)) overlap++;
        }
        if (overlap >= 2 && overlap > maxOverlap) {
          maxOverlap = overlap;
          best = c.item;
        }
      }
      if (best) {
        arbuzMatches++;
        if (best.ingredients_raw) hasIng = true;
        if (best.nutriments_json) hasNutr = true;
        if (best.producer) hasMfr = true;
        if (best.country) hasCtry = true;
      }
    }

    // Korzina match
    if (pBrand && korzinaMap.has(pBrand)) {
      const candidates = korzinaMap.get(pBrand);
      let best = null;
      let maxOverlap = 0;
      for (const c of candidates) {
        let overlap = 0;
        for (const t of pTokens) {
          if (c.tokens.has(t)) overlap++;
        }
        if (overlap >= 2 && overlap > maxOverlap) {
          maxOverlap = overlap;
          best = c.item;
        }
      }
      if (best) {
        korzinaMatches++;
        if (best.composition) hasIng = true;
        if (best.country) hasCtry = true;
        const mfr = best.options?.find(o => o.optionName === 'Производитель')?.valueVariant;
        if (mfr) hasMfr = true;
        const hasCal = best.options?.some(o => o.optionName?.includes('Энергетическая'));
        if (hasCal) hasNutr = true;
      }
    }

    if (hasIng) withIngredients++;
    if (hasNutr) withNutriments++;
    if (hasMfr) withManufacturer++;
    if (hasCtry) withCountry++;

    if (total >= 10000) break;
  }

  console.log(`\n=== Results on first ${total} products ===`);
  console.log(`OFF matches: ${offMatches}`);
  console.log(`Galmart matches: ${gmMatches}`);
  console.log(`Arbuz matches: ${arbuzMatches}`);
  console.log(`Korzina v Dom matches: ${korzinaMatches}`);
  console.log('-------------------------------------------');
  console.log(`Total with Ingredients: ${withIngredients} (${((withIngredients/total)*100).toFixed(1)}%)`);
  console.log(`Total with Nutriments: ${withNutriments} (${((withNutriments/total)*100).toFixed(1)}%)`);
  console.log(`Total with Manufacturer: ${withManufacturer} (${((withManufacturer/total)*100).toFixed(1)}%)`);
  console.log(`Total with Country: ${withCountry} (${((withCountry/total)*100).toFixed(1)}%)`);
}

test();
