import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MATCHES_PATH = path.join(__dirname, '..', 'scratch', 'off-dump-matches.jsonl');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

async function main() {
  if (!fs.existsSync(MATCHES_PATH)) {
    console.error('Matches file not found:', MATCHES_PATH);
    process.exit(1);
  }

  console.log('Loading matches from', MATCHES_PATH);
  const fileStream = fs.createReadStream(MATCHES_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const TARGETS_CACHE_PATH = path.join(__dirname, '..', 'scratch', 'active-food-targets.json');
  let targetsMap = null;
  if (fs.existsSync(TARGETS_CACHE_PATH)) {
    targetsMap = JSON.parse(fs.readFileSync(TARGETS_CACHE_PATH, 'utf8'));
  }

  const toApply = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const m = JSON.parse(line);
      const target = targetsMap ? (targetsMap[m.ean] || targetsMap[m.dump_ean]) : null;
      const hasKbju = target ? target.hasKbju : m.target_has_kbju;
      const hasIng = target ? target.hasIngredients : m.target_has_ingredients;
      const hasOrigin = target ? target.hasOrigin : false;
      const hasNutri = target ? target.hasNutriscore : false;
      const hasNova = target ? target.hasNova : false;

      const updates = {};

      if (!hasKbju && m.nutriments) {
        updates.nutriments_json = m.nutriments;
      }
      if (!hasIng && m.ingredients_raw && m.ingredients_raw.length > 10) {
        updates.ingredients_raw = m.ingredients_raw;
      }
      if (!hasNutri && m.nutriscore && ['A', 'B', 'C', 'D', 'E'].includes(m.nutriscore)) {
        updates.nutriscore = m.nutriscore;
      }
      if (!hasNova && m.nova_group && [1, 2, 3, 4].includes(m.nova_group)) {
        updates.nova_group = m.nova_group;
      }
      if (m.allergens && m.allergens.length > 0) {
        updates.allergens_json = m.allergens;
      }
      if (m.traces && m.traces.length > 0) {
        updates.traces_json = m.traces;
      }
      if (m.image_ingredients_url) {
        updates.image_ingredients_url = m.image_ingredients_url;
      }
      if (m.image_nutrition_url) {
        updates.image_nutrition_url = m.image_nutrition_url;
      }

      const origin = m.origins || m.countries;
      if (!hasOrigin && origin && origin.length > 1) {
        updates.country_of_origin = origin.split(',')[0].trim().replace(/^en:/i, '');
      }

      if (Object.keys(updates).length > 0) {
        toApply.push({
          product_id: m.product_id,
          ean: m.ean,
          name: m.target_name,
          specs_json: m.specs_json,
          updates,
          provenance: {
            open_food_facts_provenance: {
              source: 'open_food_facts_bulk_dump',
              scanned_at: new Date().toISOString(),
              attributes_enriched: Object.keys(updates)
            }
          }
        });
      }
    } catch {}
  }

  console.log(`Prepared ${toApply.length} products with new attributes to apply.`);

  let appliedCount = 0;
  let kbjuCount = 0;
  let ingCount = 0;
  let nutriCount = 0;
  let novaCount = 0;
  let photoIngCount = 0;
  let photoNutriCount = 0;

  // Process concurrently in chunks of 30
  const CONCURRENCY = 30;
  for (let i = 0; i < toApply.length; i += CONCURRENCY) {
    const chunk = toApply.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (item) => {
        const { product_id, ean, updates, provenance, specs_json } = item;
        let baseSpecs = specs_json;
        if (!baseSpecs && !product_id) {
          const { data: existing } = await sb
            .from('global_products')
            .select('id, specs_json')
            .eq('ean', ean)
            .single();
          baseSpecs = existing?.specs_json;
        }

        const mergedSpecs = {
          ...(baseSpecs || {}),
          ...provenance
        };

        const payload = {
          ...updates,
          specs_json: mergedSpecs,
          updated_at: new Date().toISOString()
        };

        const query = product_id
          ? sb.from('global_products').update(payload).eq('id', product_id)
          : sb.from('global_products').update(payload).eq('ean', ean);

        const { error } = await query;

        if (!error) {
          appliedCount++;
          if (updates.nutriments_json) kbjuCount++;
          if (updates.ingredients_raw) ingCount++;
          if (updates.nutriscore) nutriCount++;
          if (updates.nova_group) novaCount++;
          if (updates.image_ingredients_url) photoIngCount++;
          if (updates.image_nutrition_url) photoNutriCount++;
        } else {
          console.error(`Error updating ${ean || product_id}:`, error.message);
        }
      })
    );

    if ((i + CONCURRENCY) % 200 === 0 || i + CONCURRENCY >= toApply.length) {
      console.log(`[Progress ${Math.min(i + CONCURRENCY, toApply.length)}/${toApply.length}] Applied: ${appliedCount} | KBJU: +${kbjuCount} | Ing: +${ingCount} | Nutri: +${nutriCount}`);
    }
  }

  console.log('\n================ MASS ENRICHMENT APPLIED ================');
  console.log(`Total Products Successfully Updated: ${appliedCount} / ${toApply.length}`);
  console.log(`Attributes Added:`);
  console.log(`  Complete 4-KBJU:       +${kbjuCount}`);
  console.log(`  Ingredients:           +${ingCount}`);
  console.log(`  Nutri-Score:           +${nutriCount}`);
  console.log(`  Nova Group:            +${novaCount}`);
  console.log(`  Ingredients Photos:    +${photoIngCount}`);
  console.log(`  Nutrition Photos:      +${photoNutriCount}`);
  console.log('=========================================================\n');
}

main().catch(console.error);
