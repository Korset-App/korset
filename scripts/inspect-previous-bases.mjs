import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';

async function checkGz(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist:', filePath);
    return;
  }
  console.log('=== Checking:', filePath, '===');
  const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input: stream });
  let count = 0;
  let hasIng = 0;
  let hasNutr = 0;
  let hasShelf = 0;
  let hasHalal = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    count++;
    const p = JSON.parse(line);
    const ing = p.ingredients_raw || p.ingredients || p.composition;
    const nutr = p.nutriments_json || p.nutrition || p.nutriments;
    const shelf = p.shelf_life || p.shelf_life_days;
    const halal = p.halal_status;

    if (ing && String(ing).length > 5) hasIng++;
    if (nutr && typeof nutr === 'object' && Object.keys(nutr).length > 0 &&
      (nutr.energy_kcal || nutr.protein_100g || nutr.fat_100g || nutr.calories || nutr.fats)) hasNutr++;
    if (shelf) hasShelf++;
    if (halal && halal !== 'unknown') hasHalal++;

    if (count === 1) {
      console.log('Sample keys:', Object.keys(p));
      console.log('Sample item:', { ean: p.ean, name: p.name, ing: String(ing).slice(0, 60), nutr });
    }
  }
  console.log(`Total: ${count} | Ingredients: ${hasIng} (${(hasIng/count*100).toFixed(1)}%) | Nutrition: ${hasNutr} (${(hasNutr/count*100).toFixed(1)}%) | Shelf: ${hasShelf} | Halal: ${hasHalal}\n`);
}

async function checkPlainJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist:', filePath);
    return;
  }
  console.log('=== Checking Plain:', filePath, '===');
  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  let count = 0;
  let hasIng = 0;
  let hasNutr = 0;
  let hasShelf = 0;
  let hasHalal = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    count++;
    const p = JSON.parse(line);
    const ing = p.ingredients_raw || p.ingredients || p.composition;
    const nutr = p.nutriments_json || p.nutrition || p.nutriments;
    const shelf = p.shelf_life || p.shelf_life_days;
    const halal = p.halal_status;

    if (ing && String(ing).length > 5) hasIng++;
    if (nutr && typeof nutr === 'object' && Object.keys(nutr).length > 0 &&
      (nutr.energy_kcal || nutr.protein_100g || nutr.fat_100g || nutr.calories || nutr.fats)) hasNutr++;
    if (shelf) hasShelf++;
    if (halal && halal !== 'unknown') hasHalal++;

    if (count === 1) {
      console.log('Sample keys:', Object.keys(p));
      console.log('Sample item:', { ean: p.ean, name: p.name, ing: String(ing).slice(0, 60), nutr });
    }
  }
  console.log(`Total: ${count} | Ingredients: ${hasIng} (${(hasIng/count*100).toFixed(1)}%) | Nutrition: ${hasNutr} (${(hasNutr/count*100).toFixed(1)}%) | Shelf: ${hasShelf} | Halal: ${hasHalal}\n`);
}

async function run() {
  await checkGz('data/archive/global_products_2026-09-24.jsonl.gz');
  await checkGz('data/archive/clean_products_v3_2026-09-24.jsonl.gz');
  await checkGz('data/archive/clean_products_v2_2026-09-24.jsonl.gz');
  await checkPlainJsonl('data/clean_catalog_v2.jsonl');
  await checkPlainJsonl('data/semeiniy_raw_products.jsonl');
  await checkPlainJsonl('data/korset_master_catalog_v4_sterile.jsonl');
}

run().catch(console.error);
