import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const envLines = env.split('\n');
const supabaseUrl = envLines.find(l => l.startsWith('SUPABASE_URL=')).split('=')[1].trim();
const supabaseKey = envLines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const productsData = JSON.parse(fs.readFileSync('./src/data/products.json'));

async function sync() {
  console.log('Syncing', productsData.length, 'products to Global Products...');
  
  for (const p of productsData) {
    const globalRow = {
      ean: p.ean,
      name: p.name,
      category: p.category || '',
      subcategory: p.group || '',
      halal_status: p.halalStatus || 'unknown',
      data_quality_score: p.qualityScore || 0,
      allergens_json: p.allergens || [],
      diet_tags_json: p.dietTags || [],
      nutriments_json: p.nutriments || {},
      ingredients_raw: p.ingredients_raw || ''
    };

    const { data: insertedProduct, error: insertError } = await supabase
      .from('global_products')
      .upsert(globalRow, { onConflict: 'ean' })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error upserting global_product for ean:', p.ean, insertError);
      continue;
    }

    // Now insert mapping for Магазин 1 (DARA)
    const storeId = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4';
    
    // We only insert if it's missing (price is random for now, stock_status is in_stock)
    // To do DO NOTHING on conflict using JS, upsert with store_id and global_product_id if we had them as composite primary key.
    // The table store_products has primary_keys=["id"] and unique constraints might not be on (store_id, global_product_id).
    // Let's check if it exists first.
    const { data: existingMap, error: mapQueryErr } = await supabase
      .from('store_products')
      .select('id')
      .eq('store_id', storeId)
      .eq('global_product_id', insertedProduct.id)
      .single();
      
    if (!existingMap) {
       const mappedRow = {
         store_id: storeId,
         global_product_id: insertedProduct.id,
         ean: p.ean,
         price_kzt: Math.floor(500 + Math.random() * 2000),
         stock_status: 'in_stock'
       };
       const { error: mapInsertErr } = await supabase
         .from('store_products')
         .insert(mappedRow);
         
       if (mapInsertErr) {
         console.error('Error inserting store mapping for:', p.ean, mapInsertErr);
       }
    }
  }
  
  console.log('✅ Done syncing products directly to Supabase DB.');
}

sync().catch(console.error);
