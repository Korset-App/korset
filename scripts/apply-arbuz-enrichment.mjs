import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', 'arbuz-enrichment-proposal-2026-09-29-arbuz-enrichment-01.jsonl');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

async function main() {
  if (!fs.existsSync(PROPOSAL_PATH)) {
    console.error('Proposal file not found:', PROPOSAL_PATH);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(PROPOSAL_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const items = [];
  for await (const line of rl) {
    if (line.trim()) {
      try { items.push(JSON.parse(line)); } catch {}
    }
  }

  console.log(`Loaded ${items.length} Arbuz enrichment proposals.`);

  let appliedCount = 0;
  let kbjuCount = 0;
  let ingCount = 0;
  let originCount = 0;
  let shelfLifeCount = 0;
  let storageCount = 0;

  const CONCURRENCY = 30;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (item) => {
        const { product_id, ean, updates, provenance } = item;
        const querySelect = product_id
          ? sb.from('global_products').select('id, specs_json').eq('id', product_id).single()
          : sb.from('global_products').select('id, specs_json').eq('ean', ean).single();

        const { data: existing } = await querySelect;

        const mergedSpecs = {
          ...(existing?.specs_json || {}),
          ...provenance
        };

        const payload = {
          ...updates,
          specs_json: mergedSpecs,
          updated_at: new Date().toISOString()
        };

        const queryUpdate = product_id
          ? sb.from('global_products').update(payload).eq('id', product_id)
          : sb.from('global_products').update(payload).eq('ean', ean);

        const { error } = await queryUpdate;

        if (!error) {
          appliedCount++;
          if (updates.nutriments_json) kbjuCount++;
          if (updates.ingredients_raw) ingCount++;
          if (updates.country_of_origin) originCount++;
          if (updates.shelf_life) shelfLifeCount++;
          if (updates.storage_conditions) storageCount++;
        } else {
          console.error(`Error updating ${ean || product_id}:`, error.message);
        }
      })
    );

    if ((i + CONCURRENCY) % 300 === 0 || i + CONCURRENCY >= items.length) {
      console.log(`[Progress ${Math.min(i + CONCURRENCY, items.length)}/${items.length}] Applied: ${appliedCount} | KBJU: +${kbjuCount} | Ing: +${ingCount} | Origin: +${originCount}`);
    }
  }

  console.log('\n================ ARBUZ ENRICHMENT APPLIED ================');
  console.log(`Total Products Successfully Updated: ${appliedCount} / ${items.length}`);
  console.log(`Attributes Added:`);
  console.log(`  Complete 4-KBJU:       +${kbjuCount}`);
  console.log(`  Ingredients:           +${ingCount}`);
  console.log(`  Country of Origin:     +${originCount}`);
  console.log(`  Shelf Life:            +${shelfLifeCount}`);
  console.log(`  Storage Conditions:    +${storageCount}`);
  console.log('==========================================================\n');
}

main().catch(console.error);
