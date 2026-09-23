/**
 * Multi-Source Enrichment Script for Körset Clean Catalog v2.
 * 
 * Enriches clean_products_v2 with:
 * 1. Official Halal Damu (ДУМК) & AHIK certification mapping
 * 2. Inherent natural halal classification
 * 3. Arbuz API composition, description, nutrition & secondary image recovery
 * 4. 14 Technical Regulation Allergens (ТР ТС 022/2011)
 * 5. Recalculated quality score
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required Supabase env variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── 1. ALLERGEN DETECTION ───
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

// ─── 2. HALAL REGISTRY & TAXONOMY ───
const HARAM_MARKERS = [
  'свинина', 'шпик', 'сало', 'бекон', 'ветчина свиная', 'кармин', 'e120', 'е120',
  'желатин свиной', 'спирт', 'вино', 'коньяк', 'ром', 'ликёр', 'ликер', 'пиво'
];

// AHIK (Ассоциация Халал Индустрии Казахстана) certified brands
const AHIK_BRANDS = [
  'кублей', 'ал-халал', 'бижан', 'первомайские деликатесы', 'мясной мир', 'барон',
  'айс', 'рубиком', 'турар', 'масло-дел', 'шедевр', 'наурыз'
];

// Load scraped DUMK Halal Damu companies
const HALAL_DAMU_FILE = path.join(__dirname, '..', 'data', 'halal_damu_companies.json');
let HALAL_DAMU_ENTITIES = [];
if (fs.existsSync(HALAL_DAMU_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(HALAL_DAMU_FILE, 'utf-8'));
    HALAL_DAMU_ENTITIES = raw.map(c => {
      const clean = c.name.toLowerCase()
        .replace(/«|»|"|'|’|`|&#8220;|&#8221;|&#8211;/g, ' ')
        .replace(/тоо|ип|кх|ао|завод|фабрика|компания|лтд|ltd/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return { original: c.name, clean, category: c.category || '' };
    }).filter(c => c.clean.length >= 3);
  } catch (e) {
    console.warn('Could not parse halal_damu_companies.json:', e.message);
  }
}
console.log(`Loaded ${HALAL_DAMU_ENTITIES.length} normalized DUMK Halal Damu entities.`);

// Notable known Halal Damu certified brands
const DUMK_NOTABLE_BRANDS = [
  'амиран', 'родина', 'фудмастер', 'улан', 'султан', 'цесна', 'пиала gold', 'ассам',
  'баян сулу', 'рахат', 'кэмми', 'аралтуз', 'акмаржан', 'эмиль', 'восток-молоко',
  'новый день', 'салтанат', 'саад', 'алға', 'каспи құс', 'everest', 'dada', 'juicy',
  'gracio', 'piko', 'шоро', 'сарыагаш', 'turan', 'tassay'
];

function evaluateHalalCertification(product) {
  const text = `${product.name} ${product.brand || ''} ${product.ingredients_raw || ''}`.toLowerCase();

  // 1. Strict Haram (with word boundary check to avoid false positives like 'ароматизатор' -> 'ром' or 'виноград' -> 'вино')
  for (const marker of HARAM_MARKERS) {
    const re = new RegExp('(?<![а-яёa-z0-9])' + marker + '(?![а-яёa-z0-9])', 'iu');
    if (re.test(text)) {
      return {
        status: 'no',
        certifier: null,
        notes: 'Содержит запрещённые компоненты (харам: ' + marker + ')',
      };
    }
  }

  // 2. DUMK Halal Damu check
  const brand = (product.brand || '').toLowerCase();
  const producer = (product.producer_name || '').toLowerCase();

  if (DUMK_NOTABLE_BRANDS.some(b => brand.includes(b) || text.includes(b))) {
    return {
      status: 'yes',
      certifier: 'dumk_halal_damu',
      notes: 'Сертифицировано ДУМК «Халал Даму»',
    };
  }

  // Check against full Halal Damu scraped registry
  for (const ent of HALAL_DAMU_ENTITIES) {
    if (ent.clean.length >= 4 && (brand.includes(ent.clean) || producer.includes(ent.clean) || text.includes(ent.clean))) {
      return {
        status: 'yes',
        certifier: 'dumk_halal_damu',
        notes: `Сертифицировано ДУМК «Халал Даму» (${ent.original})`,
      };
    }
  }

  // 3. AHIK check
  if (AHIK_BRANDS.some(b => brand.includes(b) || producer.includes(b))) {
    return {
      status: 'yes',
      certifier: 'ahik',
      notes: 'Сертифицировано Ассоциацией Халал Индустрии Казахстана (АХИК)',
    };
  }

  // 4. Inherent Natural Halal (природный халяль)
  const cat = (product.category || '').toLowerCase();

  // Water / mineral water
  if (text.includes('вода ') || text.includes('минеральная') || (cat === 'water_beverages' && text.includes('вода'))) {
    return {
      status: 'yes',
      certifier: 'inherent_natural',
      notes: 'Естественный халяль (природная чистая вода)',
    };
  }

  // Pure tea and unflavored coffee
  if (cat === 'tea_coffee' && (text.includes('чай ') || text.includes('кофе зерновой') || text.includes('кофе молотый'))) {
    return {
      status: 'yes',
      certifier: 'inherent_natural',
      notes: 'Естественный халяль (натуральный чай / кофе без добавок)',
    };
  }

  // Pure vegetable oils
  if (text.includes('масло подсолнечное') || text.includes('масло оливковое') || text.includes('масло кукурузное') || text.includes('extra vergine')) {
    return {
      status: 'yes',
      certifier: 'inherent_natural',
      notes: 'Естественный халяль (растительное масло 100%)',
    };
  }

  // Pure grains, flour, salt, sugar, pasta
  if (cat === 'grocery') {
    if (text.includes('мука ') || text.includes('соль ') || text.includes('сахар ') || text.includes('гречка') ||
        text.includes('рис ') || text.includes('овсянк') || text.includes('геркулес') || text.includes('пшено') ||
        text.includes('булгур') || text.includes('чечевиц') || text.includes('перловка') || text.includes('манка') ||
        text.includes('макароны') || text.includes('спагетти')) {
      return {
        status: 'yes',
        certifier: 'inherent_natural',
        notes: 'Естественный халяль (зерновые, мука, соль, сахар)',
      };
    }
  }

  // Pure fish & seafood
  if (cat === 'meat' || cat === 'frozen' || cat === 'snacks') {
    if (text.includes('рыба') || text.includes('лосось') || text.includes('горбуша') || text.includes('тунец') ||
        text.includes('сайра') || text.includes('шпроты') || text.includes('сельдь') || text.includes('минтай') ||
        text.includes('путассу') || text.includes('форель') || text.includes('икра')) {
      return {
        status: 'yes',
        certifier: 'inherent_natural',
        notes: 'Естественный халяль (рыба и морепродукты)',
      };
    }
  }

  // Pure nuts and seeds
  if (cat === 'snacks' || cat === 'healthy') {
    if (text.includes('семечки') || text.includes('фундук') || text.includes('миндаль') || text.includes('грецкий орех') ||
        text.includes('кешью') || text.includes('фисташки') || text.includes('арахис')) {
      return {
        status: 'yes',
        certifier: 'inherent_natural',
        notes: 'Естественный халяль (орехи и семена)',
      };
    }
  }

  // Fresh & canned fruits, vegetables, jams
  if (cat === 'fruits_veg' || text.includes('варенье') || text.includes('джем ') || text.includes('повидло')) {
    return {
      status: 'yes',
      certifier: 'inherent_natural',
      notes: 'Естественный халяль (фрукты, овощи, варенье)',
    };
  }

  // 100% pure juices
  if (cat === 'water_beverages' && (text.includes('100% сок') || text.includes('сок яблочный') || text.includes('сок апельсиновый') || text.includes('сок томатный'))) {
    return {
      status: 'yes',
      certifier: 'inherent_natural',
      notes: 'Естественный халяль (100% натуральный сок)',
    };
  }

  // 5. Explicit "халал" keyword on package
  if (text.includes('халал') || text.includes('халяль') || text.includes('halal')) {
    return {
      status: 'yes',
      certifier: 'kazstandart',
      notes: 'Маркировка «Халал» на упаковке товара',
    };
  }

  return {
    status: 'unknown',
    certifier: null,
    notes: null,
  };
}

// ─── 3. ARBUZ API CLIENT ───
const ARBUZ_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
let _arbuzToken = null;

async function getArbuzToken() {
  if (_arbuzToken) return _arbuzToken;
  return new Promise((resolve) => {
    const data = JSON.stringify({ consumer: 'arbuz-kz.web.mobile', key: '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj' });
    const req = https.request({
      hostname: 'arbuz.kz',
      port: 443,
      path: '/api/v1/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ARBUZ_USER_AGENT,
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 10000,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          _arbuzToken = j.data?.token || null;
          resolve(_arbuzToken);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

async function searchArbuz(query, token) {
  if (!token || !query) return [];
  const cleanQ = query.split(',')[0].replace(/\d+([.,]\d+)?\s*(г|кг|л|мл|шт|%)/gi, '').trim();
  if (cleanQ.length < 3) return [];

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'arbuz.kz',
      port: 443,
      path: `/api/v1/shop/search/products?where[name][c]=${encodeURIComponent(cleanQ)}&limit=3`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'User-Agent': ARBUZ_USER_AGENT,
        'Accept': 'application/json',
      },
      timeout: 8000,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          resolve(j.data || []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

async function getArbuzProductDetail(id, token) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'arbuz.kz',
      port: 443,
      path: `/api/v1/shop/product/${id}`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'User-Agent': ARBUZ_USER_AGENT,
        'Accept': 'application/json',
      },
      timeout: 8000,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          resolve(j.data || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

function parseNutrition(n) {
  if (!n || typeof n !== 'object') return null;
  const res = {};
  if (n.kcal) res.energy_kcal = parseFloat(String(n.kcal).replace(',', '.'));
  if (n.protein) res.protein_100g = parseFloat(String(n.protein).replace(',', '.'));
  if (n.fats) res.fat_100g = parseFloat(String(n.fats).replace(',', '.'));
  if (n.carbs) res.carbohydrates_100g = parseFloat(String(n.carbs).replace(',', '.'));
  return Object.keys(res).length > 0 ? res : null;
}

// ─── 4. QUALITY SCORE ───
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

// ─── 5. MAIN ENRICHMENT PIPELINE ───
async function run() {
  console.log('=== MULTI-SOURCE ENRICHMENT & HALAL CERTIFIER PIPELINE ===');

  // ─────────────────────────────────────────────────────────
  // PHASE 1: BULK TAXONOMY & HALAL CERTIFIER MAPPING (All rows)
  // ─────────────────────────────────────────────────────────
  console.log('\n--- PHASE 1: BULK HALAL TAXONOMY & ALLERGENS PASS ---');
  let offset = 0;
  const BATCH_SIZE = 500;
  let totalProcessed = 0;
  let halalDamuCount = 0;
  let ahikCount = 0;
  let inherentCount = 0;
  let allergenCount = 0;

  while (true) {
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

      // Allergens detection
      let allergens = row.allergens_json || [];
      if (row.ingredients_raw && (!allergens || allergens.length === 0)) {
        allergens = detectAllergensFromText(row.ingredients_raw);
        if (allergens.length > 0) changed = true;
      }
      if (allergens.length > 0) allergenCount++;

      // Halal Certification & Notes
      const halalEval = evaluateHalalCertification(row);

      let halalStatus = halalEval.status;
      let halalCertifier = halalEval.certifier;
      let halalNotes = halalEval.notes;

      if (halalCertifier === 'dumk_halal_damu') halalDamuCount++;
      if (halalCertifier === 'ahik') ahikCount++;
      if (halalCertifier === 'inherent_natural') inherentCount++;

      if (halalStatus !== row.halal_status || halalCertifier !== row.halal_certifier || halalNotes !== row.halal_notes) {
        changed = true;
      }

      // Cooking & Storage
      let cooking = row.cooking_instructions;
      if (!cooking) {
        cooking = inferStandardCookingInstructions(row.name, row.category, row.description || '');
        if (cooking) changed = true;
      }
      let storage = row.storage_conditions;
      if (!storage) {
        storage = inferStandardStorageConditions(row.category, row.name, row.description || '');
        if (storage) changed = true;
      }

      // Quality score
      const quality = calculateQualityScore({
        ...row,
        allergens_json: allergens,
        halal_status: halalStatus,
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
          halal_status: halalStatus,
          halal_certifier: halalCertifier,
          halal_notes: halalNotes,
          cooking_instructions: cooking,
          storage_conditions: storage,
          quality_score: quality,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (updates.length > 0) {
      const { error: upsertErr } = await supabase.from('clean_products_v2').upsert(updates, { onConflict: 'ean' });
      if (upsertErr) {
        console.error('Batch upsert error:', upsertErr.message);
      }
    }

    totalProcessed += rows.length;
    console.log(`[PHASE 1 PROGRESS] Processed ${totalProcessed} / 11383 rows (Updated: ${updates.length}).`);
    offset += BATCH_SIZE;
  }

  console.log('\n=== PHASE 1 SUMMARY ===');
  console.log(`ДУМК «Халал Даму» Certified: ${halalDamuCount}`);
  console.log(`АХИК Certified: ${ahikCount}`);
  console.log(`Inherent Natural Halal: ${inherentCount}`);
  console.log(`Products with Allergens: ${allergenCount}`);

  // ─────────────────────────────────────────────────────────
  // PHASE 2: TARGETED ARBUZ RECOVERY FOR MISSING INGREDIENTS
  // ─────────────────────────────────────────────────────────
  console.log('\n--- PHASE 2: TARGETED ARBUZ INGREDIENTS RECOVERY ---');
  const arbuzToken = await getArbuzToken();
  if (!arbuzToken) {
    console.warn('Arbuz token unavailable, skipping Phase 2.');
    return;
  }

  // Fetch only products where ingredients_raw IS NULL
  const { data: missingIngr, error: mErr } = await supabase
    .from('clean_products_v2')
    .select('id, ean, name, category, brand')
    .is('ingredients_raw', null);

  if (mErr) {
    console.error('Fetch missing error:', mErr.message);
    return;
  }

  console.log(`Found ${missingIngr.length} products missing ingredients. Starting Arbuz search...`);
  let arbuzEnrichedCount = 0;
  const ARBUZ_BATCH = 20;

  for (let i = 0; i < missingIngr.length; i += ARBUZ_BATCH) {
    const chunk = missingIngr.slice(i, i + ARBUZ_BATCH);
    const updates = [];

    await Promise.all(
      chunk.map(async (row) => {
        try {
          const results = await searchArbuz(row.name, arbuzToken);
          if (results && results.length > 0) {
            const match = results[0];
            const detail = await getArbuzProductDetail(match.id, arbuzToken);
            if (detail) {
              const comp = detail.composition || detail.ingredients;
              if (comp && comp.length > 10) {
                const cleanComp = comp.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                const desc = detail.description ? detail.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
                const nutriments = parseNutrition(detail.nutrition);
                const allergens = detectAllergensFromText(cleanComp);
                const secImg = (detail.gallery && detail.gallery.length > 1) ? detail.gallery[1] : null;

                const halalEval = evaluateHalalCertification({
                  ...row,
                  ingredients_raw: cleanComp,
                });

                updates.push({
                  id: row.id,
                  ean: row.ean,
                  name: row.name,
                  ingredients_raw: cleanComp,
                  description: desc,
                  nutriments_json: nutriments,
                  secondary_image_url: secImg,
                  allergens_json: allergens,
                  halal_status: halalEval.status,
                  halal_certifier: halalEval.certifier,
                  halal_notes: halalEval.notes,
                  quality_score: calculateQualityScore({
                    ...row,
                    ingredients_raw: cleanComp,
                    nutriments_json: nutriments,
                    allergens_json: allergens,
                    halal_status: halalEval.status,
                  }),
                  updated_at: new Date().toISOString(),
                });
                arbuzEnrichedCount++;
              }
            }
          }
        } catch (e) {
          // ignore individual lookup error
        }
      })
    );

    if (updates.length > 0) {
      await supabase.from('clean_products_v2').upsert(updates, { onConflict: 'ean' });
    }

    console.log(`[PHASE 2 PROGRESS] Checked ${Math.min(i + ARBUZ_BATCH, missingIngr.length)} / ${missingIngr.length} (Enriched: ${arbuzEnrichedCount}).`);
    await sleep(250);
  }

  console.log(`\n=== COMPLETED: Recovered ingredients for ${arbuzEnrichedCount} products from Arbuz! ===`);
}

run().catch(e => {
  console.error('Fatal enrichment error:', e);
  process.exit(1);
});
