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

const PROPOSALS_PATH = path.join(__dirname, '..', 'scratch', 'korzina-proposals.jsonl');

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
  console.log('=== Applying Korzina v Dom Specifications Enrichment ===\n');

  if (!fs.existsSync(PROPOSALS_PATH)) {
    console.error(`Proposals not found: ${PROPOSALS_PATH}`);
    process.exit(1);
  }

  const allProposals = fs.readFileSync(PROPOSALS_PATH, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);

  console.log(`Loaded ${allProposals.length} proposals from ${PROPOSALS_PATH}`);

  // Fetch current DB state for these targets in chunks of 50
  console.log('Fetching current DB rows by ID...');
  const currentDbMap = new Map();
  for (let i = 0; i < allProposals.length; i += 50) {
    const chunkIds = allProposals.slice(i, i + 50).map(x => x.targetId);
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, name, nutriments_json, ingredients_raw, shelf_life, storage_conditions, country_of_origin, specs_json')
      .in('id', chunkIds);

    if (error) {
      console.error(`Error fetching chunk at ${i}:`, error.message);
      continue;
    }
    for (const r of data) currentDbMap.set(r.id, r);
  }
  console.log(`Fetched ${currentDbMap.size} existing rows from database.`);

  const runId = '2026-09-30-korzina-specs-01';
  const concurrency = 15;
  let idx = 0;
  let successCount = 0;
  let errorCount = 0;
  let kbjuAdded = 0;
  let ingrAdded = 0;
  let shelfAdded = 0;
  let storageAdded = 0;
  let countryAdded = 0;

  const startTime = Date.now();

  async function worker() {
    while (idx < allProposals.length) {
      const i = idx++;
      const p = allProposals[i];
      const existing = currentDbMap.get(p.targetId);
      if (!existing) continue;

      const updates = {};
      const enrichedFields = [];

      // 1. KBJU
      if (p.enrichments.nutriments) {
        const en = existing.nutriments_json;
        const hasExistingKbju = en && en.energy_kcal != null && en.protein_100g != null;
        if (!hasExistingKbju) {
          const n = p.enrichments.nutriments;
          if (isValidKbju(n.energy_kcal, n.protein_100g, n.fat_100g, n.carbohydrates_100g)) {
            updates.nutriments_json = n;
            enrichedFields.push('nutriments_json');
            kbjuAdded++;
          }
        }
      }

      // 2. Ingredients
      if (p.enrichments.ingredients && (!existing.ingredients_raw || existing.ingredients_raw.trim().length === 0)) {
        updates.ingredients_raw = p.enrichments.ingredients.trim();
        enrichedFields.push('ingredients_raw');
        ingrAdded++;
      }

      // 3. Shelf Life
      if (p.enrichments.shelf_life && (!existing.shelf_life || existing.shelf_life.trim().length === 0)) {
        updates.shelf_life = p.enrichments.shelf_life.trim();
        enrichedFields.push('shelf_life');
        shelfAdded++;
      }

      // 4. Storage Conditions
      if (p.enrichments.storage_conditions && (!existing.storage_conditions || existing.storage_conditions.trim().length === 0)) {
        updates.storage_conditions = p.enrichments.storage_conditions.trim();
        enrichedFields.push('storage_conditions');
        storageAdded++;
      }

      // 5. Country of origin
      if (p.country && (!existing.country_of_origin || existing.country_of_origin.trim().length === 0)) {
        updates.country_of_origin = p.country;
        enrichedFields.push('country_of_origin');
        countryAdded++;
      }

      // If nothing new, skip
      if (enrichedFields.length === 0) continue;

      const currentSpecs = existing.specs_json || {};
      const provenance = {
        source: 'korzinavdom_catalog_full',
        donor_id: p.donorId,
        donor_name: p.donorName,
        donor_brand: p.donorBrand,
        run_id: runId,
        score: p.score,
        applied_at: new Date().toISOString(),
        attributes_enriched: enrichedFields
      };

      updates.specs_json = {
        ...currentSpecs,
        korzina_catalog_provenance: provenance
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
            await new Promise(r => setTimeout(r, 400));
          }
        } catch (err) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      if (!success) {
        errorCount++;
        console.error(`[ERROR] Failed to update product ID ${p.targetId} (${p.targetName})`);
      }

      if ((i + 1) % 100 === 0 || i === allProposals.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Progress: ${i + 1}/${allProposals.length} (${successCount} updated, ${errorCount} errors, ${elapsed}s)`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log(`\n=== Korzina Enrichment Finished ===`);
  console.log(`Successfully Updated: ${successCount} products`);
  console.log(`Errors: ${errorCount}`);
  console.log(`4-KBJU Added: +${kbjuAdded}`);
  console.log(`Ingredients Added: +${ingrAdded}`);
  console.log(`Shelf Life Added: +${shelfAdded}`);
  console.log(`Storage Conditions Added: +${storageAdded}`);
  console.log(`Country Added: +${countryAdded}`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch(console.error);
