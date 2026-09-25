import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load 200 test results
const testResults = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'semeiniy_200_test_results.json'), 'utf8'));
const emptyItems = testResults.filter(r => r.hasEmptySvg);

console.log(`Analyzing ${emptyItems.length} items with empty_photo.svg from the 200-sample test...\n`);

// Load external catalogs to cross-reference
let arbuzList = [];
try {
  const rawA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'v3_cache', 'arbuz_products.json'), 'utf8'));
  arbuzList = Array.isArray(rawA) ? rawA : Object.values(rawA);
} catch {}

let galmartList = [];
try {
  galmartList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'galmart_catalog.json'), 'utf8'));
} catch {}

let korzinaList = [];
try {
  korzinaList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json'), 'utf8'));
} catch {}

let kdvList = [];
try {
  kdvList = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'kdv_catalog.json'), 'utf8'));
} catch {}

console.log(`External reference databases: Arbuz (${arbuzList.length}), Galmart (${galmartList.length}), Korzina (${korzinaList.length}), KDV (${kdvList.length})`);

// Index external catalogs by barcode and name
const externalByEan = new Map();
const externalByName = new Map();

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-zа-яё0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
}

for (const item of arbuzList) {
  const e = item.barcode || item.ean;
  if (e) externalByEan.set(e, { source: 'Arbuz', item });
  const n = normalize(item.name || item.catalog_name);
  if (n) externalByName.set(n, { source: 'Arbuz', item });
}
for (const item of galmartList) {
  const e = item.barcode || item.ean;
  if (e) externalByEan.set(e, { source: 'Galmart', item });
  const n = normalize(item.title);
  if (n) externalByName.set(n, { source: 'Galmart', item });
}
for (const item of korzinaList) {
  const e = item.barcode || item.ean;
  if (e) externalByEan.set(e, { source: 'Korzina', item });
  const n = normalize(item.productName);
  if (n) externalByName.set(n, { source: 'Korzina', item });
}
for (const item of kdvList) {
  const e = item.barcode || item.ean;
  if (e) externalByEan.set(e, { source: 'KDV', item });
  const n = normalize(item.title);
  if (n) externalByName.set(n, { source: 'KDV', item });
}

// Analyze each empty item
let matchedInOtherStores = 0;
let discontinuedKeywordsCount = 0;
let storeInternalPluCount = 0;

const discontinuedRegex = /\b(новогодн|пасха|акция|лимит|2019|2020|2021|2022|2023|набор подарочный|промо|с подарком|дизайн 202|старый дизайн)\b/i;

const analysis = [];

for (const p of emptyItems) {
  const isDisc = discontinuedRegex.test(p.title);
  if (isDisc) discontinuedKeywordsCount++;

  let extMatch = null;
  if (p.ean && externalByEan.has(p.ean)) {
    extMatch = externalByEan.get(p.ean);
  } else {
    const norm = normalize(p.title);
    if (externalByName.has(norm)) {
      extMatch = externalByName.get(norm);
    }
  }

  if (extMatch) matchedInOtherStores++;

  analysis.push({
    title: p.title,
    ean: p.ean,
    category: p.category,
    url: p.url,
    isSeasonalOrPromo: isDisc,
    matchedInOtherStores: extMatch ? extMatch.source : null
  });
}

console.log('\n--- ANALYSIS RESULTS OF EMPTY/ARCHIVED PRODUCTS ---');
console.log(`Total empty items analyzed: ${emptyItems.length}`);
console.log(`Seasonal / Promo / Old year keywords detected: ${discontinuedKeywordsCount}`);
console.log(`Matched directly in Arbuz / Galmart / Korzina: ${matchedInOtherStores}`);

// Show 20 sample items with details
console.log('\nSample 25 empty/archived items:');
analysis.slice(0, 25).forEach((item, i) => {
  console.log(`[${i + 1}] ${item.title}`);
  console.log(`    EAN: ${item.ean} | Category: ${item.category} | Matched: ${item.matchedInOtherStores || 'NO'}`);
  console.log(`    URL: ${item.url}`);
});

fs.writeFileSync(path.join(__dirname, '..', 'data', 'empty_products_analysis.json'), JSON.stringify(analysis, null, 2));
