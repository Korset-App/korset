import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { inferCategory, extractFatPercent, extractQuantity, extractPackageType, extractFlavor, KORSET_CATEGORIES } from './attribute-parser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CACHE_DIR = path.join(DATA_DIR, 'v3_cache');

function isValidEanChecksum(barcode) {
  if (!/^\d{8}$|^\d{12,14}$/.test(barcode)) return false;
  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  const len = digits.length;
  for (let i = len - 1; i >= 0; i--) {
    const weight = (len - 1 - i) % 2 === 0 ? 3 : 1;
    sum += digits[i] * weight;
  }
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

function isScaleBarcode(barcode) {
  return /^2[0-9]/.test(barcode);
}

function normalizeStr(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function aggregateMultiSource() {
  console.log('===============================================================');
  console.log('  KÖRSET CATALOG V3: MULTI-SOURCE INGESTION & DEEP ENRICHMENT  ');
  console.log('===============================================================\n');

  const masterCatalog = new Map(); // ean -> product object

  // ── SOURCE 1: Clean Catalog v2 (11,386 verified EANs) ──
  console.log('--- Loading Source 1: Clean Catalog v2 ---');
  const v2Path = path.join(DATA_DIR, 'clean_catalog_v2.jsonl');
  let v2Loaded = 0;
  if (fs.existsSync(v2Path)) {
    const rl = readline.createInterface({ input: fs.createReadStream(v2Path), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        const ean = String(item.ean || '').trim();
        if (!ean || isScaleBarcode(ean) || !isValidEanChecksum(ean)) continue;

        masterCatalog.set(ean, {
          ean,
          name: item.name || '',
          name_kz: item.name_kz || null,
          brand: item.brand || '',
          category: item.category || 'grocery',
          subcategory: item.subcategory || null,
          quantity: item.quantity || null,
          fat_percent: item.fat_percent || null,
          flavor: item.flavor || null,
          package_type: item.package_type || null,
          ingredients_raw: item.ingredients_raw || null,
          ingredients_json: item.ingredients_json || [],
          nutriments_json: item.nutriments_json || {},
          storage_conditions: item.storage_conditions || null,
          shelf_life: item.shelf_life || null,
          cooking_instructions: item.cooking_instructions || null,
          description: item.description || null,
          allergens_json: item.allergens_json || [],
          image_url: item.image_url || null,
          images_json: item.images_json || (item.image_url ? [item.image_url] : []),
          tnved: item.tnved || null,
          producer_name: item.producer_name || null,
          producer_bin: item.producer_bin || null,
          country_of_origin: item.country_of_origin || null,
          sources: ['clean_catalog_v2']
        });
        v2Loaded++;
      } catch {}
    }
  }
  console.log(`Ingested from clean_catalog_v2: ${v2Loaded} items. Total master EANs: ${masterCatalog.size}`);

  // ── SOURCE 2: Open Food Facts KZ & CIS ──
  console.log('\n--- Loading Source 2: Open Food Facts (KZ & CIS) ---');
  const offPath = path.join(CACHE_DIR, 'off_products.json');
  let offAdded = 0, offEnriched = 0;
  if (fs.existsSync(offPath)) {
    const offData = JSON.parse(fs.readFileSync(offPath, 'utf8'));
    for (const [ean, offItem] of Object.entries(offData)) {
      if (isScaleBarcode(ean) || !isValidEanChecksum(ean)) continue;

      if (!masterCatalog.has(ean)) {
        masterCatalog.set(ean, {
          ean,
          name: offItem.name,
          name_kz: null,
          brand: offItem.brand || '',
          category: offItem.category || 'grocery',
          subcategory: null,
          quantity: offItem.quantity || null,
          fat_percent: null,
          flavor: null,
          package_type: null,
          ingredients_raw: offItem.ingredients_raw || null,
          ingredients_json: [],
          nutriments_json: offItem.nutriments_json || {},
          storage_conditions: null,
          shelf_life: null,
          cooking_instructions: null,
          description: null,
          allergens_json: offItem.allergens_json || [],
          image_url: offItem.image_url || null,
          images_json: offItem.image_url ? [offItem.image_url] : [],
          tnved: null,
          producer_name: null,
          producer_bin: null,
          country_of_origin: null,
          sources: ['openfoodfacts']
        });
        offAdded++;
      } else {
        const existing = masterCatalog.get(ean);
        if (!existing.ingredients_raw && offItem.ingredients_raw) {
          existing.ingredients_raw = offItem.ingredients_raw;
          offEnriched++;
        }
        if ((!existing.nutriments_json || Object.keys(existing.nutriments_json).length === 0) &&
            offItem.nutriments_json && Object.keys(offItem.nutriments_json).length > 0) {
          existing.nutriments_json = offItem.nutriments_json;
        }
        if (!existing.image_url && offItem.image_url) {
          existing.image_url = offItem.image_url;
        }
        existing.sources.push('openfoodfacts');
      }
    }
  }
  console.log(`Ingested from Open Food Facts: +${offAdded} new products, ${offEnriched} enriched with ingredients. Total master EANs: ${masterCatalog.size}`);

  // ── SOURCE 3: NPC Category Harvesting (Official Kazakhstani GTINs) ──
  console.log('\n--- Loading Source 3: National Catalog (НКТ Category Discovery) ---');
  const npcCatPath = path.join(CACHE_DIR, 'npc_category_products.json');
  let npcAdded = 0, npcEnriched = 0;
  if (fs.existsSync(npcCatPath)) {
    const npcCatData = JSON.parse(fs.readFileSync(npcCatPath, 'utf8'));
    for (const [ean, npcItem] of Object.entries(npcCatData)) {
      if (isScaleBarcode(ean) || !isValidEanChecksum(ean)) continue;

      if (!masterCatalog.has(ean)) {
        const qParsed = extractQuantity(npcItem.name_ru);
        const cat = inferCategory(npcItem.name_ru, npcItem.brand, npcItem.tnved_code, 'grocery');
        masterCatalog.set(ean, {
          ean,
          name: npcItem.name_ru,
          name_kz: npcItem.name_kk || null,
          brand: npcItem.brand || '',
          category: cat,
          subcategory: null,
          quantity: qParsed.display,
          quantity_value: qParsed.value,
          quantity_unit: qParsed.unit,
          fat_percent: extractFatPercent(npcItem.name_ru),
          flavor: extractFlavor(npcItem.name_ru),
          package_type: extractPackageType(npcItem.name_ru),
          ingredients_raw: null,
          ingredients_json: [],
          nutriments_json: {},
          storage_conditions: null,
          shelf_life: null,
          cooking_instructions: null,
          description: null,
          allergens_json: [],
          image_url: null,
          images_json: [],
          tnved: npcItem.tnved_code || null,
          producer_name: npcItem.producer || null,
          producer_bin: npcItem.producer_bin || null,
          country_of_origin: npcItem.country || null,
          sources: ['npc_category']
        });
        npcAdded++;
      } else {
        const existing = masterCatalog.get(ean);
        if (!existing.name_kz && npcItem.name_kk) existing.name_kz = npcItem.name_kk;
        if (!existing.producer_name && npcItem.producer) existing.producer_name = npcItem.producer;
        if (!existing.producer_bin && npcItem.producer_bin) existing.producer_bin = npcItem.producer_bin;
        if (!existing.tnved && npcItem.tnved_code) existing.tnved = npcItem.tnved_code;
        if (!existing.country_of_origin && npcItem.country) existing.country_of_origin = npcItem.country;
        if (existing.category === 'grocery' && npcItem.tnved_code) {
          existing.category = inferCategory(existing.name, existing.brand, npcItem.tnved_code, existing.category);
        }
        existing.sources.push('npc_category');
        npcEnriched++;
      }
    }
  }
  console.log(`Ingested from NPC Categories: +${npcAdded} new official products, ${npcEnriched} enriched with official metadata. Total master EANs: ${masterCatalog.size}`);

  // ── SOURCE 3b: Active Store Shelves Products ──
  console.log('\n--- Loading Source 3b: Active Store Shelves (store_products) ---');
  const storePath = path.join(CACHE_DIR, 'store_products_cache.json');
  let storeAdded = 0;
  if (fs.existsSync(storePath)) {
    const storeData = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    for (const [ean, sItem] of Object.entries(storeData)) {
      if (isScaleBarcode(ean) || !isValidEanChecksum(ean)) continue;
      if (!masterCatalog.has(ean)) {
        const qParsed = extractQuantity(sItem.local_name);
        const cat = inferCategory(sItem.local_name, '', '', 'grocery');
        masterCatalog.set(ean, {
          ean,
          name: sItem.local_name || '',
          name_kz: null,
          brand: '',
          category: cat,
          subcategory: null,
          quantity: qParsed.display,
          quantity_value: qParsed.value,
          quantity_unit: qParsed.unit,
          fat_percent: extractFatPercent(sItem.local_name),
          flavor: extractFlavor(sItem.local_name),
          package_type: extractPackageType(sItem.local_name),
          ingredients_raw: null,
          ingredients_json: [],
          nutriments_json: {},
          storage_conditions: null,
          shelf_life: null,
          cooking_instructions: null,
          description: null,
          allergens_json: [],
          image_url: null,
          images_json: [],
          tnved: null,
          producer_name: null,
          producer_bin: null,
          country_of_origin: null,
          sources: ['store_products']
        });
        storeAdded++;
      } else {
        masterCatalog.get(ean).sources.push('store_products');
      }
    }
  }
  console.log(`Ingested from Store Products: +${storeAdded} active store products. Total master EANs: ${masterCatalog.size}`);

  // ── SOURCE 4: Arbuz.kz Enrichment ──
  console.log('\n--- Enriching from Source 4: Arbuz.kz (Ingredients & Nutriments) ---');
  const arbuzPath = path.join(CACHE_DIR, 'arbuz_products.json');
  let arbuzEnriched = 0;
  if (fs.existsSync(arbuzPath)) {
    const arbuzData = JSON.parse(fs.readFileSync(arbuzPath, 'utf8'));
    const arbuzByBrand = new Map();
    for (const ab of Object.values(arbuzData)) {
      if (!ab.name) continue;
      const b = normalizeStr(ab.brand);
      if (b && b.length >= 3) {
        if (!arbuzByBrand.has(b)) arbuzByBrand.set(b, []);
        arbuzByBrand.get(b).push(ab);
      }
    }

    for (const item of masterCatalog.values()) {
      if (item.ingredients_raw && item.nutriments_json && Object.keys(item.nutriments_json).length > 0) continue;
      const normBrand = normalizeStr(item.brand);
      if (!normBrand || normBrand.length < 3) continue;

      const candidates = arbuzByBrand.get(normBrand) || [];
      for (const ab of candidates) {
        const abName = normalizeStr(ab.name);
        if (item.quantity && !abName.includes(normalizeStr(item.quantity))) continue;
        if (item.fat_percent && !abName.includes(String(item.fat_percent))) continue;
        if (item.flavor) {
          const fWords = normalizeStr(item.flavor).split(' ').filter(w => w.length > 3);
          if (fWords.length > 0 && !fWords.some(w => abName.includes(w))) continue;
        }

        if (!item.ingredients_raw && ab.ingredients_raw) item.ingredients_raw = ab.ingredients_raw;
        if ((!item.nutriments_json || Object.keys(item.nutriments_json).length === 0) &&
            ab.nutriments_json && Object.keys(ab.nutriments_json).length > 0) {
          item.nutriments_json = ab.nutriments_json;
        }
        if (!item.storage_conditions && ab.storage_conditions) item.storage_conditions = ab.storage_conditions;
        if (!item.image_url && ab.image_url) {
          item.image_url = ab.image_url;
          item.images_json = [ab.image_url];
        }
        arbuzEnriched++;
        break;
      }
    }
  }
  console.log(`Enriched from Arbuz.kz: ${arbuzEnriched} products received rich packaging data.`);

  // ── SOURCE 5: Galmart Studio Packshots & Compositions ──
  console.log('\n--- Enriching from Source 5: Galmart Studio Catalog ---');
  const gmPath = path.join(DATA_DIR, 'galmart_catalog.json');
  let gmPackshots = 0, gmCompositions = 0;
  if (fs.existsSync(gmPath)) {
    const galmartCatalog = JSON.parse(fs.readFileSync(gmPath, 'utf8'));
    const gmByBrand = new Map();
    for (const gm of galmartCatalog) {
      if (!gm.title) continue;
      const b = normalizeStr(gm.brand);
      if (b && b.length >= 3) {
        if (!gmByBrand.has(b)) gmByBrand.set(b, []);
        gmByBrand.get(b).push(gm);
      }
    }

    for (const item of masterCatalog.values()) {
      const normBrand = normalizeStr(item.brand);
      if (!normBrand || normBrand.length < 3) continue;

      const candidates = gmByBrand.get(normBrand) || [];
      for (const gm of candidates) {
        const gmTitle = normalizeStr(gm.title);
        if (item.quantity && !gmTitle.includes(normalizeStr(item.quantity))) continue;
        if (item.fat_percent && !gmTitle.includes(String(item.fat_percent))) continue;
        if (item.flavor) {
          const fWords = normalizeStr(item.flavor).split(' ').filter(w => w.length > 3);
          if (fWords.length > 0 && !fWords.some(w => gmTitle.includes(w))) continue;
        }

        if (gm.photos && gm.photos.length > 0 && (!item.image_url || item.image_url.includes('arbuz'))) {
          item.image_url = gm.photos[0];
          item.images_json = gm.photos;
          gmPackshots++;
        }
        if (!item.ingredients_raw && gm.composition) {
          item.ingredients_raw = gm.composition;
          gmCompositions++;
        }
        if (!item.storage_conditions && gm.storage_conditions) {
          item.storage_conditions = gm.storage_conditions;
        }
        break;
      }
    }
  }
  console.log(`Enriched from Galmart: ${gmPackshots} high-res studio packshots, ${gmCompositions} compositions.`);

  // ── SOURCE 6: Halal Damu & AHIK Registry Certification ──
  console.log('\n--- Tagging Source 6: Official Halal Registries (Халал Даму & АХИК) ---');
  let halalCertified = 0;
  const halalPath = path.join(DATA_DIR, 'halal_damu_companies.json');
  if (fs.existsSync(halalPath)) {
    const halalList = JSON.parse(fs.readFileSync(halalPath, 'utf8'));
    const halalNames = new Set(
      halalList.flatMap(c => [
        normalizeStr(c.name),
        normalizeStr(c.brand),
        normalizeStr(c.company_name)
      ]).filter(s => s && s.length >= 4)
    );

    for (const item of masterCatalog.values()) {
      const pName = normalizeStr(item.producer_name);
      const bName = normalizeStr(item.brand);

      for (const hName of halalNames) {
        if (pName.includes(hName) || bName.includes(hName)) {
          item.halal_status = 'certified';
          item.halal_certifier = 'Халал Даму (ҚМДБ)';
          halalCertified++;
          break;
        }
      }
      if (!item.halal_status) {
        item.halal_status = 'unknown';
        item.halal_certifier = null;
      }
    }
  }
  console.log(`Tagged Halal certified products: ${halalCertified} items.`);

  // ── AUDIT & METRICS ──
  const masterArray = Array.from(masterCatalog.values());
  let withIngr = 0, withNutr = 0, withStorage = 0, withImages = 0;
  for (const it of masterArray) {
    if (it.ingredients_raw && it.ingredients_raw.length > 5) withIngr++;
    if (it.nutriments_json && Object.keys(it.nutriments_json).length > 0) withNutr++;
    if (it.storage_conditions) withStorage++;
    if (it.image_url) withImages++;
  }

  console.log('\n===============================================================');
  console.log(`  AGGREGATION SUMMARY:`);
  console.log(`  Total Authentic Unique GS1 EANs: ${masterArray.length}`);
  console.log(`  Products with Full Ingredients:  ${withIngr} (${(withIngr / masterArray.length * 100).toFixed(1)}%)`);
  console.log(`  Products with Nutrition / КБЖУ:  ${withNutr} (${(withNutr / masterArray.length * 100).toFixed(1)}%)`);
  console.log(`  Products with Storage Conditions: ${withStorage} (${(withStorage / masterArray.length * 100).toFixed(1)}%)`);
  console.log(`  Products with Studio Photos:      ${withImages} (${(withImages / masterArray.length * 100).toFixed(1)}%)`);
  console.log(`  Halal Damu Certified:             ${halalCertified}`);
  console.log('===============================================================\n');

  const outPath = path.join(CACHE_DIR, 'aggregated_catalog_v3.json');
  fs.writeFileSync(outPath, JSON.stringify(masterArray, null, 2), 'utf8');
  console.log(`Saved master aggregated catalog to: ${outPath}`);
  return masterArray;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  aggregateMultiSource().catch(console.error);
}
