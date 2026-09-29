import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

const V4_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const RUN_ID = '2026-09-29-v4-master-01';

const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', `v4-master-enrichment-proposal-${RUN_ID}.jsonl`);
const APPLY_SQL_PATH = path.join(__dirname, '..', 'scratch', `apply-v4-master-enrichment-${RUN_ID}.sql`);
const ROLLBACK_SQL_PATH = path.join(__dirname, '..', 'scratch', `rollback-v4-master-enrichment-${RUN_ID}.sql`);

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

function escapeSql(str) {
  if (str == null) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function escapeJsonSql(obj) {
  if (obj == null) return 'NULL';
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

async function main() {
  console.log('=== Step 1: Loading Active Food Products from Supabase ===');

  let allProducts = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, name, brand, category, ingredients_raw, nutriments_json, specs_json, shelf_life, storage_conditions, manufacturer, country_of_origin')
      .eq('is_active', true)
      .not('category', 'in', '(household,personal_care)')
      .not('image_url', 'is', null)
      .not('image_url', 'like', '%empty_photo%')
      .not('image_url', 'like', '%no-photo%')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Supabase fetch error:', error);
      process.exit(1);
    }
    allProducts.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`Fetched ${allProducts.length} active food products from Supabase.`);

  const dbMap = new Map();
  let dbAlreadyHasKbju = 0;
  let dbAlreadyHasIng = 0;

  for (const p of allProducts) {
    if (!p.ean) continue;
    const hasK = hasFullKbju(p.nutriments_json);
    const hasI = p.ingredients_raw && p.ingredients_raw.trim().length > 10;
    if (hasK) dbAlreadyHasKbju++;
    if (hasI) dbAlreadyHasIng++;

    dbMap.set(p.ean, {
      ...p,
      hasFullKbju: hasK,
      hasIngredients: hasI
    });
  }

  console.log(`Current DB state in target pool:`);
  console.log(`  Has Full 4-KBJU:   ${dbAlreadyHasKbju} / ${allProducts.length}`);
  console.log(`  Has Ingredients:   ${dbAlreadyHasIng} / ${allProducts.length}`);
  console.log(`  Needing KBJU:      ${allProducts.length - dbAlreadyHasKbju}`);
  console.log(`  Needing Ing:       ${allProducts.length - dbAlreadyHasIng}`);

  console.log('\n=== Step 2: Indexing Local V4 Master Dataset ===');
  if (!fs.existsSync(V4_PATH)) {
    console.error(`V4 master file not found: ${V4_PATH}`);
    process.exit(1);
  }

  const v4Map = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(V4_PATH),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const p = JSON.parse(line);
      if (!p.ean || !/^\d{8,14}$/.test(p.ean)) continue;
      // If we see duplicates in V4, keep the one with KBJU
      const existing = v4Map.get(p.ean);
      if (!existing || (!hasFullKbju(existing.nutriments_json) && hasFullKbju(p.nutriments_json))) {
        v4Map.set(p.ean, p);
      }
    } catch {}
  }

  console.log(`Indexed ${v4Map.size} unique valid EANs from local V4 master.`);

  console.log('\n=== Step 3: Matching & Generating Proposal ===');
  const proposal = [];
  const applyStatements = [];
  const rollbackStatements = [];

  let newKbjuCount = 0;
  let newIngCount = 0;
  let newShelfLifeCount = 0;
  let newStorageCount = 0;
  let newManufacturerCount = 0;
  let newOriginCount = 0;

  for (const [ean, dbItem] of dbMap.entries()) {
    const v4 = v4Map.get(ean);
    if (!v4) continue;

    const updates = {};
    const rollback = {};

    // 1. Nutriments (KBJU)
    if (!dbItem.hasFullKbju) {
      const n = v4.nutriments_json || v4.nutriments;
      if (n) {
        const cal = n.energy_kcal ?? n.kcal ?? n.calories ?? n.calories_100g ?? n.energy_kcal_100g ?? n['energy-kcal_100g'];
        const prot = n.protein_100g ?? n.protein ?? n.proteins ?? n.proteins_100g;
        const fat = n.fat_100g ?? n.fat ?? n.fats ?? n.fats_100g;
        const carb = n.carbohydrates_100g ?? n.carbs ?? n.carbohydrates ?? n.carbs_100g;

        if (isValidKbju(cal, prot, fat, carb)) {
          const kbju = {
            energy_kcal: Math.round(Number(cal)),
            protein_100g: Math.round(Number(prot) * 10) / 10,
            fat_100g: Math.round(Number(fat) * 10) / 10,
            carbohydrates_100g: Math.round(Number(carb) * 10) / 10
          };
          if (n.sugars_100g != null && !isNaN(n.sugars_100g) && n.sugars_100g >= 0 && n.sugars_100g <= 100) {
            kbju.sugars_100g = Math.round(Number(n.sugars_100g) * 10) / 10;
          }
          if (n.salt_100g != null && !isNaN(n.salt_100g) && n.salt_100g >= 0 && n.salt_100g <= 100) {
            kbju.salt_100g = Math.round(Number(n.salt_100g) * 100) / 100;
          }
          if (n.fiber_100g != null && !isNaN(n.fiber_100g) && n.fiber_100g >= 0 && n.fiber_100g <= 100) {
            kbju.fiber_100g = Math.round(Number(n.fiber_100g) * 10) / 10;
          }
          updates.nutriments_json = kbju;
          rollback.nutriments_json = dbItem.nutriments_json;
          newKbjuCount++;
        }
      }
    }

    // 2. Ingredients
    if (!dbItem.hasIngredients) {
      const v4Ing = (v4.ingredients_raw || '').trim();
      // Sanity checks on ingredients string
      if (v4Ing.length > 10 && !/^(нет данных|информация отсутствует|подробнее на упаковке|см\. на упаковке)/i.test(v4Ing)) {
        updates.ingredients_raw = v4Ing;
        rollback.ingredients_raw = dbItem.ingredients_raw;
        newIngCount++;
      }
    }

    // 3. Shelf life (if missing in DB and present in V4)
    if (!dbItem.shelf_life && v4.shelf_life && typeof v4.shelf_life === 'string' && v4.shelf_life.trim().length > 1) {
      updates.shelf_life = v4.shelf_life.trim().slice(0, 100);
      rollback.shelf_life = null;
      newShelfLifeCount++;
    }

    // 4. Storage conditions
    if (!dbItem.storage_conditions && v4.storage_conditions && typeof v4.storage_conditions === 'string' && v4.storage_conditions.trim().length > 2) {
      updates.storage_conditions = v4.storage_conditions.trim().slice(0, 200);
      rollback.storage_conditions = null;
      newStorageCount++;
    }

    // 5. Manufacturer
    if (!dbItem.manufacturer && v4.manufacturer && typeof v4.manufacturer === 'string' && v4.manufacturer.trim().length > 2) {
      updates.manufacturer = v4.manufacturer.trim().slice(0, 150);
      rollback.manufacturer = null;
      newManufacturerCount++;
    }

    // 6. Country of origin
    if (!dbItem.country_of_origin && v4.country_of_origin && typeof v4.country_of_origin === 'string' && v4.country_of_origin.trim().length >= 2) {
      updates.country_of_origin = v4.country_of_origin.trim().slice(0, 80);
      rollback.country_of_origin = null;
      newOriginCount++;
    }

    if (Object.keys(updates).length > 0) {
      const provenance = {
        v4_master_provenance: {
          run_id: RUN_ID,
          matched_at: new Date().toISOString(),
          code: ean,
          source_primary: v4.source_primary || 'korset_master_catalog_v4'
        }
      };

      proposal.push({
        ean,
        target_name: dbItem.name,
        target_brand: dbItem.brand,
        v4_name: v4.name,
        v4_brand: v4.brand,
        updates,
        provenance
      });

      // Build SQL statements
      const setClauses = [];
      if (updates.nutriments_json) setClauses.push(`nutriments_json = ${escapeJsonSql(updates.nutriments_json)}`);
      if (updates.ingredients_raw) setClauses.push(`ingredients_raw = ${escapeSql(updates.ingredients_raw)}`);
      if (updates.shelf_life) setClauses.push(`shelf_life = ${escapeSql(updates.shelf_life)}`);
      if (updates.storage_conditions) setClauses.push(`storage_conditions = ${escapeSql(updates.storage_conditions)}`);
      if (updates.manufacturer) setClauses.push(`manufacturer = ${escapeSql(updates.manufacturer)}`);
      if (updates.country_of_origin) setClauses.push(`country_of_origin = ${escapeSql(updates.country_of_origin)}`);

      setClauses.push(`specs_json = coalesce(specs_json, '{}'::jsonb) || ${escapeJsonSql(provenance)}`);
      setClauses.push(`updated_at = now()`);

      applyStatements.push(`UPDATE global_products SET ${setClauses.join(', ')} WHERE ean = '${ean}';`);

      const rollbackClauses = [];
      if (updates.nutriments_json) rollbackClauses.push(`nutriments_json = ${escapeJsonSql(rollback.nutriments_json)}`);
      if (updates.ingredients_raw) rollbackClauses.push(`ingredients_raw = ${escapeSql(rollback.ingredients_raw)}`);
      if (updates.shelf_life) rollbackClauses.push(`shelf_life = NULL`);
      if (updates.storage_conditions) rollbackClauses.push(`storage_conditions = NULL`);
      if (updates.manufacturer) rollbackClauses.push(`manufacturer = NULL`);
      if (updates.country_of_origin) rollbackClauses.push(`country_of_origin = NULL`);
      rollbackClauses.push(`specs_json = specs_json - 'v4_master_provenance'`);

      rollbackStatements.push(`UPDATE global_products SET ${rollbackClauses.join(', ')} WHERE ean = '${ean}';`);
    }
  }

  console.log(`\n================ V4 MASTER PROPOSAL SUMMARY ================`);
  console.log(`Total Products to Enrich:     ${proposal.length}`);
  console.log(`Attributes to Add:`);
  console.log(`  Complete 4-KBJU:            +${newKbjuCount}`);
  console.log(`  Raw Ingredients:            +${newIngCount}`);
  console.log(`  Shelf Life:                 +${newShelfLifeCount}`);
  console.log(`  Storage Conditions:         +${newStorageCount}`);
  console.log(`  Manufacturer:               +${newManufacturerCount}`);
  console.log(`  Country of Origin:          +${newOriginCount}`);
  console.log(`============================================================`);

  fs.writeFileSync(PROPOSAL_PATH, proposal.map(p => JSON.stringify(p)).join('\n') + '\n');
  fs.writeFileSync(APPLY_SQL_PATH, `-- Run ID: ${RUN_ID}\n-- Generated: ${new Date().toISOString()}\n-- Count: ${applyStatements.length}\n\nBEGIN;\n\n` + applyStatements.join('\n') + '\n\nCOMMIT;\n');
  fs.writeFileSync(ROLLBACK_SQL_PATH, `-- Rollback Run ID: ${RUN_ID}\n-- Generated: ${new Date().toISOString()}\n-- Count: ${rollbackStatements.length}\n\nBEGIN;\n\n` + rollbackStatements.join('\n') + '\n\nCOMMIT;\n');

  console.log(`Saved proposal to: ${PROPOSAL_PATH}`);
  console.log(`Saved apply SQL to: ${APPLY_SQL_PATH}`);
  console.log(`Saved rollback SQL to: ${ROLLBACK_SQL_PATH}`);
}

main().catch(console.error);
