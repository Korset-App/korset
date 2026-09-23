/**
 * Autonomous Clean Products v2 Builder.
 * Zero-Tolerance matching across 1C Registry and National Catalog (НКТ).
 * Isolated stream to clean_catalog_v2.jsonl and Supabase clean_products_v2.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { validateBarcodeStrict, getCountryByPrefix } from './utils/ean-validator.mjs';
import {
  extractQuantityAndUnit,
  extractFatPercent,
  checkZeroToleranceMatch,
} from './utils/attribute-matcher.mjs';
import { inferStandardCookingInstructions } from './utils/cooking-instructions-extractor.mjs';
import { inferStandardStorageConditions, extractShelfLife } from './utils/storage-conditions-extractor.mjs';
import { queryNpc, queryBarcodeListRu } from './utils/external-barcode-clients.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Supabase environment variables not set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CATALOG_JSONL_PATH = path.join(DATA_DIR, 'clean_catalog_v2.jsonl');
const PROGRESS_JSON_PATH = path.join(DATA_DIR, 'clean_catalog_v2_progress.json');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    dryRun: false,
    limit: 0,
    offset: 0,
    delay: 350,
    dbBatch: 25,
  };
  for (const arg of args) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--limit=')) opts.limit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--offset=')) opts.offset = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--delay=')) opts.delay = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--db-batch=')) opts.dbBatch = parseInt(arg.split('=')[1], 10);
  }
  return opts;
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_JSON_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_JSON_PATH, 'utf-8'));
      return {
        processedIds: new Set(data.processedIds || []),
        assignedEans: new Set(data.assignedEans || []),
        stats: data.stats || { matched: 0, unresolved: 0, collisions: 0, total: 0 },
      };
    } catch (e) {
      console.warn('Could not read progress file, starting fresh:', e.message);
    }
  }
  return {
    processedIds: new Set(),
    assignedEans: new Set(),
    stats: { matched: 0, unresolved: 0, collisions: 0, total: 0 },
  };
}

function saveProgress(progress) {
  const payload = {
    updatedAt: new Date().toISOString(),
    processedIds: Array.from(progress.processedIds),
    assignedEans: Array.from(progress.assignedEans),
    stats: progress.stats,
  };
  fs.writeFileSync(PROGRESS_JSON_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}

function appendToJsonl(record) {
  fs.appendFileSync(CATALOG_JSONL_PATH, JSON.stringify(record) + '\n', 'utf-8');
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

async function findBestBarcode(product, assignedEans, delayMs) {
  const currentEanValidation = validateBarcodeStrict(product.ean);

  // 1. If current EAN is already genuine & valid, verify it
  if (currentEanValidation.valid && !product.ean.startsWith('arbuz_') && !product.ean.startsWith('kaspi_')) {
    if (!assignedEans.has(currentEanValidation.ean)) {
      return {
        ean: currentEanValidation.ean,
        source: 'verified_primary',
        evidence: { currentEan: product.ean },
      };
    }
  }

  // 2. Search candidates in 1C Registry (barcode-list.ru)
  let bclCandidates = [];
  try {
    bclCandidates = await queryBarcodeListRu(`${product.brand || ''} ${product.name}`.trim());
    await sleep(delayMs);
  } catch {}

  for (const cand of bclCandidates) {
    const val = validateBarcodeStrict(cand.barcode);
    if (!val.valid) continue;

    const match = checkZeroToleranceMatch(
      { name: product.name, brand: product.brand, quantity: product.quantity },
      { name: cand.name, brand: product.brand, quantity: cand.name }
    );

    if (match.isMatch) {
      if (!assignedEans.has(val.ean)) {
        return {
          ean: val.ean,
          source: '1c_microinvest_registry',
          evidence: { matchedName: cand.name, score: match.score },
        };
      }
    }
  }

  // 3. Search candidates in National Catalog (НКТ)
  let npcCandidates = [];
  try {
    const query = `${product.brand || ''} ${product.name}`.trim();
    npcCandidates = await queryNpc(query, 6);
    await sleep(delayMs);
  } catch {}

  for (const cand of npcCandidates) {
    if (!cand.gtin) continue;
    const val = validateBarcodeStrict(cand.gtin);
    if (!val.valid) continue;

    const match = checkZeroToleranceMatch(
      { name: product.name, brand: product.brand, quantity: product.quantity },
      { name: cand.nameRu, brand: cand.brand || product.brand, quantity: cand.quantityStr || cand.nameRu }
    );

    if (match.isMatch) {
      if (!assignedEans.has(val.ean)) {
        return {
          ean: val.ean,
          source: 'npc_gtin',
          nameKk: cand.nameKk,
          producer: cand.producer,
          producerBin: cand.producerBin,
          country: cand.country,
          evidence: { npcId: cand.id, matchedName: cand.nameRu, score: match.score },
        };
      }
    }
  }

  return null;
}

async function insertBatchToSupabase(records) {
  if (!records.length) return;
  const { error } = await supabase.from('clean_products_v2').upsert(records, { onConflict: 'ean' });
  if (error) {
    console.error('Supabase batch insert error:', error.message);
  }
}

async function run() {
  const opts = parseArgs();
  console.log('=== KÖRSET CLEAN CATALOG V2 BUILDER ===');
  console.log(`Config: dryRun=${opts.dryRun}, limit=${opts.limit}, offset=${opts.offset}, delay=${opts.delay}ms`);

  const progress = loadProgress();
  console.log(`Loaded progress: ${progress.processedIds.size} already processed, ${progress.assignedEans.size} active EANs.`);

  let dbBuffer = [];
  let currentOffset = opts.offset;
  const PAGE_SIZE = 250;
  let totalProcessedThisRun = 0;

  while (true) {
    console.log(`\n[DB] Fetching products page from offset ${currentOffset}...`);
    const { data: products, error } = await supabase
      .from('global_products')
      .select('*')
      .order('id', { ascending: true })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch global_products:', error.message);
      break;
    }
    if (!products || products.length === 0) {
      console.log('No more products in global_products.');
      break;
    }

    for (const prod of products) {
      if (opts.limit > 0 && totalProcessedThisRun >= opts.limit) {
        console.log(`Reached limit of ${opts.limit} products.`);
        break;
      }

      if (progress.processedIds.has(prod.id)) {
        continue;
      }

      totalProcessedThisRun++;
      progress.stats.total++;

      try {
        // Step 1: Find best authentic barcode
        const matchResult = await findBestBarcode(prod, progress.assignedEans, opts.delay);

      if (matchResult && matchResult.ean) {
        progress.stats.matched++;
        progress.assignedEans.add(matchResult.ean);

        const qty = extractQuantityAndUnit(prod.name);
        const fat = extractFatPercent(prod.name);
        const cooking = inferStandardCookingInstructions(prod.name, prod.category, prod.description || '');
        const storage = inferStandardStorageConditions(prod.category, prod.name, prod.description || '');
        const shelfLife = extractShelfLife(prod.description || '');
        const country = matchResult.country || getCountryByPrefix(matchResult.ean.slice(0, 3)) || prod.country_of_origin;

        const cleanRecord = {
          ean: matchResult.ean,
          name: prod.name,
          name_kz: matchResult.nameKk || prod.name_kz || null,
          brand: prod.brand || null,
          category: prod.category || null,
          subcategory: prod.subcategory || null,
          quantity: qty ? qty.display : null,
          quantity_value: qty ? qty.normalizedValue : null,
          quantity_unit: qty ? qty.baseUnit : null,
          fat_percent: fat,
          flavor: null,
          package_type: null,
          storage_conditions: storage,
          shelf_life: shelfLife,
          cooking_instructions: cooking,
          description: prod.description || null,
          ingredients_raw: prod.ingredients_raw || null,
          ingredients_json: prod.ingredients_parsed || [],
          nutriments_json: prod.nutriments_json || {},
          halal_status: prod.halal_status || 'unknown',
          allergens_json: prod.allergens || [],
          image_url: prod.image_url || null,
          secondary_image_url: null,
          images_json: prod.image_url ? [prod.image_url] : [],
          country_of_origin: country,
          producer_name: matchResult.producer || null,
          producer_bin: matchResult.producerBin || null,
          match_source: matchResult.source,
        };

        cleanRecord.quality_score = calculateQualityScore(cleanRecord);

        // Write to local JSONL immediately
        appendToJsonl(cleanRecord);
        dbBuffer.push(cleanRecord);

        if (progress.stats.matched % 10 === 0) {
          console.log(
            `[MATCH #${progress.stats.matched}] EAN: ${cleanRecord.ean} | ${cleanRecord.name.slice(0, 45)} | Source: ${cleanRecord.match_source}`
          );
        }
      } else {
        progress.stats.unresolved++;
      }
      } catch (err) {
        console.error(`[WARN] Error processing product ${prod.id}:`, err.message);
        progress.stats.unresolved++;
      }

      progress.processedIds.add(prod.id);

      // Flush to Supabase in batches
      if (!opts.dryRun && dbBuffer.length >= opts.dbBatch) {
        await insertBatchToSupabase(dbBuffer);
        dbBuffer = [];
      }

      // Save progress file periodically
      if (progress.stats.total % 25 === 0) {
        saveProgress(progress);
      }
    }

    if (opts.limit > 0 && totalProcessedThisRun >= opts.limit) {
      break;
    }

    currentOffset += PAGE_SIZE;
  }

  // Final flush
  if (!opts.dryRun && dbBuffer.length > 0) {
    await insertBatchToSupabase(dbBuffer);
    dbBuffer = [];
  }

  saveProgress(progress);
  console.log('\n=== BUILD COMPLETE ===');
  console.log(`Total Scanned: ${progress.stats.total}`);
  console.log(`Strictly Matched: ${progress.stats.matched}`);
  console.log(`Unresolved: ${progress.stats.unresolved}`);
  console.log(`Total Scannable EANs in Clean Catalog: ${progress.assignedEans.size}`);
}

run().catch(e => {
  console.error('Fatal builder error:', e);
  process.exit(1);
});
