import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use SERVICE_ROLE key to bypass RLS restrictions!
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: products, error: fetchError } = await supabase
    .from('global_products')
    .select('id, name, category, subcategory')
    .eq('category', 'snacks')
    .eq('subcategory', 'seeds');

  if (fetchError) {
    console.error('Error fetching seeds:', fetchError);
    return;
  }

  let corrected = 0;
  for (const p of products) {
    const name = p.name.toLowerCase();
    
    if (
      name.includes('арахис') ||
      name.includes('фисташ') ||
      name.includes('орех') ||
      name.includes('миндал') ||
      name.includes('кешью') ||
      name.includes('фундук')
    ) {
      console.log(`[Nuts] Reclassifying "${p.name}" back to "nuts"`);
      const { error } = await supabase.from('global_products').update({ subcategory: 'nuts' }).eq('id', p.id);
      if (error) console.error(`Error reclassifying:`, error);
      corrected++;
    } else if (
      name.includes('анчоус') ||
      name.includes('рыбк') ||
      name.includes('кальмар') ||
      name.includes('тушк') ||
      name.includes('рыбн')
    ) {
      console.log(`[Fish Sn.] Reclassifying "${p.name}" back to "fish_snacks"`);
      const { error } = await supabase.from('global_products').update({ subcategory: 'fish_snacks' }).eq('id', p.id);
      if (error) console.error(`Error reclassifying:`, error);
      corrected++;
    } else if (
      name.includes('сухар') ||
      name.includes('гренки') ||
      name.includes('крутон') ||
      name.includes('averton')
    ) {
      console.log(`[Crackers] Reclassifying "${p.name}" back to "crackers"`);
      const { error } = await supabase.from('global_products').update({ subcategory: 'crackers' }).eq('id', p.id);
      if (error) console.error(`Error reclassifying:`, error);
      corrected++;
    } else if (name.includes('чипсы') || name.includes('lays') || name.includes('lay’s')) {
      console.log(`[Chips] Reclassifying "${p.name}" back to "chips"`);
      const { error } = await supabase.from('global_products').update({ subcategory: 'chips' }).eq('id', p.id);
      if (error) console.error(`Error reclassifying:`, error);
      corrected++;
    }
  }

  console.log(`Perfect cleanup complete! Corrected ${corrected} products.`);
}

run();
