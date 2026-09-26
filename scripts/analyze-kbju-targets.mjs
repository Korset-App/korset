import fs from 'fs';
import readline from 'readline';

const FOOD_CATEGORIES = new Set([
  'dairy_eggs', 'sweets', 'water_beverages', 'grocery', 'sauces_spices',
  'fruits_veg', 'baby_food', 'bread', 'tea_coffee', 'fish', 'frozen',
  'deli', 'ready_meals', 'healthy', 'snacks', 'meat'
]);

const rl = readline.createInterface({
  input: fs.createReadStream('data/korset_master_catalog_v4_final.jsonl'),
  crlfDelay: Infinity
});

const brandCounts = {};
let totalNeedingKBJU = 0;
let totalFoodWithPhoto = 0;

let totalWithIngr = 0;
let totalWithBoth = 0;

for await (const line of rl) {
  if (!line.trim()) continue;
  const p = JSON.parse(line);
  if (!FOOD_CATEGORIES.has(p.category)) continue;
  if (!p.image_url) continue;

  totalFoodWithPhoto++;
  const hasIngr = p.ingredients_raw && typeof p.ingredients_raw === 'string' && p.ingredients_raw.trim().length > 3;
  const hasNutr = p.nutriments_json && (
    p.nutriments_json.energy_kcal || 
    p.nutriments_json.protein_100g || 
    p.nutriments_json.fat_100g || 
    p.nutriments_json.carbohydrates_100g
  );

  if (hasIngr) totalWithIngr++;
  if (hasIngr && hasNutr) totalWithBoth++;

  if (!hasNutr) {
    totalNeedingKBJU++;
    const b = (p.brand || 'No brand').trim();
    brandCounts[b] = (brandCounts[b] || 0) + 1;
  }
}

const sorted = Object.entries(brandCounts).sort((a,b) => b[1] - a[1]);
console.log('Total food products with photo:', totalFoodWithPhoto);
console.log('Total with ingredients:', totalWithIngr, `(${(totalWithIngr/totalFoodWithPhoto*100).toFixed(1)}%)`);
console.log('Total with KBJU:', totalFoodWithPhoto - totalNeedingKBJU, `(${((totalFoodWithPhoto - totalNeedingKBJU)/totalFoodWithPhoto*100).toFixed(1)}%)`);
console.log('Total with both ingredients & KBJU:', totalWithBoth, `(${(totalWithBoth/totalFoodWithPhoto*100).toFixed(1)}%)`);
console.log('Total needing KBJU:', totalNeedingKBJU);

console.log('\nTop 50 brands needing KBJU:');
sorted.slice(0, 50).forEach(([b, c], i) => console.log(`${i+1}. ${b}: ${c}`));
