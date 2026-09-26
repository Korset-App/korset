import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const LOG_PATH = path.join(__dirname, '..', 'data', 'off_enrichment_log.jsonl');
const CHECKPOINT_PATH = path.join(__dirname, '..', 'data', 'off_enrichment_checkpoint.json');

const CONCURRENCY = 5;
const DELAY_MS = 120; // 5-8 requests/sec to be polite to OFF API

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Physical sanity validation
function isValidKbju(cal, prot, fat, carb) {
  if (cal === null && prot === null && fat === null && carb === null) return false;

  const p = prot || 0;
  const f = fat || 0;
  const c = carb || 0;

  // Laws of physics: cannot exceed 105g per 100g (margin for hydration/rounding)
  if (p + f + c > 105) return false;
  if (p < 0 || f < 0 || c < 0) return false;

  // Energy check: 1g protein = 4 kcal, 1g fat = 9 kcal, 1g carb = 4 kcal
  if (cal !== null && cal > 0) {
    if (cal > 950) return false; // Pure fat is 900 kcal
    const calcCal = (p * 4) + (f * 9) + (c * 4);
    if (calcCal > 0 && Math.abs(cal - calcCal) > Math.max(100, calcCal * 0.4)) {
      // Discrepancy too large
      return false;
    }
  }

  return true;
}

async function fetchOffProduct(ean) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'KorsetCatalogEngine - ProductionV4 (catalog@korset.kz)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;
    return json.product;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('--- Step 1: Open Food Facts Exact EAN Enrichment ---');

  // Load checkpoint of processed EANs
  const processed = new Set();
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      const cp = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
      for (const e of cp.processed || []) processed.add(e);
      console.log(`Loaded ${processed.size} previously checked EANs from checkpoint.`);
    } catch (e) {}
  }

  // Read master catalog to find target food items needing KBJU
  const masterRl = readline.createInterface({
    input: fs.createReadStream(MASTER_PATH),
    crlfDelay: Infinity
  });

  const targets = [];
  for await (const line of masterRl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    const hasPhoto = p.image_url && !p.image_url.includes('empty_photo') && !p.image_url.includes('no-photo');
    const isFood = (p.category !== 'personal_care' && p.category !== 'household');
    const needsKbju = !p.nutriments_json || Object.keys(p.nutriments_json).length === 0;

    if (hasPhoto && isFood && needsKbju && p.ean && p.ean.length >= 8) {
      if (!processed.has(p.ean)) {
        targets.push({
          id: p.id,
          ean: p.ean,
          name: p.name,
          brand: p.brand,
          category: p.category,
          hasIng: !!(p.ingredients_raw && p.ingredients_raw.trim().length > 3)
        });
      }
    }
  }

  console.log(`Total target items needing KBJU to process: ${targets.length}`);
  if (targets.length === 0) {
    console.log('No targets left to process.');
    return;
  }

  const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });

  let enrichedCount = 0;
  let notFoundCount = 0;
  let invalidCount = 0;

  // Process in batches
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (t) => {
      processed.add(t.ean);
      const off = await fetchOffProduct(t.ean);

      if (!off) {
        notFoundCount++;
        return;
      }

      const n = off.nutriments || {};
      const cal = n['energy-kcal_100g'] !== undefined ? Number(n['energy-kcal_100g']) : (n['energy-kcal'] !== undefined ? Number(n['energy-kcal']) : (n.energy_kcal !== undefined ? Number(n.energy_kcal) : null));
      const prot = n.proteins_100g !== undefined ? Number(n.proteins_100g) : (n.proteins !== undefined ? Number(n.proteins) : null);
      const fat = n.fat_100g !== undefined ? Number(n.fat_100g) : (n.fat !== undefined ? Number(n.fat) : null);
      const carb = n.carbohydrates_100g !== undefined ? Number(n.carbohydrates_100g) : (n.carbohydrates !== undefined ? Number(n.carbohydrates) : null);

      if (!isValidKbju(cal, prot, fat, carb)) {
        invalidCount++;
        return;
      }

      const nutriments = {};
      if (cal !== null && !isNaN(cal)) nutriments.energy_kcal = Math.round(cal);
      if (prot !== null && !isNaN(prot)) nutriments.protein_100g = Math.round(prot * 10) / 10;
      if (fat !== null && !isNaN(fat)) nutriments.fat_100g = Math.round(fat * 10) / 10;
      if (carb !== null && !isNaN(carb)) nutriments.carbohydrates_100g = Math.round(carb * 10) / 10;

      // Check for ingredients if master lacks them
      let newIngredients = null;
      if (!t.hasIng) {
        const offIng = off.ingredients_text_ru || off.ingredients_text;
        if (offIng && offIng.trim().length > 10) {
          newIngredients = offIng.trim();
        }
      }

      enrichedCount++;
      const matchLog = {
        id: t.id,
        ean: t.ean,
        masterName: t.name,
        offName: off.product_name || off.generic_name || t.name,
        brand: t.brand || off.brands,
        nutriments_json: nutriments,
        ingredients_raw: newIngredients,
        nutriscore: off.nutriscore_grade ? off.nutriscore_grade.toUpperCase() : null,
        source: 'open_food_facts',
        matched_at: new Date().toISOString()
      };

      logStream.write(JSON.stringify(matchLog) + '\n');
      console.log(`[MATCH] ${t.ean} | ${t.name.slice(0, 40)} -> Cal:${nutriments.energy_kcal} P:${nutriments.protein_100g} F:${nutriments.fat_100g} C:${nutriments.carbohydrates_100g}`);
    }));

    // Save checkpoint every 100 items
    if (i % 100 === 0 || i + CONCURRENCY >= targets.length) {
      fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
        last_updated: new Date().toISOString(),
        processed: Array.from(processed),
        enrichedCount,
        notFoundCount
      }, null, 2));
      console.log(`Progress: ${i + batch.length}/${targets.length} processed | Enriched: ${enrichedCount} | NotFound: ${notFoundCount}`);
    }

    await sleep(DELAY_MS);
  }

  logStream.end();
  console.log(`\n=== Open Food Facts Run Complete ===`);
  console.log(`Enriched: ${enrichedCount}`);
  console.log(`Not found: ${notFoundCount}`);
  console.log(`Invalid numbers: ${invalidCount}`);
}

main().catch(console.error);
