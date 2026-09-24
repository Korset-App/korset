import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncV3ToGlobal() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   SYNCING CATALOG V3 (18,065 SKUs) TO PRODUCTION GLOBAL_PRODUCTS ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Step 1: Read all rows from clean_products_v3
  console.log('--- Step 1: Fetching all rows from clean_products_v3 ---');
  let v3Rows = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('clean_products_v3')
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching v3 chunk:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    v3Rows.push(...data);
    process.stdout.write(`\rLoaded ${v3Rows.length} rows from clean_products_v3...`);
    from += PAGE_SIZE;
  }
  console.log(`\nTotal rows retrieved from clean_products_v3: ${v3Rows.length}\n`);

  if (v3Rows.length === 0) {
    console.error('clean_products_v3 is empty! Aborting.');
    return;
  }

  // Step 2: Prepare batch upsert payload for global_products
  console.log('--- Step 2: Upserting into global_products in batches of 50 ---');
  const BATCH_SIZE = 50;
  let upsertedCount = 0;
  let errorCount = 0;

  for (let idx = 0; idx < v3Rows.length; idx += BATCH_SIZE) {
    const chunk = v3Rows.slice(idx, idx + BATCH_SIZE);
    const payload = chunk.map(item => {
      // Map halal_status to check constraint ('yes' | 'no' | 'unknown')
      let mappedHalal = 'unknown';
      if (item.halal_status === 'certified') mappedHalal = 'yes';
      else if (item.halal_status === 'non_halal') mappedHalal = 'no';

      // Map packaging_type to check constraint ('bottle_plastic' | 'bottle_glass' | 'can' | 'tetrapak' | 'pouch' | 'tub' | null)
      let mappedPackaging = null;
      const pt = String(item.package_type || '').toLowerCase();
      if (pt.includes('бутылк') || pt.includes('пэт') || pt.includes('пет')) mappedPackaging = 'bottle_plastic';
      else if (pt.includes('пакет') || pt.includes('дой-пак') || pt.includes('дойпак') || pt.includes('флоу')) mappedPackaging = 'pouch';
      else if (pt.includes('тетра')) mappedPackaging = 'tetrapak';
      else if (pt.includes('стакан')) mappedPackaging = 'tub';
      else if (pt.includes('банк')) mappedPackaging = 'can';

      let fatVal = null;
      if (item.fat_percent != null) {
        const num = parseFloat(item.fat_percent);
        if (!isNaN(num) && num >= 0 && num <= 100) fatVal = num;
      }

      return {
        ean: item.ean.trim(),
        name: item.name,
        name_kz: item.name_kz || null,
        brand: item.brand || null,
        category: item.category || 'grocery',
        subcategory: item.subcategory || null,
        quantity: item.quantity || null,
        packaging_type: mappedPackaging,
        fat_percent: fatVal,
        image_url: item.image_url || null,
        images: item.images_json || (item.image_url ? [item.image_url] : []),
        ingredients_raw: item.ingredients_raw || null,
        nutriments_json: item.nutriments_json || {},
        allergens_json: item.allergens_json || [],
        halal_status: mappedHalal,
        halal_certifier: item.halal_certifier || null,
        cooking_instructions: item.cooking_instructions || null,
        storage_conditions: item.storage_conditions || null,
        shelf_life: item.shelf_life || null,
        manufacturer: item.producer_name || null,
        country_of_origin: item.country_of_origin || null,
        data_quality_score: Math.min(100, Math.max(0, item.data_quality_score || 80)),
        is_active: true,
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase
      .from('global_products')
      .upsert(payload, { onConflict: 'ean' });

    if (error) {
      console.error(`\nUpsert error at batch ${idx}:`, error.message);
      errorCount += chunk.length;
    } else {
      upsertedCount += chunk.length;
      process.stdout.write(`\r[global_products Upsert] ${upsertedCount}/${v3Rows.length} saved`);
    }
  }

  console.log(`\n\nUpsert finished! Saved: ${upsertedCount}, Errors: ${errorCount}`);

  // Step 3: Re-link store_products
  console.log('\n--- Step 3: Re-linking store_products to updated global_products ---');
  // Check store_products with unmatched or missing links
  const { data: unlinkedStoreProducts } = await supabase
    .from('store_products')
    .select('id, ean, global_product_id')
    .is('global_product_id', null)
    .limit(1000);

  if (unlinkedStoreProducts && unlinkedStoreProducts.length > 0) {
    console.log(`Found ${unlinkedStoreProducts.length} unlinked store products. Resolving...`);
    let reLinked = 0;
    for (const sp of unlinkedStoreProducts) {
      const { data: gp } = await supabase
        .from('global_products')
        .select('id')
        .eq('ean', sp.ean.trim())
        .maybeSingle();

      if (gp) {
        await supabase
          .from('store_products')
          .update({ global_product_id: gp.id })
          .eq('id', sp.id);
        reLinked++;
      }
    }
    console.log(`Successfully linked ${reLinked} store products.`);
  } else {
    console.log('All store_products already have active global_product_id links.');
  }

  // Step 4: Verification of global_products
  const { count: finalCount } = await supabase
    .from('global_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log(`\n===============================================================`);
  console.log(`  FINAL VERIFICATION:`);
  console.log(`  Total Active Products in global_products: ${finalCount}`);
  console.log(`===============================================================\n`);
}

syncV3ToGlobal().catch(console.error);
