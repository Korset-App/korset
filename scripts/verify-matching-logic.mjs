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

const STOP_WORDS = new Set(['для', 'или', 'под', 'при', 'без', 'шт', 'кг', 'гр', 'мл', 'пэт', 'м/у', 'т/п', 'ст/б', 'ж/б', 'д/п', 'с', 'со', 'в', 'и']);

function getTokens(s) {
  return normalize(s).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function extractVolumeWeight(s) {
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
const korzinaList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json'), 'utf8'));

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
      vw: extractVolumeWeight(title)
    });
  }
  return byBrand;
}

const gmIndex = buildIndex(gmList, x => x.title, x => x.brand);
const arbuzIndex = buildIndex(arbuzList, x => x.name || x.catalog_name, x => x.brand);
const korzinaIndex = buildIndex(korzinaList, x => x.productName, x => x.brand);

function findStrictMatch(name, brand, index) {
  const normB = normalize(brand);
  if (!normB || !index.has(normB)) return null;
  const candidates = index.get(normB);
  
  // Exclude brand tokens from product tokens
  const pTokens = getTokens(name).filter(t => !normB.includes(t));
  if (pTokens.length === 0) return null;

  const pVw = extractVolumeWeight(name);

  let best = null;
  let maxJaccard = 0;

  for (const c of candidates) {
    // If both have weight, they must match within 10%
    if (pVw && c.vw && Math.abs(pVw - c.vw) > pVw * 0.10) {
      continue;
    }

    // Product type (first 1-2 tokens) check
    // e.g. "кетчуп" vs "соус", "пшено" vs "рис"
    const pFirst = pTokens[0];
    const cFirst = c.tokenList[0];
    if (pFirst && cFirst && pFirst !== cFirst && !pFirst.startsWith(cFirst.slice(0, 4)) && !cFirst.startsWith(pFirst.slice(0, 4))) {
      // Different base product!
      continue;
    }

    // Jaccard similarity: intersection / union
    let intersection = 0;
    for (const t of pTokens) {
      if (c.tokens.has(t)) intersection++;
    }
    const union = new Set([...pTokens, ...c.tokens]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    // Strict threshold: at least 0.60 Jaccard on non-brand tokens!
    if (jaccard >= 0.60 && jaccard > maxJaccard) {
      maxJaccard = jaccard;
      best = c;
    }
  }

  return best ? { match: best.item, jaccard: maxJaccard.toFixed(2), candidateTitle: best.title } : null;
}

async function test() {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl')),
    crlfDelay: Infinity
  });

  let printed = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    const gm = findStrictMatch(p.name, p.brand, gmIndex);
    const kz = findStrictMatch(p.name, p.brand, korzinaIndex);

    if (gm || kz) {
      printed++;
      console.log(`\n[#${printed}] Semeiniy: "${p.name}" (Brand: ${p.brand})`);
      if (gm) console.log(`  -> Galmart: "${gm.candidateTitle}" (Jaccard: ${gm.jaccard})`);
      if (kz) console.log(`  -> Korzina: "${kz.candidateTitle}" (Jaccard: ${kz.jaccard})`);
      if (printed >= 15) break;
    }
  }
}

test();
