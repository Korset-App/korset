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
  console.log(`=== Retrying Failed Items from V4 Master Enrichment ===`);

  const lines = fs.readFileSync(PROPOSAL_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const items = lines.map(JSON.parse);
  const itemMap = new Map();
  items.forEach(i => itemMap.set(i.ean, i));

  console.log(`Checking which of ${items.length} items still need update in Supabase...`);

  // Query Supabase by indexed EAN chunks (100 at a time)
  const allEans = Array.from(itemMap.keys());
  const missingEans = [];
  const chunkSize = 100;

  for (let i = 0; i < allEans.length; i += chunkSize) {
    const chunk = allEans.slice(i, i + chunkSize);
    const { data, error } = await sb
      .from('global_products')
      .select('ean, specs_json')
      .in('ean', chunk);

    if (error) {
      console.error(`Error fetching chunk ${i}-${i + chunkSize}:`, error.message);
      continue;
    }

    for (const d of data) {
      if (!d.specs_json || !d.specs_json.v4_master_provenance) {
        missingEans.push({ ean: d.ean, existingSpecs: d.specs_json || {} });
      }
    }
  }

  console.log(`Found ${missingEans.length} items that still need update.`);

  if (missingEans.length === 0) {
    console.log('All items are already successfully updated!');
    return;
  }

  // Update with gentle concurrency 2
  const concurrency = 2;
  let idx = 0;
  let success = 0;
  let errors = 0;

  async function worker() {
    while (idx < missingEans.length) {
      const i = idx++;
      const { ean, existingSpecs } = missingEans[i];
      const item = itemMap.get(ean);

      const mergedSpecs = {
        ...existingSpecs,
        ...item.provenance
      };

      const payload = {
        ...item.updates,
        specs_json: mergedSpecs,
        updated_at: new Date().toISOString()
      };

      let done = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { error } = await sb
            .from('global_products')
            .update(payload)
            .eq('ean', ean);

          if (!error) {
            success++;
            done = true;
            break;
          } else {
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (e) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      if (!done) {
        errors++;
        console.error(`[FINAL-FAIL] ${ean}`);
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`\nRetry finished: ${success} updated, ${errors} errors.`);
}

main().catch(console.error);
