/**
 * Deep Enrichment Script for Clean Catalog v2.
 * Enriches all clean_products_v2 records with:
 * - 14 Technical Regulation allergens (ТР ТС 022/2011)
 * - Evidence-based Halal status
 * - Missing cooking instructions and storage conditions
 * - Recalculated quality score
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { inferStandardCookingInstructions } from './utils/cooking-instructions-extractor.mjs';
import { inferStandardStorageConditions } from './utils/storage-conditions-extractor.mjs';
import { ALLERGEN_SYNONYMS } from '../src/constants/allergenSynonyms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function detectAllergensFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const s = text.toLowerCase();
  const detected = new Set();

  for (const [allergenId, synonyms] of Object.entries(ALLERGEN_SYNONYMS)) {
    for (const syn of synonyms) {
      if (s.includes(syn.toLowerCase())) {
        detected.add(allergenId);
        break;
      }
    }
  }

  return Array.from(detected);
}

const CERTIFIED_HALAL_BRANDS = [
  'амиран', 'родина', 'фудмастер', 'кублей', 'улан', 'султан', 'цесна', 'пиала gold', 'ассам', 'tassay',
  'баян сулу', 'рахат', 'кэмми', 'аралтуз', 'акмаржан', 'эмиль', 'восток-молоко', 'бижан', 'масло-дел',
  'шедевр', 'ал-халал', 'первомайские деликатесы', 'турар', 'dada', 'juicy', 'gracio', 'piko', 'наурыз',
  'шоро', 'сарыагаш', 'turan'
];

const HARAM_MARKERS = [
  'свинина', 'шпик', 'сало', 'бекон', 'ветчина свиная', 'кармин', 'e120', 'е120', 'желатин свиной', 'спирт', 'вино', 'коньяк', 'ром', 'ликёр', 'ликер', 'пиво'
];

function evaluateHalal(product) {
  const text = `${product.name} ${product.brand || ''} ${product.ingredients_raw || ''}`.toLowerCase();

  // 1. Strict haram markers (immediate NO)
  for (const marker of HARAM_MARKERS) {
    if (text.includes(marker)) {
      return 'no';
    }
  }

  // 2. Explicit halal keyword in name/description/label
  if (text.includes('халал') || text.includes('халяль') || text.includes('halal')) {
    return 'yes';
  }

  // 3. Certified Halal Producers & Brands in Kazakhstan
  const brand = (product.brand || '').toLowerCase();
  if (CERTIFIED_HALAL_BRANDS.some(b => brand.includes(b))) {
    return 'yes';
  }

  // 4. Inherently Halal Categories (Pure Single-Ingredient / Natural Plant & Mineral & Fish)
  const cat = (product.category || '').toLowerCase();

  // Water and Ice
  if (text.includes('вода ') || text.includes('минеральная') || text.includes('лед ') || text.includes('кубики льда') || (cat === 'water_beverages' && text.includes('вода'))) {
    return 'yes';
  }

  // Pure tea and unflavored coffee
  if (cat === 'tea_coffee' && (text.includes('чай ') || text.includes('кофе зерновой') || text.includes('кофе молотый'))) {
    return 'yes';
  }

  // Pure vegetable oils
  if (text.includes('масло подсолнечное') || text.includes('масло оливковое') || text.includes('масло кукурузное') || text.includes('масло льняное') || text.includes('extra vergine')) {
    return 'yes';
  }

  // Pure grains, cereals, flour, pasta, salt, sugar
  if (cat === 'grocery') {
    if (text.includes('мука ') || text.includes('соль ') || text.includes('сахар ') || text.includes('гречка') || text.includes('рис ') || text.includes('овсянк') || text.includes('геркулес') || text.includes('пшено') || text.includes('булгур') || text.includes('чечевиц') || text.includes('перловка') || text.includes('манка') || text.includes('макароны') || text.includes('спагетти')) {
      return 'yes';
    }
  }

  // Pure fish & seafood (canned or frozen)
  if (cat === 'meat' || cat === 'frozen' || cat === 'snacks') {
    if (text.includes('рыба') || text.includes('лосось') || text.includes('горбуша') || text.includes('тунец') || text.includes('сайра') || text.includes('шпроты') || text.includes('сельдь') || text.includes('минтай') || text.includes('путассу') || text.includes('форель') || text.includes('икра')) {
      return 'yes';
    }
  }

  // Nuts and seeds
  if (cat === 'snacks' || cat === 'healthy') {
    if (text.includes('семечки') || text.includes('фундук') || text.includes('миндаль') || text.includes('грецкий орех') || text.includes('кешью') || text.includes('фисташки') || text.includes('арахис')) {
      return 'yes';
    }
  }

  // Fresh & Canned fruits and vegetables, pickles, compotes, jams
  if (cat === 'fruits_veg') {
    return 'yes';
  }
  if (text.includes('варенье') || text.includes('джем ') || text.includes('повидло')) {
    return 'yes';
  }

  // 100% pure juices (without alcohol or carmine)
  if (cat === 'water_beverages' && (text.includes('100% сок') || text.includes('сок яблочный') || text.includes('сок апельсиновый') || text.includes('сок томатный') || text.includes('сок ананасовый') || text.includes('сок персиковый') || text.includes('сок виноградный') || text.includes('сок гранатовый') || text.includes('сок мультифрукт'))) {
    return 'yes';
  }

  return 'unknown';
}

function calculateQualityScore(p) {
  let score = 0;
  if (p.name) score += 15;
  if (p.ean && /^\d{8,14}$/.test(p.ean)) score += 20;
  if (p.brand) score += 10;
  if (p.ingredients_raw) score += 15;
  if (p.nutriments_json && Object.values(p.nutriments_json).some(v => v != null)) score += 10;
  if (p.image_url) score += 10;
  if (p.cooking_instructions) score += 5;
  if (p.storage_conditions) score += 5;
  if (p.name_kz) score += 5;
  if (p.allergens_json && p.allergens_json.length > 0) score += 5;
  return Math.min(score, 100);
}

async function run() {
  console.log('=== KÖRSET CLEAN CATALOG V2 DEEP ENRICHMENT ===');
  let offset = 0;
  const BATCH_SIZE = 500;
  let totalEnriched = 0;
  let allergenCount = 0;
  let halalYesCount = 0;
  let cookingCount = 0;

  while (true) {
    console.log(`Fetching batch at offset ${offset}...`);
    const { data: rows, error } = await supabase
      .from('clean_products_v2')
      .select('*')
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      break;
    }
    if (!rows || rows.length === 0) break;

    const updates = [];

    for (const row of rows) {
      let changed = false;

      // 1. Allergens
      let allergens = row.allergens_json || [];
      if ((!allergens || allergens.length === 0) && row.ingredients_raw) {
        allergens = detectAllergensFromText(row.ingredients_raw);
        if (allergens.length > 0) changed = true;
      }
      if (allergens.length > 0) allergenCount++;

      // 2. Halal
      let halal = row.halal_status;
      const evaluatedHalal = evaluateHalal(row);
      if (evaluatedHalal !== halal) {
        halal = evaluatedHalal;
        changed = true;
      }
      if (halal === 'yes') halalYesCount++;

      // 3. Cooking instructions
      let cooking = row.cooking_instructions;
      if (!cooking) {
        cooking = inferStandardCookingInstructions(row.name, row.category, row.description || '');
        if (cooking) changed = true;
      }
      if (cooking) cookingCount++;

      // 4. Storage conditions
      let storage = row.storage_conditions;
      if (!storage) {
        storage = inferStandardStorageConditions(row.category, row.name, row.description || '');
        if (storage) changed = true;
      }

      const quality = calculateQualityScore({
        ...row,
        allergens_json: allergens,
        halal_status: halal,
        cooking_instructions: cooking,
        storage_conditions: storage,
      });

      if (quality !== row.quality_score) changed = true;

      if (changed) {
        updates.push({
          id: row.id,
          ean: row.ean,
          name: row.name,
          allergens_json: allergens,
          halal_status: halal,
          cooking_instructions: cooking,
          storage_conditions: storage,
          quality_score: quality,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (updates.length > 0) {
      // Upsert batch
      const { error: upsertErr } = await supabase.from('clean_products_v2').upsert(updates, { onConflict: 'ean' });
      if (upsertErr) {
        console.error('Batch update error:', upsertErr.message);
      } else {
        totalEnriched += updates.length;
      }
    }

    console.log(`Processed ${rows.length} rows (enriched ${updates.length}). Total enriched so far: ${totalEnriched}`);
    offset += BATCH_SIZE;
  }

  console.log('\n=== ENRICHMENT SUMMARY ===');
  console.log(`Total Products Enriched: ${totalEnriched}`);
  console.log(`Products with Detected Allergens: ${allergenCount}`);
  console.log(`Products with Halal YES: ${halalYesCount}`);
  console.log(`Products with Cooking Instructions: ${cookingCount}`);
}

run().catch(e => {
  console.error('Enrichment fatal error:', e);
  process.exit(1);
});
