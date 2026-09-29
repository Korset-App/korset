import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching priority target products from Supabase...');
  
  // Fetch active food products with photos needing KBJU or ingredients
  // We prioritize well-known brands first to maximize hit rate
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, name, brand, category, image_url, ingredients_raw, nutriments_json, nutriscore, nova_group, allergens_json')
      .eq('is_active', true)
      .not('category', 'in', '(household,personal_care)')
      .not('image_url', 'is', null)
      .not('image_url', 'like', '%empty_photo%')
      .not('image_url', 'like', '%no-photo%')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }
    allData.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  const data = allData;

  console.log(`Total active food products with photo: ${data.length}`);

  const RAW_LOG_PATH = path.join(__dirname, '..', 'scratch', 'off-harvest-raw.jsonl');
  const cachedEans = new Set();
  if (fs.existsSync(RAW_LOG_PATH)) {
    const rawLines = fs.readFileSync(RAW_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
    rawLines.forEach(l => {
      try {
        const item = JSON.parse(l);
        if (item.ean) cachedEans.add(item.ean);
      } catch {}
    });
  }
  console.log(`Loaded ${cachedEans.size} already processed EANs to exclude.`);

  const candidates = data.filter(p => {
    if (!p.ean || !/^\d{8,14}$/.test(p.ean)) return false;
    if (cachedEans.has(p.ean)) return false;
    const n = p.nutriments_json;
    const hasKbju = n && (
      (n.energy_kcal != null || n.kcal != null) &&
      (n.protein_100g != null || n.protein != null) &&
      (n.fat_100g != null || n.fat != null) &&
      (n.carbohydrates_100g != null || n.carbs != null)
    );
    const hasIng = p.ingredients_raw && p.ingredients_raw.trim().length > 5;
    // Candidate if lacks KBJU or lacks ingredients or lacks nutriscore/allergens
    return !hasKbju || !hasIng || !p.nutriscore || !p.allergens_json || p.allergens_json.length === 0;
  });

  console.log(`Fresh candidates needing enrichment: ${candidates.length}`);

  // Sort candidates: famous brands and categories first
  const priorityBrandRegex = /danone|heinz|nestle|сады придонья|махеев|рахат|санта бремор|яшкино|gerber|увелка|инмарко|фрутоняня|роллтон|село зеленое|бабушкино лукошко|чим-чим|кублей|maccoffee|maggi|чудо|greenfield|tassay|черноголовка|царь|kdv|foodmaster|ferrero|mars|snickers|twix|bounty|milka|oreo|barilla|hochland|president|viola|добрый|любимый|простоквашино|слобода|доширак|мистраль|любятово|ahmad|tess|lipton|jacobs|jardin|carte noire|nutella|kinder|lays|pringles|cheetos|alpro|campina/i;

  candidates.sort((a, b) => {
    const aNeedKbju = !(a.nutriments_json && (a.nutriments_json.energy_kcal != null || a.nutriments_json.kcal != null));
    const bNeedKbju = !(b.nutriments_json && (b.nutriments_json.energy_kcal != null || b.nutriments_json.kcal != null));
    const aPri = priorityBrandRegex.test(a.brand || '') || priorityBrandRegex.test(a.name || '');
    const bPri = priorityBrandRegex.test(b.brand || '') || priorityBrandRegex.test(b.name || '');

    const scoreA = (aNeedKbju ? 2 : 0) + (aPri ? 1 : 0);
    const scoreB = (bNeedKbju ? 2 : 0) + (bPri ? 1 : 0);

    return scoreB - scoreA;
  });

  const priorityCount = candidates.filter(p => priorityBrandRegex.test(p.brand || '') || priorityBrandRegex.test(p.name || '')).length;
  console.log(`Priority brand candidates: ${priorityCount}`);

  fs.writeFileSync('scratch/off-enrichment-targets.json', JSON.stringify(candidates.map(c => ({
    id: c.id,
    ean: c.ean,
    name: c.name,
    brand: c.brand,
    category: c.category,
    hasKbju: !!(c.nutriments_json && (c.nutriments_json.energy_kcal != null || c.nutriments_json.kcal != null)),
    hasIng: !!(c.ingredients_raw && c.ingredients_raw.trim().length > 5),
    hasNutriscore: !!c.nutriscore,
    hasAllergens: !!(c.allergens_json && c.allergens_json.length > 0)
  })), null, 2));

  console.log('Saved target list to scratch/off-enrichment-targets.json');
}

main().catch(console.error);
