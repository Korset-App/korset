/**
 * sync-galmart-to-global.mjs
 * Syncs updated fields from clean_products_v2 → global_products
 * for the 976 rows just enriched from Galmart.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Fetching clean_products_v2 with description or storage just enriched...');

// Get all clean products that have a description or storage_conditions or producer
// and sync to global_products
const PAGE = 1000;
let offset = 0;
let synced = 0;

while (true) {
  const { data } = await supabase
    .from('clean_products_v2')
    .select('ean, description, storage_conditions, country_of_origin, producer_name, nutriments_json')
    .not('description', 'is', null)
    .range(offset, offset + PAGE - 1);

  if (!data || data.length === 0) break;

  const CONCURRENCY = 20;
  for (let i = 0; i < data.length; i += CONCURRENCY) {
    const chunk = data.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async row => {
      const fields = {};
      if (row.description) fields.description = row.description;
      if (row.storage_conditions) fields.storage_conditions = row.storage_conditions;
      if (row.country_of_origin) fields.country_of_origin = row.country_of_origin;
      if (row.producer_name) fields.producer_name = row.producer_name;
      if (row.nutriments_json) fields.nutriments_json = row.nutriments_json;
      if (!Object.keys(fields).length) return;
      await supabase.from('global_products').update(fields).eq('barcode', row.ean);
    }));
    synced += chunk.length;
    if (i % 200 === 0) process.stdout.write(`\rSynced ${synced}...`);
  }

  if (data.length < PAGE) break;
  offset += PAGE;
}

console.log(`\nSync to global_products done. Rows processed: ${synced}`);
