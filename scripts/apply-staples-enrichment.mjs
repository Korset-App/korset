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

const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', 'staples-enrichment-proposal-2026-09-29.jsonl');

async function main() {
  console.log(`=== Applying Staples Enrichment Batch (324 products) ===\n`);

  if (!fs.existsSync(PROPOSAL_PATH)) {
    console.error(`Proposal file not found at ${PROPOSAL_PATH}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(PROPOSAL_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const items = lines.map(JSON.parse);
  console.log(`Loaded ${items.length} proposals to apply.`);

  // First, fetch current specs_json for these EANs in chunks of 50 to merge safely
  console.log('Fetching current specs for target items...');
  const currentSpecsMap = new Map();
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50).map(x => x.ean);
    const { data, error } = await sb
      .from('global_products')
      .select('ean, specs_json')
      .in('ean', chunk);

    if (error) {
      console.error(`Error fetching specs for chunk ${i}:`, error.message);
    } else {
      data.forEach(d => currentSpecsMap.set(d.ean, d.specs_json || {}));
    }
  }

  const concurrency = 10;
  let idx = 0;
  let success = 0;
  let errors = 0;

  const startTime = Date.now();

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const item = items[i];

      const currentSpecs = currentSpecsMap.get(item.ean) || {};
      const mergedSpecs = {
        ...currentSpecs,
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
            .eq('id', item.id);

          if (!error) {
            success++;
            done = true;
            break;
          } else {
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (e) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (!done) {
        errors++;
        console.error(`[ERROR] Failed to update ${item.ean} (${item.name})`);
      }

      if ((i + 1) % 50 === 0 || i === items.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Progress: ${i + 1}/${items.length} (${success} success, ${errors} errors, ${elapsed}s)`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log(`\n=== Staples Enrichment Finished ===`);
  console.log(`Successfully applied: ${success}/${items.length}`);
  console.log(`Errors: ${errors}`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch(console.error);
