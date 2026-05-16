import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('global_products')
    .select('name, brand, category, subcategory')
    .eq('category', 'snacks')
    .eq('subcategory', 'seeds');

  if (error) {
    console.error('Error fetching global_products:', error);
    return;
  }

  console.log(`=== FINAL PRODUCTS IN snacks / seeds (${data.length} found) ===`);
  data.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.name} [${p.brand || 'No Brand'}]`);
  });
}

run();
