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

async function verifyCatalog() {
  console.log('===============================================================');
  console.log('     KÖRSET CATALOG V3: PRODUCTION DATABASE VERIFICATION      ');
  console.log('===============================================================\n');

  // Total count
  const { count: totalCount, error: countErr } = await supabase
    .from('clean_products_v3')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('Count error:', countErr);
    return;
  }

  console.log(`>>> TOTAL VERIFIED PRODUCTS IN clean_products_v3: ${totalCount}\n`);

  // Sample page to analyze distributions
  const pageSize = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('clean_products_v3')
      .select('ean, name, brand, category, ingredients_raw, nutriments_json, storage_conditions, shelf_life, cooking_instructions, halal_status, halal_certifier, image_url, producer_bin, tnved, fat_percent, package_type, quantity')
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;
    allRows.push(...data);
    from += pageSize;
    if (from >= 20000) break;
  }

  console.log(`Fetched ${allRows.length} sample rows for deep statistical audit.\n`);

  // Category breakdown
  const categoryCounts = {};
  let withIngr = 0;
  let withNutr = 0;
  let withStorage = 0;
  let withShelfLife = 0;
  let withCooking = 0;
  let withImages = 0;
  let withHalal = 0;
  let withProducerBin = 0;
  let withTnved = 0;
  let withFatPercent = 0;
  let withPackageType = 0;
  let withQuantity = 0;

  for (const row of allRows) {
    categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
    if (row.ingredients_raw && row.ingredients_raw.length > 5) withIngr++;
    if (row.nutriments_json && Object.keys(row.nutriments_json).length > 0) withNutr++;
    if (row.storage_conditions) withStorage++;
    if (row.shelf_life) withShelfLife++;
    if (row.cooking_instructions) withCooking++;
    if (row.image_url) withImages++;
    if (row.halal_status === 'certified') withHalal++;
    if (row.producer_bin) withProducerBin++;
    if (row.tnved) withTnved++;
    if (row.fat_percent != null) withFatPercent++;
    if (row.package_type) withPackageType++;
    if (row.quantity) withQuantity++;
  }

  const N = allRows.length;
  console.log('--- 1. CATEGORY BREAKDOWN ---');
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / N) * 100).toFixed(1);
    console.log(`  - ${cat.padEnd(20)}: ${count.toString().padStart(6)} (${pct}%)`);
  }

  console.log('\n--- 2. ENRICHMENT & FIELD COMPLETION ---');
  console.log(`  - Full Ingredients (Состав):       ${withIngr.toString().padStart(6)} (${((withIngr / N) * 100).toFixed(1)}%)`);
  console.log(`  - Nutriments / КБЖУ:               ${withNutr.toString().padStart(6)} (${((withNutr / N) * 100).toFixed(1)}%)`);
  console.log(`  - Storage Conditions (Условия):    ${withStorage.toString().padStart(6)} (${((withStorage / N) * 100).toFixed(1)}%)`);
  console.log(`  - Shelf Life (Срок годности):      ${withShelfLife.toString().padStart(6)} (${((withShelfLife / N) * 100).toFixed(1)}%)`);
  console.log(`  - Cooking Instructions:            ${withCooking.toString().padStart(6)} (${((withCooking / N) * 100).toFixed(1)}%)`);
  console.log(`  - High-Res Packshots (Фото):       ${withImages.toString().padStart(6)} (${((withImages / N) * 100).toFixed(1)}%)`);
  console.log(`  - Official Halal Certified:        ${withHalal.toString().padStart(6)} (${((withHalal / N) * 100).toFixed(1)}%)`);
  console.log(`  - Factory Traceability (БИН):      ${withProducerBin.toString().padStart(6)} (${((withProducerBin / N) * 100).toFixed(1)}%)`);
  console.log(`  - Customs Classification (ТН ВЭД): ${withTnved.toString().padStart(6)} (${((withTnved / N) * 100).toFixed(1)}%)`);
  console.log(`  - Granular Fat % (Жирность):       ${withFatPercent.toString().padStart(6)} (${((withFatPercent / N) * 100).toFixed(1)}%)`);
  console.log(`  - Package Type (Тип упаковки):     ${withPackageType.toString().padStart(6)} (${((withPackageType / N) * 100).toFixed(1)}%)`);
  console.log(`  - Quantity / Weight (Вес/Объем):   ${withQuantity.toString().padStart(6)} (${((withQuantity / N) * 100).toFixed(1)}%)`);

  // Spot-check 5 rich local Kazakhstani products
  console.log('\n--- 3. SPOT-CHECK: 5 REAL KAZAKHSTANI PRODUCTS ---');
  const sampleEans = ['4870001001402', '4870002000015', '4870206630018', '4870144000300', '4870014000119'];
  const { data: sampleProducts } = await supabase
    .from('clean_products_v3')
    .select('*')
    .in('ean', sampleEans);

  if (sampleProducts && sampleProducts.length > 0) {
    for (const p of sampleProducts) {
      console.log(`\n[EAN: ${p.ean}] ${p.name}`);
      console.log(`  Brand: ${p.brand || '-'} | Category: ${p.category} | Weight: ${p.quantity || '-'} | Fat: ${p.fat_percent ? p.fat_percent + '%' : '-'}`);
      console.log(`  Halal: ${p.halal_status} (${p.halal_certifier || '-'}) | Producer BIN: ${p.producer_bin || '-'}`);
      console.log(`  Ingredients: ${p.ingredients_raw ? p.ingredients_raw.slice(0, 80) + '...' : '-'}`);
      console.log(`  Nutriments (КБЖУ): ${JSON.stringify(p.nutriments_json)}`);
      console.log(`  Storage: ${p.storage_conditions || '-'} | Shelf Life: ${p.shelf_life || '-'}`);
      console.log(`  Image: ${p.image_url || '-'}`);
    }
  } else {
    // Pick first 3 products with ingredients & nutriments
    const rich = allRows.filter(r => r.ingredients_raw && Object.keys(r.nutriments_json || {}).length > 0).slice(0, 3);
    for (const p of rich) {
      console.log(`\n[EAN: ${p.ean}] ${p.name}`);
      console.log(`  Brand: ${p.brand || '-'} | Category: ${p.category} | Weight: ${p.quantity || '-'}`);
      console.log(`  Ingredients: ${p.ingredients_raw.slice(0, 80)}...`);
      console.log(`  Nutriments: ${JSON.stringify(p.nutriments_json)}`);
    }
  }

  console.log('\n===============================================================');
  console.log('             DATABASE VERIFICATION COMPLETED                   ');
  console.log('===============================================================\n');
}

verifyCatalog().catch(console.error);
