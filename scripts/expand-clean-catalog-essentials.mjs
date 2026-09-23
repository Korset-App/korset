/**
 * Catalog Expander for Kazakh Essential Products.
 * Expands clean_products_v2 up to 15,000+ items with top Kazakh & regional staple brands.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { validateBarcodeStrict, getCountryByPrefix } from './utils/ean-validator.mjs';
import { extractQuantityAndUnit, extractFatPercent } from './utils/attribute-matcher.mjs';
import { inferStandardCookingInstructions } from './utils/cooking-instructions-extractor.mjs';
import { inferStandardStorageConditions, extractShelfLife } from './utils/storage-conditions-extractor.mjs';
import { queryNpc, queryBarcodeListRu } from './utils/external-barcode-clients.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_DIR = path.join(__dirname, '..', 'data');
const CATALOG_JSONL_PATH = path.join(DATA_DIR, 'clean_catalog_v2.jsonl');
const PROGRESS_JSON_PATH = path.join(DATA_DIR, 'clean_catalog_v2_progress.json');

const TOP_STAPLE_QUERIES = [
  // Dairy & Milks
  { brand: 'ФудМастер', query: 'ФудМастер молоко кефир сметана творог', category: 'dairy_eggs' },
  { brand: 'Родина', query: 'Родина молоко творог сметана', category: 'dairy_eggs' },
  { brand: 'Амиран', query: 'Амиран детское питание творог кефир', category: 'dairy_eggs' },
  { brand: 'Lactel', query: 'Lactel молоко 3.2% 2.5% 1.5%', category: 'dairy_eggs' },
  { brand: 'Простоквашино', query: 'Простоквашино молоко творог сметана', category: 'dairy_eggs' },
  { brand: 'Масло-Дел', query: 'Масло-Дел Петропавловское масло сгущенка', category: 'dairy_eggs' },
  
  // Sweets & Confectionery
  { brand: 'Рахат', query: 'Рахат шоколад конфеты карамель вафли', category: 'sweets' },
  { brand: 'Баян Сулу', query: 'Баян Сулу конфеты шоколад печенье', category: 'sweets' },
  { brand: 'Куликовский', query: 'Куликовский торт пирожное десерт', category: 'sweets' },
  { brand: 'Mars', query: 'Snickers Twix Bounty Milky Way Mars', category: 'sweets' },
  { brand: 'Ferrero', query: 'Raffaello Nutella Kinder Сюрприз', category: 'sweets' },
  { brand: 'Яшкино', query: 'Яшкино вафли рулет печенье', category: 'sweets' },

  // Grocery, Pasta, Flour, Grains
  { brand: 'Цесна', query: 'Цесна мука макароны спагетти хлопья', category: 'grocery' },
  { brand: 'Султан', query: 'Султан макароны спагетти вермишель', category: 'grocery' },
  { brand: 'Barilla', query: 'Barilla спагетти пенне паста', category: 'grocery' },
  { brand: 'Увелка', query: 'Увелка крупа гречка рис овсянка', category: 'grocery' },
  { brand: 'Макфа', query: 'Макфа макароны мука гречневая', category: 'grocery' },

  // Sauces & Oils
  { brand: '3 Желания', query: '3 Желания майонез кетчуп масло соус', category: 'sauces_spices' },
  { brand: 'Слобода', query: 'Слобода майонез оливковый подсолнечное масло', category: 'sauces_spices' },
  { brand: 'Heinz', query: 'Heinz кетчуп соус горчица фасоль', category: 'sauces_spices' },

  // Tea & Coffee
  { brand: 'Пиала Gold', query: 'Пиала Gold чай черный гранулированный листовой', category: 'tea_coffee' },
  { brand: 'Assam', query: 'Assam чай черный пакетированный', category: 'tea_coffee' },
  { brand: 'Tess', query: 'Tess чай черный зеленый', category: 'tea_coffee' },
  { brand: 'Greenfield', query: 'Greenfield чай ассорти пакетированный', category: 'tea_coffee' },
  { brand: 'Jacobs', query: 'Jacobs Monarch кофе растворимый молотый', category: 'tea_coffee' },
  { brand: 'Nescafe', query: 'Nescafe Classic Gold кофе', category: 'tea_coffee' },

  // Water & Beverages
  { brand: 'Tassay', query: 'Tassay вода негазированная газированная 0.5 1.5 5л', category: 'water_beverages' },
  { brand: 'Borjomi', query: 'Borjomi вода минеральная лечебная', category: 'water_beverages' },
  { brand: 'Gracio', query: 'Gracio сок апельсин яблоко томат', category: 'water_beverages' },
  { brand: 'DaDa', query: 'DaDa сок нектар яблочный мультифрукт', category: 'water_beverages' },
  { brand: 'A’Su', query: 'A’Su вода питьевая с лимоном мятой', category: 'water_beverages' },
  { brand: 'Coca-Cola', query: 'Coca-Cola Sprite Fanta 0.5 1 1.5 2л', category: 'water_beverages' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadAssignedEans() {
  if (fs.existsSync(PROGRESS_JSON_PATH)) {
    try {
      const p = JSON.parse(fs.readFileSync(PROGRESS_JSON_PATH, 'utf-8'));
      return new Set(p.assignedEans || []);
    } catch {}
  }
  return new Set();
}

async function run() {
  console.log('=== KÖRSET STAPLE CATALOG EXPANDER ===');
  const assigned = loadAssignedEans();
  console.log(`Initial assigned EAN count: ${assigned.size}`);

  let added = 0;
  let batchBuffer = [];

  for (const staple of TOP_STAPLE_QUERIES) {
    console.log(`\n[EXPAND] Querying staple: ${staple.brand} (${staple.query})...`);

    // 1. Query NPC
    try {
      const npcItems = await queryNpc(staple.query, 25);
      await sleep(350);

      for (const item of npcItems) {
        if (!item.gtin) continue;
        const v = validateBarcodeStrict(item.gtin);
        if (!v.valid || assigned.has(v.ean)) continue;

        const qty = extractQuantityAndUnit(item.nameRu);
        const fat = extractFatPercent(item.nameRu);
        const cooking = inferStandardCookingInstructions(item.nameRu, staple.category, '');
        const storage = inferStandardStorageConditions(staple.category, item.nameRu, '');

        const rec = {
          ean: v.ean,
          name: item.nameRu,
          name_kz: item.nameKk || null,
          brand: item.brand || staple.brand,
          category: staple.category,
          subcategory: null,
          quantity: qty ? qty.display : null,
          quantity_value: qty ? qty.normalizedValue : null,
          quantity_unit: qty ? qty.baseUnit : null,
          fat_percent: fat,
          flavor: null,
          package_type: null,
          storage_conditions: storage,
          shelf_life: null,
          cooking_instructions: cooking,
          description: null,
          ingredients_raw: null,
          ingredients_json: [],
          nutriments_json: {},
          halal_status: 'unknown',
          allergens_json: [],
          image_url: null,
          secondary_image_url: null,
          images_json: [],
          country_of_origin: item.country || getCountryByPrefix(v.ean.slice(0, 3)),
          producer_name: item.producer || null,
          producer_bin: item.producerBin || null,
          match_source: 'staple_npc_expansion',
          quality_score: 75,
        };

        assigned.add(v.ean);
        added++;
        fs.appendFileSync(CATALOG_JSONL_PATH, JSON.stringify(rec) + '\n', 'utf-8');
        batchBuffer.push(rec);

        if (batchBuffer.length >= 25) {
          const { error } = await supabase.from('clean_products_v2').upsert(batchBuffer, { onConflict: 'ean' });
          if (error) console.error('Supabase batch insert error:', error.message);
          batchBuffer = [];
        }
      }
    } catch (e) {
      console.error('Error expanding staple:', staple.brand, e.message);
    }
  }

  if (batchBuffer.length > 0) {
    const { error } = await supabase.from('clean_products_v2').upsert(batchBuffer, { onConflict: 'ean' });
    if (error) console.error('Supabase batch insert error:', error.message);
    batchBuffer = [];
  }

  console.log(`\n=== EXPANSION COMPLETE ===`);
  console.log(`Added ${added} new staple products.`);
  console.log(`Total active clean EANs: ${assigned.size}`);
}

run().catch(e => {
  console.error('Expander fatal error:', e);
  process.exit(1);
});
