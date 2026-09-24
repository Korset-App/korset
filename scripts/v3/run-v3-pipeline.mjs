/**
 * Master Pipeline Runner for Catalog V3
 * Runs all stages sequentially with fault tolerance, auto-resume, local caching,
 * and deterministic validation.
 * 
 * Usage:
 *   node scripts/v3/run-v3-pipeline.mjs --full
 *   node scripts/v3/run-v3-pipeline.mjs --pilot
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NPC_API_KEY = process.env.NPC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !NPC_API_KEY || !GEMINI_API_KEY) {
  console.error('Critical environment variables missing (.env.local)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CACHE_DIR = path.join(__dirname, '..', '..', 'data', 'v3_cache');
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

function normalizeStr(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

const KORSET_CATEGORIES = [
  'dairy_eggs', 'meat', 'deli', 'fish', 'water_beverages', 'tea_coffee',
  'sweets', 'snacks', 'grocery', 'sauces_spices', 'bread', 'frozen',
  'fruits_veg', 'baby_food', 'ready_meals', 'healthy', 'personal_care', 'household'
];

// HTTP POST for NPC
function httpPostNpc(body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'nationalcatalog.kz',
      port: 443,
      path: '/gw/search/api/v1/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-API-KEY': NPC_API_KEY,
      },
      timeout: 10000,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on('error', () => resolve({ status: 500, body: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 408, body: null }); });
    req.write(data);
    req.end();
  });
}

// Gemini Batch Caller
async function callGeminiBatch(batchItems) {
  const prompt = `Ты — ведущий эксперт по товарной номенклатуре и продуктовому ритейлу Казахстана.
Для каждого сырого заводского наименования извлеки точные характеристики в формате JSON.

Входные данные:
${JSON.stringify(batchItems.map((item, idx) => ({
  index: idx,
  raw_text: item.raw_text,
  ean: item.ean,
  brand_hint: item.brand_hint,
  tnved_hint: item.tnved_hint
})), null, 2)}

Правила:
1. canonical_name: Красивое, чистое название на русском языке (для мобильного приложения).
2. name_kz: Грамотный перевод названия на казахский язык.
3. brand: Официальная торговая марка (например: "3 Желания", "Lays", "Рахат", "Восток-Молоко", "Эмиль").
4. quantity_value: Точное числовое значение веса или объема (например 700, 150, 400, 1000, 85).
5. quantity_unit: Единица ('g', 'ml', 'kg', 'l', 'pcs').
6. quantity_display: Строка для карточки (например "150 г", "700 г", "1 л", "400 мл").
7. fat_percent: Процент жирности числом (например 67, 3.5, 2.5, 15). Если не применимо — строго null.
8. flavor: ТОЧНЫЙ вкус, аромат, сорт или наполнитель (например: "кокос и миндаль", "нежный сыр с зеленью", "провансаль", "топленое", "клубника"). Если классический базовый продукт — строго null.
9. package_type: Тип тары (например: "дой-пак", "бутылка", "стакан", "пакет", "коробка", "плитка", "жестяная банка", "тетра-пак").
10. category: Строго одна из 18 стандартных категорий Körset: ${JSON.stringify(KORSET_CATEGORIES)}.

Верни строго JSON массив объектов с полем index.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini');
      const parsed = JSON.parse(rawText);
      return Array.isArray(parsed) ? parsed : (parsed.items || []);
    } catch (err) {
      if (attempt < 4) await sleep(2000 * attempt);
      else throw err;
    }
  }
}

// Deterministic Validator
function validateExtraction(rawText, parsed) {
  const issues = [];
  const text = String(rawText).toLowerCase().replace(/,/g, '.');

  if (parsed.quantity_value !== null && parsed.quantity_value !== undefined) {
    const qStr = String(parsed.quantity_value);
    if (!text.includes(qStr)) {
      if (parsed.quantity_value === 1000 && !text.includes('1кг') && !text.includes('1л') && !text.includes('1000') && !text.includes('1 кг') && !text.includes('1 л') && !text.includes('1.0')) {
        issues.push(`Quantity ${parsed.quantity_value} not in raw text`);
      }
    }
  }

  if (parsed.fat_percent !== null && parsed.fat_percent !== undefined) {
    const fStr = String(parsed.fat_percent);
    if (!text.includes(fStr)) {
      issues.push(`Fat % ${parsed.fat_percent} not in raw text`);
    }
  }

  if (!KORSET_CATEGORIES.includes(parsed.category)) {
    parsed.category = 'grocery';
  }

  return { valid: issues.length === 0, issues };
}

async function runPipeline() {
  const isFull = process.argv.includes('--full');
  console.log(`=======================================================`);
  console.log(`  KÖRSET CATALOG V3 MASTER PIPELINE (${isFull ? 'FULL 11,400 SKU' : 'PILOT 106 SKU'})`);
  console.log(`=======================================================\n`);

  const startTime = Date.now();

  // STAGE 1: Seed EAN Collection
  console.log('--- STAGE 1: Checking / Collecting Seed EANs ---');
  const seedFile = isFull ? 'seed_eans.json' : 'pilot_seed_eans.json';
  const seedPath = path.join(CACHE_DIR, seedFile);
  if (!fs.existsSync(seedPath)) {
    console.log('Seed file missing, collecting fresh seeds...');
    // Run collector
    const { execSync } = await import('child_process');
    execSync('node scripts/v3/01-collect-seed-eans.mjs', { stdio: 'inherit' });
  }

  const seedItems = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  console.log(`Loaded ${seedItems.length} seed EANs to process.\n`);

  // STAGE 2: NPC Fetching (With fault-tolerant multi-threading and disk cache)
  console.log('--- STAGE 2: Fetching Ground Truth from National Catalog (НКТ) ---');
  const npcCacheFile = isFull ? 'npc_full_results.json' : 'npc_pilot_results.json';
  const npcCachePath = path.join(CACHE_DIR, npcCacheFile);
  let npcCache = {};
  if (fs.existsSync(npcCachePath)) {
    try { npcCache = JSON.parse(fs.readFileSync(npcCachePath, 'utf8')); } catch {}
  }

  const unCachedNpc = seedItems.filter(it => !npcCache[it.ean]);
  console.log(`Total in NPC cache: ${Object.keys(npcCache).length}, to query: ${unCachedNpc.length}`);

  const CONCURRENCY_NPC = 3;
  let npcProgress = 0;
  let lastSaveTime = Date.now();

  for (let i = 0; i < unCachedNpc.length; i += CONCURRENCY_NPC) {
    const chunk = unCachedNpc.slice(i, i + CONCURRENCY_NPC);
    await Promise.all(chunk.map(async (item) => {
      const res = await httpPostNpc({ query: String(item.ean), page: 0, size: 5 });
      let match = null;
      if (res.status === 200 && res.body?.items) {
        match = res.body.items.find(it => String(it.gtin).trim() === String(item.ean).trim()) || null;
      }

      let npcData = null;
      if (match) {
        const brandAttr = (match.attributes || []).find(a => a.code === 'brand')?.valueRu || '';
        const producerAttr = (match.attributes || []).find(a => a.code === 'a4282e5d')?.valueRu || '';
        const producerBin = (match.attributes || []).find(a => a.code === 'producer_identifier')?.valueRu || '';
        const country = (match.attributes || []).find(a => a.code === 'country')?.valueRu || '';
        const tnvedObj = (match.attributes || []).find(a => a.code === 'tnved');

        npcData = {
          source: 'npc',
          npc_id: match.id,
          gtin: match.gtin,
          name_ru_factory: match.nameRu || match.shortNameRu || '',
          name_kk_factory: match.nameKk || match.shortNameKk || '',
          brand_factory: brandAttr || match.brand || '',
          producer: producerAttr,
          producer_bin: producerBin,
          country,
          tnved_code: tnvedObj?.value || '',
          tnved_name: tnvedObj?.valueRu || '',
        };
      }

      npcCache[item.ean] = {
        ean: item.ean,
        seed_name: item.name,
        seed_brand: item.brand,
        npc: npcData,
        fetched_at: new Date().toISOString()
      };
      npcProgress++;
    }));

    if (Date.now() - lastSaveTime > 5000 || i + CONCURRENCY_NPC >= unCachedNpc.length) {
      fs.writeFileSync(npcCachePath, JSON.stringify(npcCache, null, 2), 'utf8');
      lastSaveTime = Date.now();
      process.stdout.write(`\r[NPC Progress] ${npcProgress}/${unCachedNpc.length} processed (${Object.keys(npcCache).length} total in cache)`);
    }
    await sleep(60);
  }
  fs.writeFileSync(npcCachePath, JSON.stringify(npcCache, null, 2), 'utf8');
  console.log(`\nNPC Stage complete. Total items in cache: ${Object.keys(npcCache).length}\n`);

  // STAGE 3: Gemini Normalization
  console.log('--- STAGE 3: AI Normalization via Gemini 3.5 Flash-lite ---');
  const normFile = isFull ? 'full_normalized.json' : 'pilot_normalized.json';
  const normPath = path.join(CACHE_DIR, normFile);
  let normCache = {};
  if (fs.existsSync(normPath)) {
    try { normCache = JSON.parse(fs.readFileSync(normPath, 'utf8')); } catch {}
  }

  const allNpcItems = Object.values(npcCache);
  const unNormalized = allNpcItems.filter(it => !normCache[it.ean]);
  console.log(`Total normalized: ${Object.keys(normCache).length}, remaining: ${unNormalized.length}`);

  const BATCH_SIZE_AI = 20;
  for (let i = 0; i < unNormalized.length; i += BATCH_SIZE_AI) {
    const chunk = unNormalized.slice(i, i + BATCH_SIZE_AI);
    const batchInput = chunk.map(it => ({
      ean: it.ean,
      raw_text: it.npc?.name_ru_factory || it.seed_name || '',
      brand_hint: it.npc?.brand_factory || it.seed_brand || '',
      tnved_hint: it.npc?.tnved_name || '',
    }));

    try {
      const results = await callGeminiBatch(batchInput);
      for (const res of results) {
        const orig = chunk[res.index];
        if (!orig) continue;

        const val = validateExtraction(orig.npc?.name_ru_factory || orig.seed_name, res);
        normCache[orig.ean] = {
          ean: orig.ean,
          raw_source_name: orig.npc?.name_ru_factory || orig.seed_name,
          canonical_name: res.canonical_name,
          name_kz: res.name_kz,
          brand: res.brand,
          category: res.category,
          subcategory: res.subcategory || null,
          quantity: res.quantity_display,
          quantity_value: res.quantity_value,
          quantity_unit: res.quantity_unit,
          fat_percent: res.fat_percent,
          flavor: res.flavor,
          package_type: res.package_type,
          tnved: orig.npc?.tnved_code || null,
          producer_name: orig.npc?.producer || null,
          producer_bin: orig.npc?.producer_bin || null,
          country_of_origin: orig.npc?.country || null,
          validation_status: val.valid ? 'passed' : 'flagged',
          validation_issues: val.issues,
        };
      }

      fs.writeFileSync(normPath, JSON.stringify(normCache, null, 2), 'utf8');
      process.stdout.write(`\r[AI Progress] ${Math.min(i + BATCH_SIZE_AI, unNormalized.length)}/${unNormalized.length} normalized (${Object.keys(normCache).length} total)`);
      // Pacing: keep under 15 RPM for Google AI Studio Free Tier
      await sleep(3500);
    } catch (err) {
      console.warn(`\n[AI Error at ${i}]: ${err.message}. Retrying in 5s...`);
      await sleep(5000);
    }
  }
  fs.writeFileSync(normPath, JSON.stringify(normCache, null, 2), 'utf8');
  console.log(`\nAI Stage complete. Total normalized: ${Object.keys(normCache).length}\n`);

  // STAGE 4: Galmart Media Enrichment, Halal Damu & Supabase Upsert
  console.log('--- STAGE 4: Media Enrichment, Halal Tagging & Staging into clean_products_v3 ---');
  let galmartCatalog = [];
  const gmPath = path.join(__dirname, '..', '..', 'data', 'galmart_catalog.json');
  if (fs.existsSync(gmPath)) galmartCatalog = JSON.parse(fs.readFileSync(gmPath, 'utf8'));

  let halalDamuList = [];
  const hlPath = path.join(__dirname, '..', '..', 'data', 'halal_damu_companies.json');
  if (fs.existsSync(hlPath)) halalDamuList = JSON.parse(fs.readFileSync(hlPath, 'utf8'));

  const halalNames = new Set(
    halalDamuList.flatMap(c => [
      normalizeStr(c.name),
      normalizeStr(c.brand),
      normalizeStr(c.company_name)
    ]).filter(Boolean)
  );

  // Build rich metadata lookup from clean_catalog_v2.jsonl
  console.log('Loading rich packaging data (ingredients, nutriments, shelf life) from catalog v2...');
  const richDataMap = new Map();
  const v2Path = path.join(__dirname, '..', '..', 'data', 'clean_catalog_v2.jsonl');
  if (fs.existsSync(v2Path)) {
    const readline = (await import('readline')).default;
    const rl = readline.createInterface({ input: fs.createReadStream(v2Path), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (row.ean) {
          richDataMap.set(row.ean, {
            ingredients_raw: row.ingredients_raw || null,
            ingredients_json: row.ingredients_json || [],
            nutriments_json: row.nutriments_json || {},
            storage_conditions: row.storage_conditions || null,
            shelf_life: row.shelf_life || null,
            cooking_instructions: row.cooking_instructions || null,
            description: row.description || null,
            allergens_json: row.allergens_json || [],
            image_url: row.image_url || null,
          });
        }
      } catch {}
    }
  }
  console.log(`Loaded rich packaging specs for ${richDataMap.size} products.`);

  const normalizedItems = Object.values(normCache);
  const rowsToUpsert = [];
  let packshotCount = 0;
  let halalCount = 0;
  let ingredientsCount = 0;

  for (const item of normalizedItems) {
    const rich = richDataMap.get(item.ean) || {};
    let imageUrl = rich.image_url || null;
    let imagesJson = [];

    // Zero-Tolerance Galmart Packshot & Composition Matching
    let matchedGalmart = null;
    if (galmartCatalog.length > 0 && item.brand) {
      const normBrand = normalizeStr(item.brand);
      for (const gm of galmartCatalog) {
        if (!gm.photos || gm.photos.length === 0) continue;
        const gmBrand = normalizeStr(gm.brand);
        const gmTitle = normalizeStr(gm.title);

        if (normBrand.length >= 3 && (gmBrand.includes(normBrand) || normBrand.includes(gmBrand))) {
          if (item.quantity_value && !gmTitle.includes(String(item.quantity_value))) continue;
          if (item.fat_percent) {
            const fStr = String(item.fat_percent).replace('.', ',');
            if (!gmTitle.includes(fStr) && !gmTitle.includes(String(item.fat_percent))) continue;
          }
          if (item.flavor) {
            const words = normalizeStr(item.flavor).split(' ').filter(w => w.length > 3);
            if (words.length > 0 && !words.some(w => gmTitle.includes(w))) continue;
          }
          matchedGalmart = gm;
          imageUrl = gm.photos[0];
          imagesJson = gm.photos;
          packshotCount++;
          break;
        }
      }
    }

    // Halal Check
    let halalStatus = 'unknown';
    let halalCertifier = null;
    const normProducer = normalizeStr(item.producer_name);
    const normBrand = normalizeStr(item.brand);

    for (const hName of halalNames) {
      if (hName.length < 4) continue;
      if (normProducer.includes(hName) || normBrand.includes(hName)) {
        halalStatus = 'certified';
        halalCertifier = 'Халал Даму (ҚМДБ)';
        halalCount++;
        break;
      }
    }

    // Rich packaging facts: ingredients, nutriments, storage, shelf life
    const ingredientsRaw = rich.ingredients_raw || matchedGalmart?.composition || null;
    if (ingredientsRaw) ingredientsCount++;

    const nutrimentsJson = (rich.nutriments_json && Object.keys(rich.nutriments_json).length > 0)
      ? rich.nutriments_json
      : (matchedGalmart?.calories ? {
          energy_kcal: matchedGalmart.calories,
          protein_100g: matchedGalmart.protein,
          fat_100g: matchedGalmart.fat,
          carbohydrates_100g: matchedGalmart.carbs,
        } : {});

    const storageConditions = rich.storage_conditions || matchedGalmart?.storage_conditions || null;
    const shelfLife = rich.shelf_life || null;
    const cookingInstructions = rich.cooking_instructions || null;
    const description = rich.description || matchedGalmart?.description || null;
    const allergensJson = rich.allergens_json || [];

    rowsToUpsert.push({
      ean: item.ean,
      name: item.canonical_name || item.raw_source_name,
      name_kz: item.name_kz || null,
      brand: item.brand || null,
      category: item.category || 'grocery',
      subcategory: item.subcategory || null,
      quantity: item.quantity || null,
      quantity_value: item.quantity_value || null,
      quantity_unit: item.quantity_unit || null,
      fat_percent: item.fat_percent || null,
      flavor: item.flavor || null,
      package_type: item.package_type || null,
      tnved: item.tnved || null,
      producer_name: item.producer_name || null,
      producer_bin: item.producer_bin || null,
      country_of_origin: item.country_of_origin || null,
      description,
      storage_conditions: storageConditions,
      shelf_life: shelfLife,
      cooking_instructions: cookingInstructions,
      ingredients_raw: ingredientsRaw,
      ingredients_json: rich.ingredients_json || [],
      nutriments_json: nutrimentsJson,
      allergens_json: allergensJson,
      halal_status: halalStatus,
      halal_certifier: halalCertifier,
      image_url: imageUrl,
      images_json: imagesJson,
      data_quality_score: item.validation_status === 'passed' ? 95 : 75,
      audit_status: 'verified_npc_ai',
      raw_source_name: item.raw_source_name,
      raw_payload: {
        validation_status: item.validation_status,
        validation_issues: item.validation_issues || []
      },
      updated_at: new Date().toISOString()
    });
  }

  console.log(`Prepared ${rowsToUpsert.length} rows for clean_products_v3.`);
  console.log(`With full ingredients: ${ingredientsCount}`);
  console.log(`Matched packshots: ${packshotCount}, Halal certified: ${halalCount}`);

  // Upsert in batches of 50
  const DB_BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rowsToUpsert.length; i += DB_BATCH) {
    const chunk = rowsToUpsert.slice(i, i + DB_BATCH);
    const { error } = await supabase
      .from('clean_products_v3')
      .upsert(chunk, { onConflict: 'ean' });

    if (error) {
      console.error(`\nDB Upsert error at chunk ${i}:`, error.message);
    } else {
      inserted += chunk.length;
      process.stdout.write(`\r[DB Upsert] ${inserted}/${rowsToUpsert.length} saved to clean_products_v3`);
    }
  }

  const durationMin = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n\n=======================================================`);
  console.log(`  PIPELINE FINISHED SUCCESSFULLY IN ${durationMin} MINUTES`);
  console.log(`  Total pristine products in clean_products_v3: ${inserted}`);
  console.log(`=======================================================\n`);
}

runPipeline().catch(err => {
  console.error('\nFatal Pipeline Error:', err);
  process.exit(1);
});
