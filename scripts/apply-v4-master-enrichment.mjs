import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', 'v4-master-enrichment-proposal-2026-09-29-v4-master-01.jsonl');

async function main() {
  console.log(`=== Applying V4 Master Catalog Enrichment to Supabase ===`);

  if (!fs.existsSync(PROPOSAL_PATH)) {
    console.error(`Proposal file not found: ${PROPOSAL_PATH}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(PROPOSAL_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const items = lines.map(JSON.parse);
  console.log(`Loaded ${items.length} proposed product enrichments from ${path.basename(PROPOSAL_PATH)}`);

  console.log(`\nStep 1: Pre-fetching existing specs_json to safely merge provenance...`);
  const specsMap = new Map();
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('ean, specs_json')
      .eq('is_active', true)
      .not('category', 'in', '(household,personal_care)')
      .not('image_url', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Failed to pre-fetch specs_json:', error.message);
      process.exit(1);
    }
    for (const d of data) {
      if (d.ean) specsMap.set(d.ean, d.specs_json || {});
    }
    if (data.length < pageSize) break;
    page++;
  }
  console.log(`Pre-fetched specs_json for ${specsMap.size} products.`);

  console.log(`\nStep 2: Applying updates with concurrency 35...`);
  const t0 = Date.now();
  const concurrency = 35;
  let idx = 0;
  let successCount = 0;
  let errorCount = 0;

  let kbjuCount = 0;
  let ingCount = 0;
  let shelfLifeCount = 0;
  let storageCount = 0;
  let originCount = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const item = items[i];
      const existingSpecs = specsMap.get(item.ean) || {};
      const mergedSpecs = {
        ...existingSpecs,
        ...item.provenance
      };

      const payload = {
        ...item.updates,
        specs_json: mergedSpecs,
        updated_at: new Date().toISOString()
      };

      const { error } = await sb
        .from('global_products')
        .update(payload)
        .eq('ean', item.ean);

      if (error) {
        errorCount++;
        console.error(`[ERROR] ${item.ean}:`, error.message);
      } else {
        successCount++;
        if (item.updates.nutriments_json) kbjuCount++;
        if (item.updates.ingredients_raw) ingCount++;
        if (item.updates.shelf_life) shelfLifeCount++;
        if (item.updates.storage_conditions) storageCount++;
        if (item.updates.country_of_origin) originCount++;
      }

      if (successCount % 250 === 0 && successCount > 0) {
        const elapsed = Math.round((Date.now() - t0) / 1000);
        const rate = Math.round(successCount / (elapsed || 1));
        console.log(`[PROGRESS] ${successCount}/${items.length} updated (${rate} items/sec, elapsed: ${elapsed}s) | KBJU: +${kbjuCount}, Ing: +${ingCount}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  const totalElapsed = Math.round((Date.now() - t0) / 1000);

  console.log(`\n================ V4 ENRICHMENT APPLIED ================`);
  console.log(`Total Products Successfully Updated: ${successCount} / ${items.length} in ${totalElapsed}s`);
  console.log(`Failed / Errors:                     ${errorCount}`);
  console.log(`Attributes Added to Database:`);
  console.log(`  Complete 4-KBJU:                   +${kbjuCount}`);
  console.log(`  Raw Ingredients:                   +${ingCount}`);
  console.log(`  Shelf Life:                        +${shelfLifeCount}`);
  console.log(`  Storage Conditions:                +${storageCount}`);
  console.log(`  Country of Origin:                 +${originCount}`);
  console.log(`=======================================================`);
}

main().catch(console.error);
