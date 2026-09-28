import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OFF_ALLERGEN_MAP } from '../src/constants/allergens.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const runIdArg = args.find(a => a.startsWith('--run-id='));
const RUN_ID = runIdArg ? runIdArg.split('=')[1] : '2026-09-28-off-enrichment-02';

const RAW_LOG_PATH = path.join(__dirname, '..', 'scratch', 'off-harvest-raw.jsonl');
const TARGETS_PATH = path.join(__dirname, '..', 'scratch', 'off-enrichment-targets.json');
const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', `off-enrichment-proposal-${RUN_ID}.jsonl`);
const APPLY_SQL_PATH = path.join(__dirname, '..', 'scratch', `apply-off-enrichment-${RUN_ID}.sql`);
const ROLLBACK_SQL_PATH = path.join(__dirname, '..', 'scratch', `rollback-off-enrichment-${RUN_ID}.sql`);

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

function escapeSql(str) {
  if (str == null) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function escapeJsonSql(obj) {
  if (obj == null) return 'NULL';
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

async function main() {
  console.log(`=== Generating OFF Enrichment Proposal & SQL ===`);

  if (!fs.existsSync(RAW_LOG_PATH) || !fs.existsSync(TARGETS_PATH)) {
    console.error('Required input files do not exist.');
    process.exit(1);
  }

  const targets = JSON.parse(fs.readFileSync(TARGETS_PATH, 'utf8'));
  const targetsByEan = new Map();
  for (const t of targets) targetsByEan.set(t.ean, t);

  const rawLines = fs.readFileSync(RAW_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const harvestByEan = new Map();
  for (const l of rawLines) {
    try {
      const h = JSON.parse(l);
      if (h.ean && h.status === 200 && h.product) {
        harvestByEan.set(h.ean, h.product);
      }
    } catch {}
  }

  console.log(`Loaded ${targets.length} targets, ${harvestByEan.size} successful OFF products.`);

  const proposal = [];
  const applyStatements = [];
  const rollbackStatements = [];

  let countKbju = 0;
  let countNutriscore = 0;
  let countNova = 0;
  let countIngredients = 0;
  let countAllergens = 0;
  let countAdditives = 0;
  let countDietTags = 0;
  let countHalal = 0;
  let countPackaging = 0;
  let countOrigin = 0;
  let countManufacturer = 0;

  for (const [ean, off] of harvestByEan.entries()) {
    const target = targetsByEan.get(ean);
    if (!target) continue;

    const updates = {};
    const rollback = {};

    // 1. Nutriments (KBJU)
    const n = off.nutriments || {};
    const cal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? n.energy_kcal;
    const prot = n.proteins_100g ?? n.proteins;
    let fat = n.fat_100g ?? n.fat;
    const carb = n.carbohydrates_100g ?? n.carbohydrates;

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

    if (!target.hasKbju && isValidKbju(numCal, numProt, numFat, numCarb) &&
        numCal != null && numProt != null && numFat != null && numCarb != null) {
      const kbju = {
        energy_kcal: numCal,
        protein_100g: numProt,
        fat_100g: numFat,
        carbohydrates_100g: numCarb
      };
      if (n.sugars_100g != null && !isNaN(n.sugars_100g) && n.sugars_100g >= 0 && n.sugars_100g <= 100) {
        kbju.sugars_100g = Math.round(Number(n.sugars_100g) * 10) / 10;
      }
      if (n.salt_100g != null && !isNaN(n.salt_100g) && n.salt_100g >= 0 && n.salt_100g <= 100) {
        kbju.salt_100g = Math.round(Number(n.salt_100g) * 100) / 100;
      }
      if (n['saturated-fat_100g'] != null && !isNaN(n['saturated-fat_100g']) && n['saturated-fat_100g'] >= 0 && n['saturated-fat_100g'] <= 100) {
        kbju.saturated_fat_100g = Math.round(Number(n['saturated-fat_100g']) * 10) / 10;
      }
      if (n.fiber_100g != null && !isNaN(n.fiber_100g) && n.fiber_100g >= 0 && n.fiber_100g <= 100) {
        kbju.fiber_100g = Math.round(Number(n.fiber_100g) * 10) / 10;
      }
      updates.nutriments_json = kbju;
      rollback.nutriments_json = null;
      countKbju++;
    }

    // 2. Nutri-Score
    if (off.nutriscore_grade && ['a', 'b', 'c', 'd', 'e'].includes(off.nutriscore_grade.toLowerCase()) && !target.hasNutriscore) {
      updates.nutriscore = off.nutriscore_grade.toUpperCase();
      rollback.nutriscore = null;
      countNutriscore++;
    }

    // 3. Nova Group
    if (off.nova_group && [1, 2, 3, 4].includes(Number(off.nova_group))) {
      updates.nova_group = Number(off.nova_group);
      rollback.nova_group = null;
      countNova++;
    }

    // 4. Ingredients (only if DB lacks ingredients)
    const offIng = (off.ingredients_text_ru || off.ingredients_text || '').trim();
    if (!target.hasIng && offIng.length > 10) {
      updates.ingredients_raw = offIng;
      rollback.ingredients_raw = null;
      countIngredients++;
    }

    // 5. Allergens
    const allergens = mapAllergens(off.allergens_tags);
    if (!target.hasAllergens && allergens.length > 0) {
      updates.allergens_json = allergens;
      rollback.allergens_json = [];
      countAllergens++;
    }

    // 6. Traces
    const traces = mapAllergens(off.traces_tags);
    if (traces.length > 0) {
      updates.traces_json = traces;
      rollback.traces_json = [];
    }

    // 7. Additives
    const additives = mapAdditives(off.additives_tags);
    if (additives.length > 0) {
      updates.additives_tags_json = additives;
      rollback.additives_tags_json = [];
      countAdditives++;
    }

    // 8. Diet Tags & Halal
    const diet = mapDietTags(off.labels_tags);
    if (diet.length > 0) {
      updates.diet_tags_json = diet;
      rollback.diet_tags_json = [];
      countDietTags++;
    }
    if (diet.includes('halal')) {
      updates.halal_status = 'yes';
      updates.halal_notes = 'Open Food Facts verified label: halal';
      rollback.halal_status = 'unknown';
      rollback.halal_notes = null;
      countHalal++;
    }

    // 9. Packaging (must satisfy check constraint: bottle_plastic, bottle_glass, can, tetrapak, pouch, tub)
    if (off.packaging && typeof off.packaging === 'string' && off.packaging.trim().length > 2) {
      const lower = off.packaging.toLowerCase();
      let canonicalPackaging = null;
      if (/glass|verre|стекл/i.test(lower)) canonicalPackaging = 'bottle_glass';
      else if (/bottle|bouteille|бутыл/i.test(lower)) canonicalPackaging = 'bottle_plastic';
      else if (/can|tin|boite|ж\/б|жест/i.test(lower)) canonicalPackaging = 'can';
      else if (/tetra|pure-pak|картон|brick|brique/i.test(lower)) canonicalPackaging = 'tetrapak';
      else if (/pouch|doy-pack|пакет|дой-пак|sachet/i.test(lower)) canonicalPackaging = 'pouch';
      else if (/tub|pot|ванноч|стакан/i.test(lower)) canonicalPackaging = 'tub';

      if (canonicalPackaging) {
        updates.packaging_type = canonicalPackaging;
        rollback.packaging_type = null;
        countPackaging++;
      }
    }

    // 10. Origin / Country
    if (Array.isArray(off.countries_tags) && off.countries_tags.length > 0) {
      const kz = off.countries_tags.some(c => c.includes('kazakhstan'));
      const ru = off.countries_tags.some(c => c.includes('russia'));
      const by = off.countries_tags.some(c => c.includes('belarus'));
      const country = kz ? 'Казахстан' : (ru ? 'Россия' : (by ? 'Беларусь' : null));
      if (country) {
        updates.country_of_origin = country;
        rollback.country_of_origin = null;
        countOrigin++;
      }
    }

    // 11. Manufacturer / Brand (if unknown)
    if ((!target.brand || target.brand === 'Unknown') && off.brands && off.brands.trim().length > 1) {
      updates.brand = off.brands.split(',')[0].trim().slice(0, 80);
      rollback.brand = target.brand;
    }
    if (off.manufacturing_places && off.manufacturing_places.trim().length > 2) {
      updates.manufacturer = off.manufacturing_places.trim().slice(0, 150);
      rollback.manufacturer = null;
      countManufacturer++;
    }

    // 12. Images
    if (off.image_ingredients_url && /^https?:\/\//i.test(off.image_ingredients_url)) {
      updates.image_ingredients_url = off.image_ingredients_url.slice(0, 500);
      rollback.image_ingredients_url = null;
    }
    if (off.image_nutrition_url && /^https?:\/\//i.test(off.image_nutrition_url)) {
      updates.image_nutrition_url = off.image_nutrition_url.slice(0, 500);
      rollback.image_nutrition_url = null;
    }

    // If there is at least one meaningful update
    if (Object.keys(updates).length > 0) {
      // Add provenance tracking to specs_json
      const provenance = {
        open_food_facts_provenance: {
          run_id: RUN_ID,
          matched_at: new Date().toISOString(),
          code: ean,
          off_name: off.product_name || off.product_name_ru || null
        }
      };

      const itemProposal = {
        ean,
        target_name: target.name,
        target_brand: target.brand,
        off_name: off.product_name || off.product_name_ru,
        off_brand: off.brands,
        updates,
        provenance
      };
      proposal.push(itemProposal);

      // Build SQL statement
      const setClauses = [];
      if (updates.nutriments_json) setClauses.push(`nutriments_json = ${escapeJsonSql(updates.nutriments_json)}`);
      if (updates.nutriscore) setClauses.push(`nutriscore = ${escapeSql(updates.nutriscore)}`);
      if (updates.nova_group != null) setClauses.push(`nova_group = ${updates.nova_group}`);
      if (updates.ingredients_raw) setClauses.push(`ingredients_raw = ${escapeSql(updates.ingredients_raw)}`);
      if (updates.allergens_json) setClauses.push(`allergens_json = ${escapeJsonSql(updates.allergens_json)}`);
      if (updates.traces_json) setClauses.push(`traces_json = ${escapeJsonSql(updates.traces_json)}`);
      if (updates.additives_tags_json) setClauses.push(`additives_tags_json = ${escapeJsonSql(updates.additives_tags_json)}`);
      if (updates.diet_tags_json) setClauses.push(`diet_tags_json = ${escapeJsonSql(updates.diet_tags_json)}`);
      if (updates.halal_status) setClauses.push(`halal_status = ${escapeSql(updates.halal_status)}`);
      if (updates.halal_notes) setClauses.push(`halal_notes = ${escapeSql(updates.halal_notes)}`);
      if (updates.packaging_type) setClauses.push(`packaging_type = ${escapeSql(updates.packaging_type)}`);
      if (updates.country_of_origin) setClauses.push(`country_of_origin = ${escapeSql(updates.country_of_origin)}`);
      if (updates.manufacturer) setClauses.push(`manufacturer = ${escapeSql(updates.manufacturer)}`);
      if (updates.brand) setClauses.push(`brand = ${escapeSql(updates.brand)}`);
      if (updates.image_ingredients_url) setClauses.push(`image_ingredients_url = ${escapeSql(updates.image_ingredients_url)}`);
      if (updates.image_nutrition_url) setClauses.push(`image_nutrition_url = ${escapeSql(updates.image_nutrition_url)}`);

      setClauses.push(`specs_json = coalesce(specs_json, '{}'::jsonb) || ${escapeJsonSql(provenance)}`);
      setClauses.push(`updated_at = now()`);

      applyStatements.push(`UPDATE global_products SET ${setClauses.join(', ')} WHERE ean = '${ean}';`);

      const rollbackClauses = [];
      if (updates.nutriments_json) rollbackClauses.push(`nutriments_json = NULL`);
      if (updates.nutriscore) rollbackClauses.push(`nutriscore = NULL`);
      if (updates.nova_group != null) rollbackClauses.push(`nova_group = NULL`);
      if (updates.ingredients_raw) rollbackClauses.push(`ingredients_raw = NULL`);
      if (updates.allergens_json) rollbackClauses.push(`allergens_json = '[]'::jsonb`);
      if (updates.traces_json) rollbackClauses.push(`traces_json = '[]'::jsonb`);
      if (updates.additives_tags_json) rollbackClauses.push(`additives_tags_json = '[]'::jsonb`);
      if (updates.diet_tags_json) rollbackClauses.push(`diet_tags_json = '[]'::jsonb`);
      if (updates.halal_status) {
        rollbackClauses.push(`halal_status = 'unknown'`);
        rollbackClauses.push(`halal_notes = NULL`);
      }
      if (updates.packaging_type) rollbackClauses.push(`packaging_type = NULL`);
      if (updates.country_of_origin) rollbackClauses.push(`country_of_origin = NULL`);
      if (updates.manufacturer) rollbackClauses.push(`manufacturer = NULL`);
      if (updates.brand) rollbackClauses.push(`brand = ${escapeSql(rollback.brand)}`);
      if (updates.image_ingredients_url) rollbackClauses.push(`image_ingredients_url = NULL`);
      if (updates.image_nutrition_url) rollbackClauses.push(`image_nutrition_url = NULL`);
      rollbackClauses.push(`specs_json = specs_json - 'open_food_facts_provenance'`);

      rollbackStatements.push(`UPDATE global_products SET ${rollbackClauses.join(', ')} WHERE ean = '${ean}';`);
    }
  }

  fs.writeFileSync(PROPOSAL_PATH, proposal.map(p => JSON.stringify(p)).join('\n') + '\n');
  fs.writeFileSync(APPLY_SQL_PATH, `-- Run ID: ${RUN_ID}\n-- Generated: ${new Date().toISOString()}\n-- Count: ${applyStatements.length}\n\nBEGIN;\n\n` + applyStatements.join('\n') + '\n\nCOMMIT;\n');
  fs.writeFileSync(ROLLBACK_SQL_PATH, `-- Rollback Run ID: ${RUN_ID}\n-- Generated: ${new Date().toISOString()}\n-- Count: ${rollbackStatements.length}\n\nBEGIN;\n\n` + rollbackStatements.join('\n') + '\n\nCOMMIT;\n');

  console.log(`\n================ PROPOSAL SUMMARY ================`);
  console.log(`Total Products Enriched: ${proposal.length}`);
  console.log(`Attributes Added / Enriched:`);
  console.log(`  Complete 4-KBJU:       +${countKbju}`);
  console.log(`  Nutri-Score:           +${countNutriscore}`);
  console.log(`  Nova Group:            +${countNova}`);
  console.log(`  Raw Ingredients:       +${countIngredients}`);
  console.log(`  Allergens:             +${countAllergens}`);
  console.log(`  Additives (E-numbers): +${countAdditives}`);
  console.log(`  Diet Tags:             +${countDietTags}`);
  console.log(`  Halal Status 'yes':    +${countHalal}`);
  console.log(`  Packaging Type:        +${countPackaging}`);
  console.log(`  Country of Origin:     +${countOrigin}`);
  console.log(`  Manufacturer:          +${countManufacturer}`);
  console.log(`==================================================`);
  console.log(`Generated proposal: ${PROPOSAL_PATH}`);
  console.log(`Generated apply SQL: ${APPLY_SQL_PATH}`);
  console.log(`Generated rollback SQL: ${ROLLBACK_SQL_PATH}`);
}

main().catch(console.error);
