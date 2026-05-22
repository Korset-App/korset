#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { classifyBarcode } = require('./validate-ean.cjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NPC_API_KEY = process.env.NPC_API_KEY;
const TOKEN_URL = 'https://arbuz.kz/api/v1/auth/token';
const API_BASE = 'https://arbuz.kz/api/v1';
const CONCURRENCY = 10;
const OUT_DIR = path.join(__dirname, '..', 'data', 'subcategory-import');
const LOG_FILE = path.join(OUT_DIR, 'cookies_bakery_optimized.log');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const log = (msg) => { const s = `[${new Date().toISOString()}] ${msg}`; console.log(s); fs.appendFileSync(LOG_FILE, s + '\n'); };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpReq(method, urlStr, headers = {}, body = null, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      hostname: url.hostname, port: 443, path: url.pathname + url.search, method,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...headers },
      timeout: timeoutMs
    };
    const req = require('https').request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function stripHtml(html) {
  if (!html) return null;
  return html.replace(/<br\s*\/?>/gi, ', ').replace(/<\/p>/gi, ', ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/,(\s*,)+/g, ',').trim() || null;
}

function parseNutrition(n) {
  if (!n || typeof n !== 'object') return null;
  const r = {};
  if (n.kcal) r.energy_kcal = parseFloat(String(n.kcal).replace(',', '.'));
  if (n.protein) r.protein_100g = parseFloat(String(n.protein).replace(',', '.'));
  if (n.fats) r.fat_100g = parseFloat(String(n.fats).replace(',', '.'));
  if (n.carbs) r.carbohydrates_100g = parseFloat(String(n.carbs).replace(',', '.'));
  return Object.keys(r).length > 0 ? r : null;
}

function isHalal(characteristics) {
  return Array.isArray(characteristics) && characteristics.some(c => c.name && c.name.toLowerCase().includes('халал'));
}

function cleanQueryForNpc(name) {
  if (!name) return '';
  let q = name.split(',')[0];
  q = q.replace(/\d+([.,]\d+)?\s*(г|кг|л|мл|шт|%)\.?/gi, '').replace(/[-\s.]+$/, '').trim();
  return q;
}

async function getToken() {
  const r = await httpReq('POST', TOKEN_URL, {}, { consumer: 'arbuz-kz.web.mobile', key: '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj' });
  return JSON.parse(r.body).data.token;
}

async function fetchCatalogProducts(token, catalogId) {
  const map = new Map();
  let page = 1;
  while (true) {
    const r = await httpReq('GET', `${API_BASE}/shop/catalog/${catalogId}?page=${page}&limit=40`, { 'Authorization': 'Bearer ' + token });
    if (r.status !== 200) break;
    const d = JSON.parse(r.body).data;
    if (!d || !d.products || !d.products.data || d.products.data.length === 0) break;
    for (const p of d.products.data) {
      if (!map.has(p.id)) map.set(p.id, p);
    }
    const pg = d.products.page;
    if (page >= pg.last) break;
    page++;
  }
  return map;
}

async function apiSearch(query, token) {
  const r = await httpReq('GET', `${API_BASE}/shop/search/products?where[name][c]=${encodeURIComponent(query)}&limit=100`, { 'Authorization': 'Bearer ' + token });
  if (r.status !== 200) return [];
  const j = JSON.parse(r.body);
  return Array.isArray(j.data) ? j.data : (j.data?.items || []);
}

async function npcSearch(name, brand) {
  if (!NPC_API_KEY || !name) return null;
  const cleaned = cleanQueryForNpc(name);
  const queries = [cleaned];
  if (brand && !cleaned.toLowerCase().includes(brand.toLowerCase())) queries.push(`${brand} ${cleaned}`);
  for (const q of [...new Set(queries.filter(q => q && q.length > 2))]) {
    try {
      const r = await httpReq('POST', 'https://nationalcatalog.kz/gw/search/api/v1/search',
        { 'X-API-KEY': NPC_API_KEY, 'Content-Type': 'application/json' },
        { query: q.substring(0, 80), page: 1, size: 5 }, 5000);
      if (r.status === 200) {
        const items = JSON.parse(r.body).items || [];
        const withGtin = items.find(i => i.gtin && /^\d+$/.test(i.gtin.trim()));
        if (withGtin) return withGtin;
        if (items.length > 0) return items[0];
      }
    } catch {}
    await sleep(100);
  }
  return null;
}

async function main() {
  log('=== COOKIES_BAKERY OPTIMIZED IMPORT START ===');
  const token = await getToken();
  log('Token acquired.');

  // Phase 1: Collect products
  log('\n── PHASE 1: Product Discovery ──');
  const allProducts = new Map();

  // Step 1: Parent catalog (225042)
  const parent = await fetchCatalogProducts(token, 225042);
  for (const [id, p] of parent) allProducts.set(id, p);
  log(`Parent 225042: ${parent.size} products`);

  // Step 2: Main children subcategories
  const childCatalogs = [206875, 20249, 20137, 225043, 20435, 224699, 224673, 224474, 200309, 225291, 225642];
  for (const catId of childCatalogs) {
    const products = await fetchCatalogProducts(token, catId);
    let added = 0;
    for (const [id, p] of products) {
      if (!allProducts.has(id)) { allProducts.set(id, p); added++; }
    }
    if (added > 0) log(`  Sub ${catId}: +${added} (total: ${allProducts.size})`);
  }

  // Step 3: Search ALL brands from catalog filter
  log('\n── SEARCH-BASED DISCOVERY ──');
  const catMeta = await httpReq('GET', `${API_BASE}/shop/catalog/225042`, { 'Authorization': 'Bearer ' + token });
  const catData = JSON.parse(catMeta.body).data;
  const brands = catData?.products?.filters?.find(f => f.slug === 'brands')?.values || [];
  const targetCatIds = [225042, 206875, 20249, 20137, 225043, 20435, 224699, 224673, 224474, 200309, 225291, 225642];

  let searchAdded = 0;
  const brandNames = brands.map(b => b.name).filter(n => !n.toLowerCase().includes('arbuz'));
  for (const brand of brandNames) {
    try {
      const found = await apiSearch(brand, token);
      for (const item of found) {
        const cid = item.catalogId ? parseInt(item.catalogId, 10) : null;
        const pid = item.parentCatalogId ? parseInt(item.parentCatalogId, 10) : null;
        if (targetCatIds.includes(cid) || targetCatIds.includes(pid)) {
          const id = parseInt(item.id, 10);
          if (!allProducts.has(id)) {
            allProducts.set(id, item);
            searchAdded++;
          }
        }
      }
    } catch {}
  }

  const keywords = ['печенье', 'вафли', 'пряники', 'крекер', 'бисквит', 'кекс', 'рулет', 'сухари', 'сушки', 'соломка'];
  for (const kw of keywords) {
    try {
      const found = await apiSearch(kw, token);
      for (const item of found) {
        const cid = item.catalogId ? parseInt(item.catalogId, 10) : null;
        const pid = item.parentCatalogId ? parseInt(item.parentCatalogId, 10) : null;
        if (targetCatIds.includes(cid) || targetCatIds.includes(pid)) {
          const id = parseInt(item.id, 10);
          if (!allProducts.has(id)) { allProducts.set(id, item); searchAdded++; }
        }
      }
    } catch {}
  }
  log(`Search added: ${searchAdded}. Total unique: ${allProducts.size}`);

  // Phase 2: Fetch details & Enrich
  log('\n── PHASE 2: Details & Enrichment ──');
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { normalizeCategory } = await import('../src/domain/product/categoryMap.js');
  const { extractAllAttributes } = await import('../src/domain/product/attributeExtractor.js');
  const { normalizeName } = await import('../src/domain/product/nameNormalizer.js');

  const productList = Array.from(allProducts.values());
  const processedProducts = [];
  const stats = { npcMatches: 0, created: 0, enriched: 0, errors: 0 };

  // apiDetail only for products missing barcode in listing
  const listWithBarcode = new Set();
  for (const p of productList) {
    if (p.barcode) { const bc = classifyBarcode(String(p.barcode).trim()); if (bc.valid && bc.ean13) listWithBarcode.add(p.id); }
  }

  for (let i = 0; i < productList.length; i += CONCURRENCY) {
    const batch = productList.slice(i, i + CONCURRENCY);
    const needDetail = batch.filter(p => !listWithBarcode.has(p.id));
    const detailResults = needDetail.length > 0
      ? await Promise.allSettled(needDetail.map(p => httpReq('GET', `${API_BASE}/shop/product/${p.id}`, { 'Authorization': 'Bearer ' + token }).catch(() => null)))
      : [];

    for (let j = 0; j < batch.length; j++) {
      const raw = batch[j];
      let full = raw;

      if (!listWithBarcode.has(raw.id)) {
        const idx = needDetail.indexOf(raw);
        if (idx >= 0 && detailResults[idx].status === 'fulfilled') {
          const detail = JSON.parse(detailResults[idx].value.body).data;
          if (detail && detail.name) full = detail;
        }
      }

      const isArbuz = full.brandName && full.brandName.toLowerCase().includes('arbuz');
      if (isArbuz) { log(`  [skip] Arbuz Select: ${full.name}`); continue; }

      // EAN: from detail, or NPC search
      let ean = full.barcode ? String(full.barcode).trim() : null;
      if (ean) { const bc = classifyBarcode(ean); if (bc.valid && bc.ean13) ean = bc.ean13; else ean = null; }
      if (!ean) {
        const npcItem = await npcSearch(full.name, full.brandName);
        if (npcItem && npcItem.gtin) {
          const bc = classifyBarcode(npcItem.gtin.trim());
          if (bc.valid && bc.ean13) { ean = bc.ean13; stats.npcMatches++; }
        }
      }
      if (!ean) ean = 'arbuz_' + full.id;

      const rawComposition = stripHtml(full.ingredients || full.compound);
      const nutrition = parseNutrition(full.nutrition);
      const halal = isHalal(full.characteristics || []);
      let imageUrl = full.image ? full.image.replace(/w=%w&h=%h/, 'w=400&h=400') : null;

      let normCategory = normalizeCategory(null, null, full.name, full.brandName);
      let category = normCategory.category || 'sweets';
      let subcategory = normCategory.subcategory || 'cookies';

      const lowerName = (full.name || '').toLowerCase();
      if (lowerName.includes('вафл') || lowerName.includes('вафель') || lowerName.includes('торт') || lowerName.includes('пирожн') || lowerName.includes('кекс') || lowerName.includes('рулет') || lowerName.includes('круассан') || lowerName.includes('пирог') || lowerName.includes('выпеч')) {
        subcategory = 'pastries';
      } else { subcategory = 'cookies'; }

      if (category !== 'sweets' || !['cookies', 'pastries'].includes(subcategory)) {
        category = 'sweets';
        subcategory = lowerName.includes('вафл') || lowerName.includes('вафель') || lowerName.includes('торт') || lowerName.includes('пирожн') || lowerName.includes('кекс') || lowerName.includes('рулет') || lowerName.includes('круассан') || lowerName.includes('пирог') || lowerName.includes('выпеч') ? 'pastries' : 'cookies';
      }

      const productRecord = {
        ean, name: normalizeName(full.name, { brand: full.brandName }),
        brand: full.brandName || null, ingredients_raw: rawComposition,
        nutriments_json: nutrition, halal_status: halal ? 'yes' : 'unknown',
        image_url: imageUrl, image_source: imageUrl ? 'arbuz' : null,
        country_of_origin: full.producerCountry || null, manufacturer: full.brandName || null,
        category, subcategory,
        specs_json: { arbuz_id: full.id, arbuz_price: full.priceActual || null, storage_conditions: stripHtml(full.storageConditions) || null },
        source_primary: 'arbuz', source_confidence: 90, is_verified: true, is_active: true,
      };

      const attrs = extractAllAttributes({ name: productRecord.name, category });
      if (attrs.packaging_type) productRecord.packaging_type = attrs.packaging_type;
      if (attrs.fat_percent != null) productRecord.fat_percent = attrs.fat_percent;
      if (attrs.halal_status && attrs.halal_status !== 'unknown') productRecord.halal_status = attrs.halal_status;
      if (attrs.diet_tags_json) productRecord.diet_tags_json = attrs.diet_tags_json;
      productRecord.data_quality_score = Math.min(
        (productRecord.name ? 15 : 0) + (rawComposition ? 25 : 0) + (nutrition ? 15 : 0) +
        (imageUrl ? 15 : 0) + (halal ? 10 : 0) + (full.brandName ? 10 : 0) +
        (!ean.startsWith('arbuz_') ? 5 : 0) + (full.producerCountry ? 5 : 0), 100);
      processedProducts.push(productRecord);
    }
  }

  log(`\nProcessed ${processedProducts.length} items.`);

  // De-duplicate
  const eanMap = new Map();
  processedProducts.sort((a, b) => (b.data_quality_score || 0) - (a.data_quality_score || 0));
  for (const p of processedProducts) { if (!eanMap.has(p.ean)) eanMap.set(p.ean, p); }
  const unique = Array.from(eanMap.values());
  log(`De-duplicated to ${unique.length} unique EAN products.`);

  // Phase 3: Upsert
  log('\n── PHASE 3: Upsert ──');
  const batchSize = 100;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const eans = batch.map(p => p.ean);
    const { data: existing } = await sb.from('global_products').select('ean').in('ean', eans);
    const existingEans = new Set((existing || []).map(r => r.ean));
    const { error } = await sb.from('global_products').upsert(batch, { onConflict: 'ean' });
    if (error) { stats.errors += batch.length; log(`Error batch ${i}: ${error.message}`); }
    else {
      batch.forEach(p => { if (existingEans.has(p.ean)) stats.enriched++; else stats.created++; });
      log(`Batch ${i + 1}-${Math.min(i + batchSize, unique.length)} OK.`);
    }
  }

  log('\n=== IMPORT SUMMARY ===');
  log(`Total discovered: ${allProducts.size}`);
  log(`NPC EAN matches: ${stats.npcMatches}`);
  log(`Created: ${stats.created}`);
  log(`Enriched: ${stats.enriched}`);
  log(`Errors: ${stats.errors}`);

  const outFile = path.join(OUT_DIR, `cookies-bakery-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ testedAt: new Date().toISOString(), stats, results: unique }, null, 2));
  log(`Audit: ${outFile}`);
  log('=== DONE ===');
}

main().catch(e => { log('FATAL: ' + e.message + '\n' + e.stack); process.exit(1); });
