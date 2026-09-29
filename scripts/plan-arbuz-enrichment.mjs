import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARBUZ_PATH = path.join(__dirname, '..', 'data', 'arbuz_enriched_catalog.jsonl');
const RUN_ID = '2026-09-29-arbuz-enrichment-01';
const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', `arbuz-enrichment-proposal-${RUN_ID}.jsonl`);

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

function isValidKbju(cal, prot, fat, carb) {
  if (cal == null || prot == null || fat == null || carb == null) return false;
  const p = Number(prot);
  const f = Number(fat);
  const c = Number(carb);
  const k = Number(cal);

  if (isNaN(p) || isNaN(f) || isNaN(c) || isNaN(k)) return false;
  if (p < 0 || f < 0 || c < 0 || k < 0) return false;
  if (p > 100 || f > 100 || c > 100) return false;
  if (p + f + c > 105) return false;
  if (k > 950) return false;

  const calc = (p * 4) + (f * 9) + (c * 4);
  if (calc > 0 && Math.abs(k - calc) > Math.max(120, calc * 0.45)) {
    return false;
  }
  return true;
}

function hasFullKbju(n) {
  if (!n) return false;
  const cal = n.energy_kcal ?? n.kcal ?? n.calories ?? n.calories_100g ?? n.energy_kcal_100g ?? n['energy-kcal_100g'];
  const prot = n.protein_100g ?? n.protein ?? n.proteins ?? n.proteins_100g;
  const fat = n.fat_100g ?? n.fat ?? n.fats ?? n.fats_100g;
  const carb = n.carbohydrates_100g ?? n.carbs ?? n.carbohydrates ?? n.carbs_100g;

  if (cal == null || prot == null || fat == null || carb == null) return false;
  return isValidKbju(cal, prot, fat, carb);
}

async function main() {
  console.log(`=== Planning Arbuz Catalog Enrichment: ${RUN_ID} ===`);

  if (!fs.existsSync(ARBUZ_PATH)) {
    console.error('Arbuz catalog file not found:', ARBUZ_PATH);
    process.exit(1);
  }

  console.log('Fetching products lacking KBJU/ingredients from Supabase...');
  let offset = 0;
  const limit = 1000;
  const targetMap = new Map();

  while (true) {
    const { data, error } = await sb.from('global_products')
      .select('ean, name, brand, category, image_url, is_active, nutriments_json, ingredients_raw, country_of_origin, shelf_life, storage_conditions')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching targets:', error);
      break;
    }
    if (!data || data.length === 0) break;

    for (const p of data) {
      if (!p.is_active || ['household', 'personal_care'].includes(p.category) || !p.image_url) continue;
      const ean = String(p.ean).replace(/\D/g, '');
      if (ean.length < 8) continue;

      const fullKbju = hasFullKbju(p.nutriments_json);
      const hasIng = p.ingredients_raw && p.ingredients_raw.trim().length > 0;

      if (!fullKbju || !hasIng || !p.country_of_origin || !p.shelf_life || !p.storage_conditions) {
        targetMap.set(ean, {
          ean,
          name: p.name,
          brand: p.brand,
          hasKbju: fullKbju,
          hasIng,
          hasOrigin: !!p.country_of_origin,
          hasShelfLife: !!p.shelf_life,
          hasStorage: !!p.storage_conditions
        });
      }
    }

    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`Found ${targetMap.size} candidate target products in Supabase.`);

  const proposal = [];
  const fileStream = fs.createReadStream(ARBUZ_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let matchedTargets = 0;
  let kbjuCount = 0;
  let ingCount = 0;
  let originCount = 0;
  let shelfLifeCount = 0;
  let storageCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const a = JSON.parse(line);
      const rawEan = a.ean || a.barcode;
      if (!rawEan) continue;
      const ean = String(rawEan).replace(/\D/g, '');
      if (ean.length < 8) continue;

      const target = targetMap.get(ean);
      if (!target) continue;

      const updates = {};

      // 1. Nutriments
      const n = a.nutriments_json;
      if (!target.hasKbju && n && Object.keys(n).length > 0) {
        const cal = n.energy_kcal ?? n.calories;
        const prot = n.protein_100g ?? n.proteins;
        const fat = n.fat_100g ?? n.fats;
        const carb = n.carbohydrates_100g ?? n.carbohydrates;

        if (isValidKbju(cal, prot, fat, carb)) {
          updates.nutriments_json = {
            energy_kcal: Math.round(Number(cal)),
            protein_100g: Math.round(Number(prot) * 10) / 10,
            fat_100g: Math.round(Number(fat) * 10) / 10,
            carbohydrates_100g: Math.round(Number(carb) * 10) / 10
          };
          kbjuCount++;
        }
      }

      // 2. Ingredients
      const ing = a.ingredients_raw;
      if (!target.hasIng && typeof ing === 'string' && ing.trim().length > 10) {
        updates.ingredients_raw = ing.trim();
        ingCount++;
      }

      // 3. Country of origin
      if (!target.hasOrigin && a.producer_country && a.producer_country.trim().length > 1) {
        updates.country_of_origin = a.producer_country.trim();
        originCount++;
      }

      // 4. Shelf life
      if (!target.hasShelfLife && a.shelf_life_days) {
        updates.shelf_life = `${a.shelf_life_days} дней`;
        shelfLifeCount++;
      }

      // 5. Storage conditions
      if (!target.hasStorage && a.storage_conditions && a.storage_conditions.trim().length > 3) {
        updates.storage_conditions = a.storage_conditions.trim();
        storageCount++;
      }

      if (Object.keys(updates).length > 0) {
        matchedTargets++;
        proposal.push({
          ean,
          target_name: target.name,
          arbuz_name: a.name,
          updates,
          provenance: {
            arbuz_catalog_provenance: {
              source: 'arbuz_enriched_catalog',
              applied_at: new Date().toISOString(),
              attributes_enriched: Object.keys(updates)
            }
          }
        });
      }
    } catch {}
  }

  fs.writeFileSync(PROPOSAL_PATH, proposal.map(p => JSON.stringify(p)).join('\n') + '\n', 'utf8');

  console.log('\n================ ARBUZ PROPOSAL SUMMARY ================');
  console.log(`Total Products to Enrich:     ${matchedTargets}`);
  console.log(`Attributes to Add:`);
  console.log(`  Complete 4-KBJU:            +${kbjuCount}`);
  console.log(`  Ingredients (raw):          +${ingCount}`);
  console.log(`  Country of Origin:          +${originCount}`);
  console.log(`  Shelf Life:                 +${shelfLifeCount}`);
  console.log(`  Storage Conditions:         +${storageCount}`);
  console.log(`Saved proposal to:            ${PROPOSAL_PATH}`);
  console.log('========================================================\n');
}

main().catch(console.error);
