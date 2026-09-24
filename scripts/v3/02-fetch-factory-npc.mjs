/**
 * Step 02: Fetch Factory Ground Truth from National Catalog (НКТ)
 * Queries the official National Catalog API by GTIN.
 * Extracts factory trade name, Kazakh name, brand, producer, BIN, and TNVED.
 * Caches results locally for 100% resumability.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const NPC_API_KEY = process.env.NPC_API_KEY;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpPost(urlStr, headers, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
      timeout: 10000,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: null });
        }
      });
    });
    req.on('error', () => resolve({ status: 500, body: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 408, body: null }); });
    req.write(data);
    req.end();
  });
}

async function queryNpcByGtin(gtin) {
  if (!NPC_API_KEY || !gtin) return null;
  const res = await httpPost(
    'https://nationalcatalog.kz/gw/search/api/v1/search',
    { 'X-API-KEY': NPC_API_KEY },
    { query: String(gtin), page: 0, size: 5 }
  );

  if (res.status !== 200 || !res.body?.items) return null;

  // Find exact gtin match
  const match = res.body.items.find(it => String(it.gtin).trim() === String(gtin).trim());
  if (!match) return null;

  const brandAttr = (match.attributes || []).find(a => a.code === 'brand')?.valueRu || '';
  const producerAttr = (match.attributes || []).find(a => a.code === 'a4282e5d')?.valueRu || '';
  const producerBin = (match.attributes || []).find(a => a.code === 'producer_identifier')?.valueRu || '';
  const country = (match.attributes || []).find(a => a.code === 'country')?.valueRu || '';
  const tnvedObj = (match.attributes || []).find(a => a.code === 'tnved');

  return {
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
    category_l1: match.categoryNameRuL1 || '',
    category_l4: match.categoryNameRuL4 || '',
  };
}

async function runFetch(inputFile, outputFile, limit = 100) {
  console.log(`=== Step 02: Fetching Factory Data from National Catalog ===`);
  const cachePath = path.join(__dirname, '..', '..', 'data', 'v3_cache', outputFile);
  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch {}
  }

  const itemsPath = path.join(__dirname, '..', '..', 'data', 'v3_cache', inputFile);
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8')).slice(0, limit);

  console.log(`Total items to process: ${items.length} (already cached: ${Object.keys(cache).length})`);

  let fetchedCount = 0;
  let hitCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ean = item.ean;

    if (cache[ean]) {
      continue;
    }

    const npcData = await queryNpcByGtin(ean);
    await sleep(80); // Respect rate limits

    cache[ean] = {
      ean,
      seed_name: item.name,
      seed_brand: item.brand,
      npc: npcData || null,
      fetched_at: new Date().toISOString(),
    };

    fetchedCount++;
  }

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`Step 02 completed. Total in cache: ${Object.keys(cache).length}`);
}

const args = process.argv.slice(2);
const isPilot = !args.includes('--full');
const inputFile = isPilot ? 'pilot_seed_eans.json' : 'seed_eans.json';
const outputFile = isPilot ? 'npc_pilot_results.json' : 'npc_full_results.json';
const limit = isPilot ? 110 : 15000;

runFetch(inputFile, outputFile, limit).catch(console.error);
