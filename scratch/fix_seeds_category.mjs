import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use SERVICE_ROLE key to bypass RLS restrictions!
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const keywords = [
  'семеч',
  'семен',
  'подсолнух',
  'тыквен',
  'чиа',
  'лен',
  'льна',
  'кунжут'
];

async function run() {
  const { data: products, error: fetchError } = await supabase
    .from('global_products')
    .select('id, name, category, subcategory')
    .eq('category', 'snacks')
    .eq('subcategory', 'dried_fruits');

  if (fetchError) {
    console.error('Error fetching dried_fruits:', fetchError);
    return;
  }

  const toFix = [];
  for (const p of products) {
    const lowerName = p.name.toLowerCase();
    const matches = keywords.some(k => lowerName.includes(k));
    if (matches) {
      toFix.push(p);
    }
  }

  console.log(`Found ${toFix.length} misclassified seeds in dried_fruits.`);

  let updatedCount = 0;
  for (const p of toFix) {
    console.log(`Fixing: "${p.name}" to subcategory "seeds"`);
    const { error: updateError } = await supabase
      .from('global_products')
      .update({ subcategory: 'seeds' })
      .eq('id', p.id);

    if (updateError) {
      console.error(`Failed to update ${p.name}:`, updateError);
    } else {
      updatedCount++;
    }
  }

  console.log(`Successfully corrected ${updatedCount} products in database to subcategory "seeds".`);
}

run();
