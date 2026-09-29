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

const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', 'text-nutrition-enrichment-proposal-2026-09-29.jsonl');

async function main() {
  console.log('=== Applying Text Nutrition Enrichment (68 items) ===\n');

  if (!fs.existsSync(PROPOSAL_PATH)) {
    console.error(`Proposal file not found at ${PROPOSAL_PATH}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(PROPOSAL_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const items = lines.map(JSON.parse);
  console.log(`Loaded ${items.length} proposals to apply.`);

  // Fetch current specs for these items
  const eans = items.map(x => x.ean);
  const currentSpecsMap = new Map();
  for (let i = 0; i < eans.length; i += 50) {
    const chunk = eans.slice(i, i + 50);
    const { data, error } = await sb
      .from('global_products')
      .select('ean, specs_json')
      .in('ean', chunk);

    if (error) {
      console.error(`Error fetching specs:`, error.message);
    } else {
      data.forEach(d => currentSpecsMap.set(d.ean, d.specs_json || {}));
    }
  }

  const concurrency = 5;
  let idx = 0;
  let success = 0;
  let errors = 0;

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
            .eq('ean', item.ean);

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
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log(`\n=== Text Nutrition Enrichment Finished ===`);
  console.log(`Successfully applied: ${success}/${items.length}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
