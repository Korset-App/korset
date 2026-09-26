import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const LOG_PATH = path.join(__dirname, '..', 'data', 'ai_vision_enrichment_log.jsonl');
const TEMP_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.tmp.jsonl');

async function mergeEnrichedLog() {
  if (!fs.existsSync(LOG_PATH)) {
    console.log('No enrichment log found at:', LOG_PATH);
    return;
  }

  console.log('Loading verified records from log...');
  const verifiedMap = new Map();
  const logRl = readline.createInterface({
    input: fs.createReadStream(LOG_PATH),
    crlfDelay: Infinity
  });

  for await (const line of logRl) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    // Only process successfully enriched records (not rejected ones)
    if (r.image_url && r.ai_verification?.isMatch && r.ai_verification?.confidence >= 0.85) {
      verifiedMap.set(r.ean, r);
    }
  }

  console.log(`Loaded ${verifiedMap.size} verified enriched records to merge.`);
  if (verifiedMap.size === 0) {
    console.log('Nothing to merge.');
    return;
  }

  const masterRl = readline.createInterface({
    input: fs.createReadStream(MASTER_PATH),
    crlfDelay: Infinity
  });
  const outStream = fs.createWriteStream(TEMP_PATH, { flags: 'w' });

  let totalMaster = 0;
  let mergedCount = 0;

  for await (const line of masterRl) {
    if (!line.trim()) continue;
    totalMaster++;
    const item = JSON.parse(line);

    const update = verifiedMap.get(item.ean);
    if (update) {
      mergedCount++;
      // Non-destructive update: fill missing attributes
      if (!item.image_url) item.image_url = update.image_url;
      if (!item.images || item.images.length === 0) item.images = update.images;
      if (!item.original_image_url) item.original_image_url = update.image_url;

      if (!item.brand && update.brand) item.brand = update.brand;
      if (!item.ingredients_raw && update.ingredients_raw) item.ingredients_raw = update.ingredients_raw;
      if (!item.description && update.description) item.description = update.description;
      if (!item.country_of_origin && update.country_of_origin) item.country_of_origin = update.country_of_origin;
      if (!item.storage_conditions && update.storage_conditions) item.storage_conditions = update.storage_conditions;
      if (update.halal_status === 'yes') item.halal_status = 'yes';

      if ((!item.nutriments_json || Object.keys(item.nutriments_json).length === 0) && update.nutriments_json) {
        item.nutriments_json = update.nutriments_json;
      }
    }

    outStream.write(JSON.stringify(item) + '\n');
  }

  await new Promise(res => outStream.end(res));

  if (totalMaster === 58643) {
    fs.renameSync(TEMP_PATH, MASTER_PATH);
    console.log(`SUCCESS: Merged ${mergedCount} verified records into master catalog (total 58643 intact).`);
  } else {
    throw new Error(`Master integrity check failed: expected 58643, got ${totalMaster}`);
  }
}

mergeEnrichedLog().catch(console.error);
