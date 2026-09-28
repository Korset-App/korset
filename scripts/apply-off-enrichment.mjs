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

const args = process.argv.slice(2);
const proposalArg = args.find(a => a.startsWith('--proposal='));
const PROPOSAL_PATH = proposalArg ? proposalArg.split('=')[1] : path.join(__dirname, '..', 'scratch', 'off-enrichment-proposal-2026-09-28-off-enrichment-02.jsonl');

async function main() {
  console.log(`=== Applying Open Food Facts Enrichment: ${path.basename(PROPOSAL_PATH)} ===`);

  if (!fs.existsSync(PROPOSAL_PATH)) {
    console.error('Proposal file not found:', PROPOSAL_PATH);
    process.exit(1);
  }

  const lines = fs.readFileSync(PROPOSAL_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const items = lines.map(JSON.parse);
  console.log(`Loaded ${items.length} proposed product enrichments.`);

  let appliedCount = 0;
  let kbjuCount = 0;
  let nutriscoreCount = 0;
  let novaCount = 0;
  let allergenCount = 0;
  let additiveCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { ean, updates, provenance } = item;

    // Fetch existing product specs_json to safely merge provenance
    const { data: existing, error: fetchErr } = await sb
      .from('global_products')
      .select('id, ean, specs_json')
      .eq('ean', ean)
      .single();

    if (fetchErr || !existing) {
      console.warn(`[WARN] Product ${ean} not found in database:`, fetchErr?.message);
      continue;
    }

    const mergedSpecs = {
      ...(existing.specs_json || {}),
      ...provenance
    };

    const payload = {
      ...updates,
      specs_json: mergedSpecs,
      updated_at: new Date().toISOString()
    };

    const { error: updateErr } = await sb
      .from('global_products')
      .update(payload)
      .eq('ean', ean);

    if (updateErr) {
      console.error(`[ERROR] Failed to update ${ean}:`, updateErr.message);
    } else {
      appliedCount++;
      if (updates.nutriments_json) kbjuCount++;
      if (updates.nutriscore) nutriscoreCount++;
      if (updates.nova_group) novaCount++;
      if (updates.allergens_json) allergenCount++;
      if (updates.additives_tags_json) additiveCount++;
      console.log(`[OK ${appliedCount}/${items.length}] ${ean} | ${item.target_name.slice(0, 35)}: ${Object.keys(updates).join(', ')}`);
    }
  }

  console.log('\n================ ENRICHMENT APPLIED ================');
  console.log(`Total Products Successfully Updated: ${appliedCount} / ${items.length}`);
  console.log(`Attributes Added:`);
  console.log(`  Complete 4-KBJU:       +${kbjuCount}`);
  console.log(`  Nutri-Score:           +${nutriscoreCount}`);
  console.log(`  Nova Group:            +${novaCount}`);
  console.log(`  Allergens:             +${allergenCount}`);
  console.log(`  Additives:             +${additiveCount}`);
  console.log('====================================================');
}

main().catch(console.error);
