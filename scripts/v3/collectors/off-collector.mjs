import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, '..', '..', '..', 'data', 'v3_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function isValidEanChecksum(barcode) {
  if (!/^\d{8}$|^\d{12,14}$/.test(barcode)) return false;
  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  const len = digits.length;
  for (let i = len - 1; i >= 0; i--) {
    const weight = (len - 1 - i) % 2 === 0 ? 3 : 1;
    sum += digits[i] * weight;
  }
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

function isScaleBarcode(barcode) {
  return /^2[0-9]/.test(barcode);
}

const CATEGORY_MAP = {
  'dairy': 'dairy_eggs',
  'milk': 'dairy_eggs',
  'cheese': 'dairy_eggs',
  'beverages': 'water_beverages',
  'water': 'water_beverages',
  'sodas': 'water_beverages',
  'teas': 'tea_coffee',
  'coffees': 'tea_coffee',
  'snacks': 'snacks',
  'chips': 'snacks',
  'biscuits': 'sweets',
  'chocolates': 'sweets',
  'confectioneries': 'sweets',
  'sauces': 'sauces_spices',
  'condiments': 'sauces_spices',
  'groceries': 'grocery',
  'pastas': 'grocery',
  'cereals': 'grocery',
  'breads': 'bread',
  'frozen-foods': 'frozen',
  'meats': 'meat',
  'fishes': 'fish',
  'baby-foods': 'baby_food',
};

function mapOffCategory(categoriesTags) {
  if (!Array.isArray(categoriesTags)) return 'grocery';
  for (const tag of categoriesTags) {
    const cleanTag = tag.replace(/^(en|ru|fr):/, '').toLowerCase();
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
      if (cleanTag.includes(key)) return val;
    }
  }
  return 'grocery';
}

export async function collectOpenFoodFacts() {
  console.log('=== [OFF Collector] Starting Open Food Facts Ingestion ===');
  const outFile = path.join(CACHE_DIR, 'off_products.json');
  let existing = {};
  if (fs.existsSync(outFile)) {
    try { existing = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch {}
  }

  const collectedMap = new Map(Object.entries(existing));
  console.log(`Initial items in OFF cache: ${collectedMap.size}`);

  const endpoints = [
    // 1. Kazakhstan country tag
    'https://world.openfoodfacts.org/api/v2/search?countries_tags_en=kazakhstan&fields=code,product_name,product_name_ru,brands,ingredients_text,ingredients_text_ru,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    // 2. Cyrillic food categories popular in Kazakhstan
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=dairies&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=cheeses&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=meats&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=snacks&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=chips&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=biscuits-and-cakes&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=chocolates&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=sauces&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=beverages&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=tea&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=canned-foods&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=pasta&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100',
    'https://ru.openfoodfacts.org/api/v2/search?countries_tags_en=russia&categories_tags_en=groceries&fields=code,product_name,brands,ingredients_text,nutriments,allergens_tags,quantity,image_url,categories_tags&page_size=100'
  ];

  for (const baseEndpoint of endpoints) {
    let page = 1;
    let maxPages = baseEndpoint.includes('kazakhstan') ? 15 : 8; // fetch up to ~1000 items per category

    while (page <= maxPages) {
      const url = `${baseEndpoint}&page=${page}`;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Korset-App-Collector/3.0 (info@korset.kz)' }
        });
        if (!res.ok) {
          console.warn(`[OFF] HTTP ${res.status} on page ${page}, breaking...`);
          break;
        }

        const data = await res.json();
        const products = data.products || [];
        if (products.length === 0) break;

        let addedCount = 0;
        for (const p of products) {
          const ean = String(p.code || '').trim();
          if (!ean || isScaleBarcode(ean) || !isValidEanChecksum(ean)) continue;

          const name = (p.product_name_ru || p.product_name || '').trim();
          if (!name || name.length < 3) continue;

          const ingredientsRaw = p.ingredients_text_ru || p.ingredients_text || null;
          const nutriments = p.nutriments || {};
          const calories = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? null;
          const protein = nutriments['proteins_100g'] ?? nutriments['proteins'] ?? null;
          const fat = nutriments['fat_100g'] ?? nutriments['fat'] ?? null;
          const carbs = nutriments['carbohydrates_100g'] ?? nutriments['carbohydrates'] ?? null;

          const nutrimentsJson = (calories != null || protein != null || fat != null || carbs != null) ? {
            energy_kcal: calories,
            protein_100g: protein,
            fat_100g: fat,
            carbohydrates_100g: carbs,
          } : {};

          const allergens = (p.allergens_tags || []).map(a => a.replace(/^[a-z]{2}:/, '').toLowerCase());

          collectedMap.set(ean, {
            ean,
            name,
            brand: p.brands ? p.brands.split(',')[0].trim() : '',
            category: mapOffCategory(p.categories_tags),
            quantity: p.quantity || null,
            ingredients_raw: ingredientsRaw,
            nutriments_json: nutrimentsJson,
            allergens_json: allergens,
            image_url: p.image_url || null,
            source: 'openfoodfacts'
          });
          addedCount++;
        }

        console.log(`[OFF] Page ${page} processed. Added/Updated ${addedCount}. Total collected: ${collectedMap.size}`);
        page++;
        await sleep(1500); // Respect polite OFF API rate limits
      } catch (err) {
        console.warn(`[OFF Error] ${err.message}, retrying in 3s...`);
        await sleep(3000);
        page++;
      }
    }
  }

  const resultObj = Object.fromEntries(collectedMap);
  fs.writeFileSync(outFile, JSON.stringify(resultObj, null, 2), 'utf8');
  console.log(`=== [OFF Collector] Complete! Total unique items: ${collectedMap.size} saved to ${outFile} ===\n`);
  return collectedMap;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  collectOpenFoodFacts().catch(console.error);
}
