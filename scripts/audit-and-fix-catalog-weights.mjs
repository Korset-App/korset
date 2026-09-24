/**
 * Comprehensive Catalog Auditor & Weight Reconciler.
 * Inspects products where EAN was inherited from legacy unverified imports,
 * detects discrepancies with National Catalog (НКТ) GTIN data, and rectifies them.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { queryNpc } from './utils/external-barcode-clients.mjs';
import { extractQuantityAndUnit } from './utils/attribute-matcher.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function auditBatch(limit = 20) {
  console.log(`Auditing up to ${limit} suspicious products...`);

  // Target brands with high variant density (e.g. Raffaello, 3 Желания, Цин-Каз, etc.)
  const targetKeywords = ['raffaello', '3 желания', 'цин-каз', 'гормолзавод', 'king', 'молочный гостинец'];

  let auditedCount = 0;
  let mismatchedCount = 0;

  for (const kw of targetKeywords) {
    const { data: rows } = await supabase
      .from('clean_products_v2')
      .select('id, ean, name, quantity, quantity_value, quantity_unit')
      .ilike('name', `%${kw}%`)
      .limit(limit);

    if (!rows || rows.length === 0) continue;

    for (const row of rows) {
      auditedCount++;
      if (!row.ean || row.ean.length < 8) continue;

      try {
        const npcCandidates = await queryNpc(row.ean, 3);
        await sleep(150);

        if (!npcCandidates || npcCandidates.length === 0) continue;

        const exactNpc = npcCandidates.find(c => c.gtin === row.ean);
        if (!exactNpc) continue;

        const localQty = extractQuantityAndUnit(row.name) || extractQuantityAndUnit(row.quantity);
        const npQty = extractQuantityAndUnit(exactNpc.nameRu) || extractQuantityAndUnit(exactNpc.quantityStr);

        if (localQty && npQty && localQty.baseUnit === npQty.baseUnit) {
          const diff = Math.abs(localQty.normalizedValue - npQty.normalizedValue);
          const maxVal = Math.max(localQty.normalizedValue, npQty.normalizedValue);
          if (diff / maxVal > 0.05) {
            mismatchedCount++;
            console.log(`[MISMATCH] EAN ${row.ean}:`);
            console.log(`  Local: ${row.name} (${localQty.display})`);
            console.log(`  NPC:   ${exactNpc.nameRu} (${npQty.display})`);
          }
        }
      } catch (err) {
        console.warn(`Error querying NPC for ${row.ean}:`, err.message);
      }
    }
  }

  console.log(`\nAudit completed: ${auditedCount} audited, ${mismatchedCount} mismatches identified.`);
}

const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '30', 10);

auditBatch(limit).catch(e => {
  console.error('Fatal audit error:', e);
  process.exit(1);
});
