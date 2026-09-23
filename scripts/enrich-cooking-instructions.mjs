import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { inferStandardCookingInstructions } from './utils/cooking-instructions-extractor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('=== ENRICHING COOKING INSTRUCTIONS IN CLEAN_PRODUCTS_V2 ===');

  let offset = 0;
  const PAGE_SIZE = 1000;
  let totalEnriched = 0;

  while (true) {
    const { data: prods, error } = await supabase
      .from('clean_products_v2')
      .select('id, name, category, description, cooking_instructions')
      .is('cooking_instructions', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      break;
    }
    if (!prods || prods.length === 0) {
      console.log('No more records without cooking instructions.');
      break;
    }

    console.log(`Checking page of ${prods.length} products (offset ${offset})...`);
    const updates = [];

    for (const p of prods) {
      const instructions = inferStandardCookingInstructions(p.name, p.category, p.description);
      if (instructions) {
        updates.push({ id: p.id, cooking_instructions: instructions });
      }
    }

    if (updates.length > 0) {
      console.log(`Found ${updates.length} items to enrich in this page.`);
      // Batch update in chunks of 50
      for (let i = 0; i < updates.length; i += 50) {
        const chunk = updates.slice(i, i + 50);
        await Promise.all(
          chunk.map(u =>
            supabase
              .from('clean_products_v2')
              .update({ cooking_instructions: u.cooking_instructions })
              .eq('id', u.id)
          )
        );
      }
      totalEnriched += updates.length;
    }

    // Advance offset
    offset += PAGE_SIZE;
  }

  console.log(`\n=== DONE: Successfully added cooking instructions to ${totalEnriched} products! ===`);
}

run();
