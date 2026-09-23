/**
 * Secondary Recovery Pipeline for Unresolved Global Products.
 * Uses National Catalog (НКТ) and hardened Zero-Tolerance matching
 * to recover authentic factory barcodes for previously unresolved items.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import { validateBarcodeStrict, getCountryByPrefix } from './utils/ean-validator.mjs';
import {
  extractQuantityAndUnit,
  extractFatPercent,
  checkZeroToleranceMatch,
} from './utils/attribute-matcher.mjs';
import { inferStandardCookingInstructions } from './utils/cooking-instructions-extractor.mjs';
import { inferStandardStorageConditions, extractShelfLife } from './utils/storage-conditions-extractor.mjs';
import { queryNpc } from './utils/external-barcode-clients.mjs';
import { ALLERGEN_SYNONYMS } from '../src/constants/allergenSynonyms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_DIR = path.join(__dirname, '..', 'data');
const UNRESOLVED_JSON_PATH = path.join(DATA_DIR, 'unresolved_gps.json');
const PROGRESS_JSON_PATH = path.join(DATA_DIR, 'clean_catalog_v2_progress.json');
const CATALOG_JSONL_PATH = path.join(DATA_DIR, 'clean_catalog_v2.jsonl');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function cleanQuery(text) {
  return String(text || '')
    .replace(/\b(?:тм|в\/у|ст\/б|п\/б|д\/п|веc|вес|п\/п|пэт)\b/gi, ' ')
    .replace(/[«»""''`,.;:!?()\[\]\/\\+*#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectAllergens(text) {
  if (!text || typeof text !== 'string') return [];
  const s = text.toLowerCase();
  const detected = new Set();
  for (const [id, syns] of Object.entries(ALLERGEN_SYNONYMS)) {
    for (const syn of syns) {
      if (s.includes(syn.toLowerCase())) {
        detected.add(id);
        break;
      }
    }
  }
  return Array.from(detected);
}

const CERTIFIED_HALAL_BRANDS = [
  'амиран', 'родина', 'фудмастер', 'кублей', 'улан', 'султан', 'цесна', 'пиала gold', 'ассам', 'tassay',
  'баян сулу', 'рахат', 'кэмми', 'аралтуз', 'акмаржан', 'эмиль', 'восток-молоко', 'бижан', 'масло-дел'
];

const HARAM_MARKERS = [
  'свинина', 'шпик', 'сало', 'бекон', 'ветчина свиная', 'кармин', 'e120', 'е120', 'желатин свиной', 'спирт', 'вино', 'коньяк', 'ром', 'ликёр', 'пиво'
];

function evaluateHalal(p) {
  const text = `${p.name} ${p.brand || ''} ${p.ingredients_raw || ''}`.toLowerCase();
  for (const h of HARAM_MARKERS) {
    if (text.includes(h)) return 'no';
  }
  const brand = (p.brand || '').toLowerCase();
  if (CERTIFIED_HALAL_BRANDS.some(b => brand.includes(b))) return 'yes';
  if (text.includes('халал') || text.includes('халяль') || text.includes('halal')) return 'yes';
  const cat = (p.category || '').toLowerCase();
  if (cat === 'grocery' && (text.includes('мука ') || text.includes('соль ') || text.includes('сахар ') || text.includes('гречка') || text.includes('рис ') || text.includes('овсянк'))) return 'yes';
  if (cat === 'water_beverages' && (text.includes('вода ') || text.includes('минеральная'))) return 'yes';
  if (cat === 'tea_coffee' && text.includes('чай ')) return 'yes';
  return 'unknown';
}

function calculateQualityScore(p) {
  let score = 0;
  if (p.name) score += 15;
  if (p.ean && /^\d{8,14}$/.test(p.ean)) score += 20;
  if (p.brand) score += 10;
  if (p.ingredients_raw) score += 20;
  if (p.nutriments_json && Object.values(p.nutriments_json).some(v => v != null)) score += 10;
  if (p.image_url) score += 10;
  if (p.cooking_instructions) score += 5;
  if (p.storage_conditions) score += 5;
  if (p.name_kz) score += 5;
  return Math.min(score, 100);
}

async function run() {
  console.log('=== RUNNING NPC ZERO-TOLERANCE RECOVERY PIPELINE ===');

  if (!fs.existsSync(UNRESOLVED_JSON_PATH)) {
    console.error('unresolved_gps.json not found!');
    process.exit(1);
  }

  const unresolved = JSON.parse(fs.readFileSync(UNRESOLVED_JSON_PATH, 'utf-8'));
  const progress = JSON.parse(fs.readFileSync(PROGRESS_JSON_PATH, 'utf-8'));
  const assignedEans = new Set(progress.assignedEans || []);

  console.log(`Loaded ${unresolved.length} unresolved products. Currently active EANs: ${assignedEans.size}`);

  let recoveredCount = 0;
  const dbBatch = [];

  for (let idx = 0; idx < unresolved.length; idx++) {
    const item = unresolved[idx];

    // Build smart search query
    const q = cleanQuery(item.name);
    let npcCandidates = [];
    try {
      npcCandidates = await queryNpc(q, 8);
      await sleep(150);
    } catch {}

    let bestMatch = null;

    for (const cand of npcCandidates) {
      if (!cand.gtin) continue;
      const val = validateBarcodeStrict(cand.gtin);
      if (!val.valid) continue;

      // Skip internal scale codes
      if (/^2[0-9]{12}$/.test(val.ean)) continue;
      if (assignedEans.has(val.ean)) continue;

      const m = checkZeroToleranceMatch(
        { name: item.name, brand: item.brand, quantity: item.quantity },
        { name: cand.nameRu, brand: cand.brand, quantity: cand.quantityStr || cand.nameRu }
      );

      if (m.isMatch) {
        bestMatch = {
          ean: val.ean,
          cand,
          score: m.score,
        };
        break;
      }
    }

    if (bestMatch) {
      recoveredCount++;
      assignedEans.add(bestMatch.ean);

      // Fetch full global_product details if needed
      const { data: fullGp } = await supabase
        .from('global_products')
        .select('*')
        .eq('id', item.id)
        .single();

      const gp = fullGp || item;
      const cooking = inferStandardCookingInstructions(gp.name, gp.category, gp.description);
      const storage = inferStandardStorageConditions(gp.category, gp.description);
      const shelfLife = extractShelfLife(gp.description);
      const allergens = detectAllergens(`${gp.name} ${gp.ingredients_raw || ''}`);
      const halal = evaluateHalal(gp);
      const qtyParsed = extractQuantityAndUnit(gp.quantity || gp.name);
      const fatParsed = extractFatPercent(gp.name);

      const record = {
        id: crypto.randomUUID(),
        ean: bestMatch.ean,
        name: gp.name,
        name_kz: bestMatch.cand.nameKk && bestMatch.cand.nameKk.length > 3 ? bestMatch.cand.nameKk : (gp.name_kz || null),
        brand: gp.brand || bestMatch.cand.brand || null,
        category: gp.category || 'grocery',
        subcategory: gp.subcategory || null,
        quantity: gp.quantity || (qtyParsed ? qtyParsed.display : null),
        quantity_value: qtyParsed ? qtyParsed.normalizedValue : null,
        quantity_unit: qtyParsed ? qtyParsed.baseUnit : null,
        fat_percent: fatParsed,
        flavor: gp.flavor || null,
        package_type: gp.package_type || null,
        storage_conditions: storage,
        shelf_life: shelfLife,
        cooking_instructions: cooking,
        description: gp.description || null,
        ingredients_raw: gp.ingredients_raw || null,
        ingredients_json: gp.ingredients_json || null,
        nutriments_json: gp.nutriments_json || null,
        halal_status: halal,
        allergens_json: allergens,
        image_url: gp.image_url || null,
        country_of_origin: bestMatch.cand.country || getCountryByPrefix(bestMatch.ean) || 'KZ',
        producer_name: bestMatch.cand.producer || null,
        producer_bin: bestMatch.cand.producerBin || null,
        quality_score: calculateQualityScore({
          ...gp,
          ean: bestMatch.ean,
          storage_conditions: storage,
          cooking_instructions: cooking,
        }),
        match_source: 'npc_recovery_zero_tolerance',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      dbBatch.push(record);
      fs.appendFileSync(CATALOG_JSONL_PATH, JSON.stringify(record) + '\n', 'utf-8');

      console.log(`[RECOVERED ${recoveredCount}] ${gp.name} => ${bestMatch.ean} ("${bestMatch.cand.nameRu}") [score ${bestMatch.score}]`);

      if (dbBatch.length >= 25) {
        await supabase.from('clean_products_v2').upsert(dbBatch, { onConflict: 'ean' });
        dbBatch.length = 0;

        // Save progress checkpoint
        progress.assignedEans = Array.from(assignedEans);
        fs.writeFileSync(PROGRESS_JSON_PATH, JSON.stringify(progress, null, 2), 'utf-8');
      }
    }

    if (idx > 0 && idx % 100 === 0) {
      console.log(`Processed ${idx} / ${unresolved.length} items. Recovered so far: ${recoveredCount}`);
    }
  }

  if (dbBatch.length > 0) {
    await supabase.from('clean_products_v2').upsert(dbBatch, { onConflict: 'ean' });
    progress.assignedEans = Array.from(assignedEans);
    fs.writeFileSync(PROGRESS_JSON_PATH, JSON.stringify(progress, null, 2), 'utf-8');
  }

  console.log(`\n=== RECOVERY FINISHED: Successfully recovered ${recoveredCount} products with genuine factory EANs! ===`);
}

run();
