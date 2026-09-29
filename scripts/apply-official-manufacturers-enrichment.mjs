import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

const PROPOSALS_PATH = path.join(__dirname, '..', 'scratch', 'manufacturers-proposals.jsonl');

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

async function main() {
  console.log('=== Applying Official Kazakhstan & CIS Manufacturer Enrichments ===\n');

  if (!fs.existsSync(PROPOSALS_PATH)) {
    console.error(`Proposals not found: ${PROPOSALS_PATH}`);
    process.exit(1);
  }

  const allProposals = fs.readFileSync(PROPOSALS_PATH, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);

  const actionable = allProposals.filter(p =>
    p.enrichments.nutriments ||
    p.enrichments.ingredients ||
    p.enrichments.shelf_life ||
    p.enrichments.storage_conditions ||
    p.enrichments.activate
  );

  console.log(`Loaded ${allProposals.length} total proposals, ${actionable.length} actionable with new data.`);

  // Fetch current DB state for these IDs
  console.log('Fetching current DB rows by ID...');
  const currentDbMap = new Map();
  const chunkIds = [];
  for (let i = 0; i < actionable.length; i += 50) {
    chunkIds.push(actionable.slice(i, i + 50).map(x => x.targetId));
  }

  for (let i = 0; i < chunkIds.length; i++) {
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, name, is_active, image_url, nutriments_json, ingredients_raw, shelf_life, storage_conditions, country_of_origin, specs_json')
      .in('id', chunkIds[i]);

    if (error) {
      console.error(`Error fetching chunk ${i}:`, error.message);
      continue;
    }
    for (const r of data) currentDbMap.set(r.id, r);
  }
  console.log(`Fetched ${currentDbMap.size} existing rows from database.`);

  const runId = '2026-09-30-manufacturer-official-02';
  const concurrency = 10;
  let idx = 0;
  let successCount = 0;
  let errorCount = 0;
  let resurrectedCount = 0;
  let kbjuAddedCount = 0;
  let ingrAddedCount = 0;
  let shelfAddedCount = 0;
  let storageAddedCount = 0;

  const startTime = Date.now();

  async function worker() {
    while (idx < actionable.length) {
      const i = idx++;
      const p = actionable[i];
      const existing = currentDbMap.get(p.targetId);
      if (!existing) continue;

      const updates = {};
      const enrichedFields = [];

      // 1. 4-KBJU (only if existing lacks complete KBJU)
      if (p.enrichments.nutriments) {
        const en = existing.nutriments_json;
        const hasExistingKbju = en && en.energy_kcal != null && en.protein_100g != null;
        if (!hasExistingKbju) {
          const n = p.enrichments.nutriments;
          const cal = n.energy_kcal ?? n.calories;
          const prot = n.protein_100g ?? n.protein;
          const fat = n.fat_100g ?? n.fat;
          const carb = n.carbohydrates_100g ?? n.carbs;
          if (isValidKbju(cal, prot, fat, carb)) {
            updates.nutriments_json = {
              energy_kcal: Number(cal),
              protein_100g: Number(prot),
              fat_100g: Number(fat),
              carbohydrates_100g: Number(carb)
            };
            enrichedFields.push('nutriments_json');
            kbjuAddedCount++;
          }
        }
      }

      // 2. Ingredients (only if existing lacks ingredients)
      if (p.enrichments.ingredients && (!existing.ingredients_raw || existing.ingredients_raw.trim().length === 0)) {
        updates.ingredients_raw = p.enrichments.ingredients.trim();
        enrichedFields.push('ingredients_raw');
        ingrAddedCount++;
      }

      // 3. Shelf life
      if (p.enrichments.shelf_life && (!existing.shelf_life || existing.shelf_life.trim().length === 0)) {
        updates.shelf_life = p.enrichments.shelf_life.trim();
        enrichedFields.push('shelf_life');
        shelfAddedCount++;
      }

      // 4. Storage conditions
      if (p.enrichments.storage_conditions && (!existing.storage_conditions || existing.storage_conditions.trim().length === 0)) {
        updates.storage_conditions = p.enrichments.storage_conditions.trim();
        enrichedFields.push('storage_conditions');
        storageAddedCount++;
      }

      // 5. Country of origin
      if (p.country && (!existing.country_of_origin || existing.country_of_origin.trim().length === 0)) {
        updates.country_of_origin = p.country;
        enrichedFields.push('country_of_origin');
      }

      // 6. Resurrect with Image
      if (p.enrichments.activate && p.enrichments.image_url && (!existing.image_url || existing.image_url.trim().length === 0)) {
        updates.image_url = p.enrichments.image_url;
        updates.is_active = true;
        enrichedFields.push('image_url');
        enrichedFields.push('is_active');
        resurrectedCount++;
      }

      // If nothing new to enrich, skip
      if (enrichedFields.length === 0) continue;

      const currentSpecs = existing.specs_json || {};
      const provenance = {
        source: p.donorSource,
        brand: p.donorBrand,
        donor_name: p.donorName,
        donor_url: p.donorUrl,
        run_id: runId,
        score: p.score,
        applied_at: new Date().toISOString(),
        activated: !!updates.is_active,
        attributes_enriched: enrichedFields
      };

      updates.specs_json = {
        ...currentSpecs,
        official_manufacturer_provenance: provenance
      };
      updates.updated_at = new Date().toISOString();

      let success = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { error } = await sb
            .from('global_products')
            .update(updates)
            .eq('id', p.targetId);

          if (!error) {
            success = true;
            successCount++;
            break;
          } else {
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (err) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (!success) {
        errorCount++;
        console.error(`[ERROR] Failed to update product ID ${p.targetId} (${p.targetName})`);
      }

      if ((i + 1) % 50 === 0 || i === actionable.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Progress: ${i + 1}/${actionable.length} (${successCount} updated, ${errorCount} errors, ${elapsed}s)`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log(`\n=== Manufacturer Enrichment Complete ===`);
  console.log(`Successfully Updated: ${successCount} products`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Resurrected & Activated: +${resurrectedCount} products`);
  console.log(`4-KBJU Added: +${kbjuAddedCount}`);
  console.log(`Ingredients Added: +${ingrAddedCount}`);
  console.log(`Shelf Life Added: +${shelfAddedCount}`);
  console.log(`Storage Conditions Added: +${storageAddedCount}`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch(console.error);
