import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OFF_ALLERGEN_MAP } from '../src/constants/allergens.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGETS_PATH = path.join(__dirname, '..', 'scratch', 'off-enrichment-targets.json');
const RAW_LOG_PATH = path.join(__dirname, '..', 'scratch', 'off-harvest-raw.jsonl');

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const offsetArg = args.find(a => a.startsWith('--offset='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 250;
const OFFSET = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Physical sanity validation for nutritional values
function isValidKbju(cal, prot, fat, carb) {
  if (cal == null && prot == null && fat == null && carb == null) return false;
  let p = prot || 0;
  let f = fat || 0;
  let c = carb || 0;
  if (p < 0 || f < 0 || c < 0) return false;
  if (p > 100 || f > 100 || c > 100) return false;
  if (p + f + c > 105) return false;

  if (cal != null && cal > 0) {
    if (cal > 950) return false;
    const calc = (p * 4) + (f * 9) + (c * 4);
    if (calc > 0 && Math.abs(cal - calc) > Math.max(120, calc * 0.45)) {
      return false;
    }
  }
  return true;
}

const EXTRA_ALLERGEN_MAP = {
  ...OFF_ALLERGEN_MAP,
  'en:soy': 'soy',
  'en:tree-nuts': 'tree_nuts',
  'en:molluscs-and-products-thereof': 'mollusks',
  'en:sulphites': 'sulfites',
  'en:sesame': 'sesame'
};

function mapAllergens(tags = []) {
  if (!Array.isArray(tags)) return [];
  const res = new Set();
  for (const t of tags) {
    const canonical = EXTRA_ALLERGEN_MAP[t];
    if (canonical) res.add(canonical);
  }
  return Array.from(res);
}

function mapAdditives(tags = []) {
  if (!Array.isArray(tags)) return [];
  const res = new Set();
  for (const t of tags) {
    const clean = t.replace(/^en:/i, '').toUpperCase();
    if (/^E\d+[A-Z]?$/i.test(clean)) res.add(clean);
  }
  return Array.from(res);
}

function mapDietTags(labels = []) {
  if (!Array.isArray(labels)) return [];
  const diet = new Set();
  for (const l of labels) {
    const lower = l.toLowerCase();
    if (/vegan/i.test(lower)) diet.add('vegan');
    if (/vegetarian/i.test(lower)) diet.add('vegetarian');
    if (/gluten.free|sans.gluten|безглютен/i.test(lower)) diet.add('gluten_free');
    if (/halal|халал|халяль/i.test(lower)) diet.add('halal');
  }
  return Array.from(diet);
}

async function fetchWithRetry(ean, maxRetries = 3) {
  const fields = [
    'code', 'product_name', 'product_name_ru', 'brands', 'quantity',
    'ingredients_text', 'ingredients_text_ru', 'nutriments',
    'nutriscore_grade', 'nova_group', 'allergens_tags', 'traces_tags',
    'additives_tags', 'labels_tags', 'countries_tags', 'packaging',
    'image_front_url', 'image_ingredients_url', 'image_nutrition_url',
    'manufacturing_places'
  ].join(',');

  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=${fields}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'KorsetApp - Android/iOS - Version 1.0 (info@korset.kz; +https://korset.kz)'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (res.status === 200) {
        const body = await res.json();
        if (body.status === 1 && body.product) {
          return { status: 200, product: body.product };
        }
        return { status: 404, product: null };
      }

      if (res.status === 404) {
        return { status: 404, product: null };
      }

      if (res.status === 429 || res.status === 503 || res.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[WARN] HTTP ${res.status} for EAN ${ean}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      return { status: res.status, product: null };
    } catch (e) {
      if (attempt === maxRetries) {
        console.warn(`[ERROR] Failed to fetch EAN ${ean}: ${e.message}`);
        return { status: 'error', error: e.message };
      }
      await sleep(1500 * attempt);
    }
  }
  return { status: 'failed', product: null };
}

async function main() {
  console.log(`=== Open Food Facts Harvester ===`);
  console.log(`Config: LIMIT=${LIMIT}, OFFSET=${OFFSET}`);

  if (!fs.existsSync(TARGETS_PATH)) {
    console.error(`Targets file not found: ${TARGETS_PATH}`);
    process.exit(1);
  }

  const allTargets = JSON.parse(fs.readFileSync(TARGETS_PATH, 'utf8'));
  const targets = allTargets.slice(OFFSET, OFFSET + LIMIT);
  console.log(`Processing slice ${OFFSET}..${OFFSET + targets.length} out of ${allTargets.length} total targets.`);

  // Load existing raw harvest cache to prevent duplicate requests
  const cached = new Map();
  if (fs.existsSync(RAW_LOG_PATH)) {
    const lines = fs.readFileSync(RAW_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
    for (const l of lines) {
      try {
        const item = JSON.parse(l);
        if (item.ean) cached.set(item.ean, item);
      } catch {}
    }
    console.log(`Loaded ${cached.size} previously cached raw harvest results.`);
  }

  const rawStream = fs.createWriteStream(RAW_LOG_PATH, { flags: 'a' });

  let found = 0;
  let notFound = 0;
  let errorCount = 0;
  let fromCache = 0;

  let enrichedKbju = 0;
  let enrichedNutriscore = 0;
  let enrichedNova = 0;
  let enrichedAllergens = 0;
  let enrichedAdditives = 0;
  let enrichedIngredients = 0;
  let enrichedHalal = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    let rawItem = cached.get(t.ean);

    if (rawItem) {
      fromCache++;
    } else {
      const res = await fetchWithRetry(t.ean);
      rawItem = {
        ean: t.ean,
        status: res.status,
        product: res.product,
        fetched_at: new Date().toISOString()
      };
      cached.set(t.ean, rawItem);
      rawStream.write(JSON.stringify(rawItem) + '\n');
      // Polite pacing: 500ms delay between API requests (safe 2 req/s)
      await sleep(500);
    }

    if (rawItem.status === 200 && rawItem.product) {
      found++;
      const p = rawItem.product;

      // Extract Nutriments KBJU
      const n = p.nutriments || {};
      const cal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? n.energy_kcal;
      const prot = n.proteins_100g ?? n.proteins;
      let fat = n.fat_100g ?? n.fat;
      const carb = n.carbohydrates_100g ?? n.carbohydrates;

      // If fat is omitted on items where calories match 4*p + 4*c (e.g. juices, ketchup, sugar, tea)
      if (fat == null && cal != null && carb != null) {
        const pVal = Number(prot) || 0;
        const cVal = Number(carb) || 0;
        const calVal = Number(cal);
        if (Math.abs(calVal - (pVal * 4 + cVal * 4)) <= 25) {
          fat = 0;
        }
      }

      const numCal = cal != null ? Math.round(Number(cal)) : null;
      const numProt = prot != null ? Math.round(Number(prot) * 10) / 10 : null;
      const numFat = fat != null ? Math.round(Number(fat) * 10) / 10 : null;
      const numCarb = carb != null ? Math.round(Number(carb) * 10) / 10 : null;

      const hasValidKbju = isValidKbju(numCal, numProt, numFat, numCarb);
      if (hasValidKbju && (numCal != null && numProt != null && numFat != null && numCarb != null)) {
        enrichedKbju++;
      }

      if (p.nutriscore_grade && ['a', 'b', 'c', 'd', 'e'].includes(p.nutriscore_grade.toLowerCase())) {
        enrichedNutriscore++;
      }

      if (p.nova_group && [1, 2, 3, 4].includes(Number(p.nova_group))) {
        enrichedNova++;
      }

      const allergens = mapAllergens(p.allergens_tags);
      if (allergens.length > 0) enrichedAllergens++;

      const additives = mapAdditives(p.additives_tags);
      if (additives.length > 0) enrichedAdditives++;

      const ing = p.ingredients_text_ru || p.ingredients_text;
      if (ing && ing.trim().length > 10) enrichedIngredients++;

      const diet = mapDietTags(p.labels_tags);
      if (diet.includes('halal')) enrichedHalal++;

      if (i % 20 === 0 || i === targets.length - 1) {
        console.log(`[${i + 1}/${targets.length}] EAN: ${t.ean} | Found: ${found} (fromCache: ${fromCache}) | KBJU: ${enrichedKbju} | NutriScore: ${enrichedNutriscore} | Nova: ${enrichedNova} | Allergens: ${enrichedAllergens} | Additives: ${enrichedAdditives}`);
      }
    } else if (rawItem.status === 404) {
      notFound++;
    } else {
      errorCount++;
    }
  }

  rawStream.end();

  console.log(`\n================ HARVEST SUMMARY ================`);
  console.log(`Total queried in batch: ${targets.length}`);
  console.log(`Found in OFF (200):     ${found} (${Math.round(found / targets.length * 100)}%)`);
  console.log(`Not found in OFF (404): ${notFound}`);
  console.log(`Errors / Other:         ${errorCount}`);
  console.log(`Cached from earlier:    ${fromCache}`);
  console.log(`-------------------------------------------------`);
  console.log(`Attributes Yield:`);
  console.log(`  Complete 4-KBJU:      ${enrichedKbju}`);
  console.log(`  Nutri-Score:          ${enrichedNutriscore}`);
  console.log(`  Nova Group:           ${enrichedNova}`);
  console.log(`  Allergens:            ${enrichedAllergens}`);
  console.log(`  Additives (E-numbers):${enrichedAdditives}`);
  console.log(`  Ingredients raw:      ${enrichedIngredients}`);
  console.log(`  Halal tags:           ${enrichedHalal}`);
  console.log(`=================================================`);
}

main().catch(console.error);
