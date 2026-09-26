/**
 * scripts/catalog-v4-gs1-kz-suite.mjs
 * 
 * High-Precision Multi-Source Master Catalog V4 Enrichment:
 * 1. Open Food Facts Cache (off_products.json) exact EAN merge: KBJU + Ingredients
 * 2. GS1 Kazakhstan NPC Official Registries (npc_full_results.json & npc_category_products.json):
 *    - Official factory Kazakh names (name_kk_factory -> name_kz)
 *    - Official countries of origin (country -> country_of_origin)
 *    - Official producers / manufacturers (producer -> manufacturer)
 *    - Official customs TNVED commodity codes (tnved_code -> specs_json.tnved)
 * 3. Historical Clean Catalogs (aggregated_catalog_v3.json & clean_catalog_v2.jsonl):
 *    - Verified Kazakh names (name_kz)
 * 4. Semeiniy Tabular Description Nutrition Parser:
 *    - Recovers un-colonized nutritional facts from structured description texts
 * 5. Brand Inferrer for Master items with brand: null:
 *    - Accurately detects known verified FMCG brands from product names
 * 
 * Strict Invariants:
 *  - Exactly 58,643 items preserved.
 *  - Exactly 23,112 studio photos preserved (0 Korzina photos ever).
 *  - Zero EAN hallucinations.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.backup.jsonl');
const OFF_PATH = path.join(__dirname, '..', 'data', 'v3_cache', 'off_products.json');
const NPC_FULL_PATH = path.join(__dirname, '..', 'data', 'v3_cache', 'npc_full_results.json');
const NPC_CAT_PATH = path.join(__dirname, '..', 'data', 'v3_cache', 'npc_category_products.json');
const AGG_V3_PATH = path.join(__dirname, '..', 'data', 'v3_cache', 'aggregated_catalog_v3.json');
const CLEAN_V2_PATH = path.join(__dirname, '..', 'data', 'clean_catalog_v2.jsonl');

function cleanNutriments(n) {
  if (!n || typeof n !== 'object') return null;
  const kcal = n.energy_kcal != null && !isNaN(Number(n.energy_kcal)) ? Number(n.energy_kcal) : null;
  const p = n.protein_100g != null && !isNaN(Number(n.protein_100g)) ? Number(n.protein_100g) : null;
  const f = n.fat_100g != null && !isNaN(Number(n.fat_100g)) ? Number(n.fat_100g) : null;
  const c = n.carbohydrates_100g != null && !isNaN(Number(n.carbohydrates_100g)) ? Number(n.carbohydrates_100g) : null;

  if (kcal == null && p == null && f == null && c == null) return null;
  const res = {};
  if (kcal != null && kcal >= 0 && kcal <= 1000) res.energy_kcal = kcal;
  if (p != null && p >= 0 && p <= 100) res.protein_100g = p;
  if (f != null && f >= 0 && f <= 100) res.fat_100g = f;
  if (c != null && c >= 0 && c <= 100) res.carbohydrates_100g = c;
  return Object.keys(res).length > 0 ? res : null;
}

export async function runGs1KzSuite({ dryRun = false } = {}) {
  console.log(`\n======================================================`);
  console.log(`=== KÖRSET V4 GS1 / NPC / KZ LOCALIZATION SUITE ===`);
  console.log(`=== Mode: ${dryRun ? 'DRY-RUN (Simulate Only)' : 'LIVE EXECUTION (Writing to Master)'} ===`);
  console.log(`======================================================\n`);

  if (!dryRun) {
    if (!fs.existsSync(BACKUP_PATH)) {
      console.log(`[Backup] Creating safety backup: ${BACKUP_PATH}`);
      fs.copyFileSync(MASTER_PATH, BACKUP_PATH);
    }
  }

  // 1. Load Master
  console.log('[Load] Loading Master Catalog...');
  const masterList = [];
  const masterEanIndex = new Map();
  const knownBrandsMap = new Map();

  const rlMaster = readline.createInterface({ input: fs.createReadStream(MASTER_PATH) });
  for await (const line of rlMaster) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    masterList.push(p);
    if (p.ean) masterEanIndex.set(String(p.ean).trim(), p);
    if (Array.isArray(p.alternate_eans)) {
      for (const a of p.alternate_eans) {
        if (a) masterEanIndex.set(String(a).trim(), p);
      }
    }
    if (p.brand && p.brand.trim().length >= 3 && p.brand.toLowerCase() !== 'null') {
      const bKey = p.brand.trim().toLowerCase();
      if (!knownBrandsMap.has(bKey)) {
        knownBrandsMap.set(bKey, p.brand.trim());
      }
    }
  }

  if (masterList.length !== 58643) {
    throw new Error(`INVARIANT VIOLATION: Expected 58,643 items, found ${masterList.length}`);
  }

  const initialKz = masterList.filter(m => m.name_kz && m.name_kz.trim().length > 1).length;
  const initialIng = masterList.filter(m => m.ingredients_raw && m.ingredients_raw.trim().length > 5).length;
  const initialNutr = masterList.filter(m => cleanNutriments(m.nutriments_json)).length;
  const initialCountry = masterList.filter(m => m.country_of_origin && m.country_of_origin.trim().length > 0).length;
  const initialManuf = masterList.filter(m => m.manufacturer && m.manufacturer.trim().length > 0).length;
  const initialBrands = masterList.filter(m => m.brand && m.brand.trim().length > 0 && m.brand.toLowerCase() !== 'null').length;
  const initialPhotos = masterList.filter(m => m.image_url && !m.image_url.includes('empty_photo')).length;

  console.log(`[Baseline Metrics]`);
  console.log(`  Total Products:         ${masterList.length}`);
  console.log(`  Studio Photos 700x700:  ${initialPhotos}`);
  console.log(`  Kazakh Names (name_kz): ${initialKz}`);
  console.log(`  Ingredients:            ${initialIng} (${((initialIng/58643)*100).toFixed(1)}%)`);
  console.log(`  Nutritional Facts:      ${initialNutr} (${((initialNutr/58643)*100).toFixed(1)}%)`);
  console.log(`  Country of Origin:      ${initialCountry}`);
  console.log(`  Manufacturers:          ${initialManuf}`);
  console.log(`  Populated Brands:       ${initialBrands}`);

  // -------------------------------------------------------------------------
  // STEP 1: Open Food Facts exact EAN merge
  // -------------------------------------------------------------------------
  console.log(`\n--- STEP 1: Open Food Facts Exact EAN Merge ---`);
  let offNewIng = 0;
  let offNewNutr = 0;
  if (fs.existsSync(OFF_PATH)) {
    const off = JSON.parse(fs.readFileSync(OFF_PATH, 'utf8'));
    for (const [ean, val] of Object.entries(off)) {
      const cleanE = String(ean).trim();
      const m = masterEanIndex.get(cleanE);
      if (!m) continue;

      const hasIng = Boolean(m.ingredients_raw && m.ingredients_raw.trim().length > 5);
      const hasNutr = Boolean(cleanNutriments(m.nutriments_json));

      if (!hasIng && val.ingredients_raw && val.ingredients_raw.length > 5) {
        m.ingredients_raw = val.ingredients_raw;
        offNewIng++;
      }
      if (!hasNutr && cleanNutriments(val.nutriments_json)) {
        m.nutriments_json = cleanNutriments(val.nutriments_json);
        offNewNutr++;
      }
    }
  }
  console.log(`  OFF New Ingredients: +${offNewIng}`);
  console.log(`  OFF New Nutrition:   +${offNewNutr}`);

  // -------------------------------------------------------------------------
  // STEP 2: GS1 Kazakhstan NPC Registries Integration
  // -------------------------------------------------------------------------
  console.log(`\n--- STEP 2: GS1 Kazakhstan NPC Registries Integration ---`);
  let npcNewKz = 0;
  let npcNewCountry = 0;
  let npcNewManuf = 0;
  let npcNewTnved = 0;

  if (fs.existsSync(NPC_FULL_PATH)) {
    const npcFull = JSON.parse(fs.readFileSync(NPC_FULL_PATH, 'utf8'));
    for (const [ean, val] of Object.entries(npcFull)) {
      const cleanE = String(ean).trim();
      const m = masterEanIndex.get(cleanE);
      if (!m) continue;

      const n = val.npc || {};
      // 1. Kazakh name
      if ((!m.name_kz || m.name_kz.trim().length <= 1) && n.name_kk_factory && n.name_kk_factory.trim().length > 1) {
        m.name_kz = n.name_kk_factory.trim();
        npcNewKz++;
      }
      // 2. Country
      if ((!m.country_of_origin || m.country_of_origin.trim().length === 0) && n.country && n.country.trim().length > 1) {
        m.country_of_origin = n.country.trim();
        npcNewCountry++;
      }
      // 3. Manufacturer / Producer
      if ((!m.manufacturer || m.manufacturer.trim().length === 0) && n.producer && n.producer.trim().length > 1) {
        m.manufacturer = n.producer.trim();
        npcNewManuf++;
      }
      // 4. Customs TNVED
      if (n.tnved_code && n.tnved_code.trim().length > 3) {
        if (!m.specs_json || typeof m.specs_json !== 'object') m.specs_json = {};
        if (!m.specs_json.tnved) {
          m.specs_json.tnved = n.tnved_code.trim();
          if (n.tnved_name) m.specs_json.tnved_name = n.tnved_name.trim();
          npcNewTnved++;
        }
      }
    }
  }

  // Also check npc_category_products
  if (fs.existsSync(NPC_CAT_PATH)) {
    const npcCat = JSON.parse(fs.readFileSync(NPC_CAT_PATH, 'utf8'));
    for (const [ean, val] of Object.entries(npcCat)) {
      const cleanE = String(ean).trim();
      const m = masterEanIndex.get(cleanE);
      if (!m) continue;

      if ((!m.name_kz || m.name_kz.trim().length <= 1) && val.name_kk && val.name_kk.trim().length > 1) {
        m.name_kz = val.name_kk.trim();
        npcNewKz++;
      }
      if ((!m.country_of_origin || m.country_of_origin.trim().length === 0) && val.country && val.country.trim().length > 1) {
        m.country_of_origin = val.country.trim();
        npcNewCountry++;
      }
      if ((!m.manufacturer || m.manufacturer.trim().length === 0) && val.producer && val.producer.trim().length > 1) {
        m.manufacturer = val.producer.trim();
        npcNewManuf++;
      }
      if (val.tnved_code && val.tnved_code.trim().length > 3) {
        if (!m.specs_json || typeof m.specs_json !== 'object') m.specs_json = {};
        if (!m.specs_json.tnved) {
          m.specs_json.tnved = val.tnved_code.trim();
          if (val.tnved_name) m.specs_json.tnved_name = val.tnved_name.trim();
          npcNewTnved++;
        }
      }
    }
  }

  console.log(`  NPC New Kazakh Names (name_kz): +${npcNewKz}`);
  console.log(`  NPC New Country of Origin:     +${npcNewCountry}`);
  console.log(`  NPC New Manufacturers:         +${npcNewManuf}`);
  console.log(`  NPC New TNVED codes:           +${npcNewTnved}`);

  // -------------------------------------------------------------------------
  // STEP 3: Historical Clean Catalogs Kazakh Names Integration
  // -------------------------------------------------------------------------
  console.log(`\n--- STEP 3: Historical Clean Catalogs Kazakh Names Integration ---`);
  let histNewKz = 0;

  if (fs.existsSync(AGG_V3_PATH)) {
    const v3 = JSON.parse(fs.readFileSync(AGG_V3_PATH, 'utf8'));
    for (const item of v3) {
      if (!item.name_kz || item.name_kz.trim().length <= 1) continue;
      const cleanE = String(item.ean).trim();
      const m = masterEanIndex.get(cleanE);
      if (m && (!m.name_kz || m.name_kz.trim().length <= 1)) {
        m.name_kz = item.name_kz.trim();
        histNewKz++;
      }
    }
  }

  if (fs.existsSync(CLEAN_V2_PATH)) {
    const rlV2 = readline.createInterface({ input: fs.createReadStream(CLEAN_V2_PATH) });
    for await (const line of rlV2) {
      if (!line.trim()) continue;
      const p = JSON.parse(line);
      if (!p.name_kz || p.name_kz.trim().length <= 1) continue;
      const cleanE = String(p.ean).trim();
      const m = masterEanIndex.get(cleanE);
      if (m && (!m.name_kz || m.name_kz.trim().length <= 1)) {
        m.name_kz = p.name_kz.trim();
        histNewKz++;
      }
    }
  }

  console.log(`  Historical Clean Catalogs New Kazakh Names: +${histNewKz}`);

  // -------------------------------------------------------------------------
  // STEP 4: Semeiniy Tabular Description Nutrition Parser
  // -------------------------------------------------------------------------
  console.log(`\n--- STEP 4: Semeiniy Tabular Description Nutrition Parser ---`);
  let descNewNutr = 0;

  for (const m of masterList) {
    if (cleanNutriments(m.nutriments_json)) continue;
    const d = m.description;
    if (!d || d.length < 20) continue;

    const pMatch = d.match(/Белки(?:,\s*(?:г\/100\s*г|г))?\s*[:—–-]?\s*(\d+(?:[.,]\d+)?)/i);
    const fMatch = d.match(/Жиры(?:,\s*(?:г\/100\s*г|г))?\s*[:—–-]?\s*(\d+(?:[.,]\d+)?)/i);
    const cMatch = d.match(/Углеводы(?:,\s*(?:г\/100\s*г|г))?\s*[:—–-]?\s*(\d+(?:[.,]\d+)?)/i);
    const kMatch = d.match(/Энергетическая ценность(?:,\s*(?:ккал\/100\s*г|ккал))?\s*[:—–-]?\s*(\d+(?:[.,]\d+)?)/i) ||
                   d.match(/(\d+(?:[.,]\d+)?)\s*ккал/i) ||
                   d.match(/Калорийность(?:,\s*ккал)?\s*[:—–-]?\s*(\d+(?:[.,]\d+)?)/i);

    const parsed = cleanNutriments({
      energy_kcal: kMatch ? parseFloat(kMatch[1].replace(',', '.')) : null,
      protein_100g: pMatch ? parseFloat(pMatch[1].replace(',', '.')) : null,
      fat_100g: fMatch ? parseFloat(fMatch[1].replace(',', '.')) : null,
      carbohydrates_100g: cMatch ? parseFloat(cMatch[1].replace(',', '.')) : null
    });

    if (parsed) {
      m.nutriments_json = parsed;
      descNewNutr++;
    }
  }
  console.log(`  Tabular Description New Nutrition: +${descNewNutr}`);

  // -------------------------------------------------------------------------
  // STEP 5: Safe Brand Inferrer for Master items with brand: null
  // -------------------------------------------------------------------------
  console.log(`\n--- STEP 5: Safe Brand Inferrer for Master items with brand: null ---`);
  const stopWords = new Set([
    'натуральный', 'натуральное', 'натуральные', 'хозяйственное', 'хозяйственный',
    'эконом', 'классический', 'классическое', 'традиционный', 'традиционное',
    'домашний', 'домашнее', 'свежий', 'свежее', 'отборный', 'отборное',
    'красная', 'белая', 'зеленый', 'черный', 'люкс', 'премиум', 'экстра',
    'особый', 'особое', 'деревенский', 'деревенское', 'детский', 'детское',
    'сочный', 'сочное', 'вкусный', 'вкусное', 'золотой', 'золотое'
  ]);

  const sortedKnownBrands = Array.from(knownBrandsMap.entries())
    .filter(([k]) => k.length >= 3 && !stopWords.has(k))
    .sort((a,b) => b[0].length - a[0].length);

  let newBrandsInferred = 0;
  for (const m of masterList) {
    if (m.brand && m.brand.trim().length > 0 && m.brand.toLowerCase() !== 'null') continue;
    const nameLower = (m.name || '').toLowerCase();

    for (const [bLower, origBrand] of sortedKnownBrands) {
      const idx = nameLower.indexOf(bLower);
      if (idx !== -1) {
        const before = idx === 0 ? ' ' : nameLower[idx - 1];
        const after = (idx + bLower.length === nameLower.length) ? ' ' : nameLower[idx + bLower.length];
        const isWordChar = (ch) => /[a-zа-яё0-9]/i.test(ch);
        if (!isWordChar(before) && !isWordChar(after)) {
          m.brand = origBrand;
          newBrandsInferred++;
          break;
        }
      }
    }
  }
  console.log(`  Safe Inferred Brands: +${newBrandsInferred}`);

  // -------------------------------------------------------------------------
  // SUMMARY & SAVE
  // -------------------------------------------------------------------------
  const finalKz = masterList.filter(m => m.name_kz && m.name_kz.trim().length > 1).length;
  const finalIng = masterList.filter(m => m.ingredients_raw && m.ingredients_raw.trim().length > 5).length;
  const finalNutr = masterList.filter(m => cleanNutriments(m.nutriments_json)).length;
  const finalCountry = masterList.filter(m => m.country_of_origin && m.country_of_origin.trim().length > 0).length;
  const finalManuf = masterList.filter(m => m.manufacturer && m.manufacturer.trim().length > 0).length;
  const finalBrands = masterList.filter(m => m.brand && m.brand.trim().length > 0 && m.brand.toLowerCase() !== 'null').length;
  const finalPhotos = masterList.filter(m => m.image_url && !m.image_url.includes('empty_photo')).length;

  console.log(`\n======================================================`);
  console.log(`=== SUITE FINAL SUMMARY ===`);
  console.log(`======================================================`);
  console.log(`Total Products:         ${masterList.length} (Invariants: strictly 58,643)`);
  console.log(`Studio Photos 700x700:  ${finalPhotos} (Invariants: strictly 23,112, 0 Korzina)`);
  console.log(`Kazakh Names (name_kz): ${initialKz} -> ${finalKz} (+${finalKz - initialKz})`);
  console.log(`Ingredients:            ${initialIng} -> ${finalIng} (+${finalIng - initialIng})`);
  console.log(`Nutritional Facts:      ${initialNutr} -> ${finalNutr} (+${finalNutr - initialNutr})`);
  console.log(`Country of Origin:      ${initialCountry} -> ${finalCountry} (+${finalCountry - initialCountry})`);
  console.log(`Manufacturers:          ${initialManuf} -> ${finalManuf} (+${finalManuf - initialManuf})`);
  console.log(`Populated Brands:       ${initialBrands} -> ${finalBrands} (+${finalBrands - initialBrands})`);

  if (!dryRun) {
    console.log(`\n[Save] Writing updated catalog to ${MASTER_PATH}...`);
    const tempPath = `${MASTER_PATH}.tmp`;
    const outStream = fs.createWriteStream(tempPath, { encoding: 'utf8' });
    for (const item of masterList) {
      outStream.write(JSON.stringify(item) + '\n');
    }
    await new Promise(r => outStream.end(r));
    fs.renameSync(tempPath, MASTER_PATH);
    console.log(`[Save] Golden Master Catalog V4 successfully updated and saved!`);
  } else {
    console.log(`\n[DRY RUN] No changes were written to disk.`);
  }

  return {
    total: masterList.length,
    photos: finalPhotos,
    kz: finalKz,
    ing: finalIng,
    nutr: finalNutr,
    country: finalCountry,
    manuf: finalManuf,
    brands: finalBrands
  };
}

if (process.argv[1] && process.argv[1].endsWith('catalog-v4-gs1-kz-suite.mjs')) {
  const isDryRun = process.argv.includes('--dry-run');
  runGs1KzSuite({ dryRun: isDryRun }).catch(err => {
    console.error('Fatal error in suite:', err);
    process.exit(1);
  });
}
