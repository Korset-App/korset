const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { classifyBarcode } = require('./validate-ean.cjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NPC_API_KEY = process.env.NPC_API_KEY;
const API_BASE = 'https://arbuz.kz/api/v1';
const CONCURRENCY = 10;
const OUT_DIR = path.join(__dirname, '..', 'data', 'subcategory-import');

const log = [];
function writeLog(msg) { const s = `[${new Date().toISOString()}] ${msg}`; log.push(s); console.log(s); }

async function httpReq(method, urlStr, headers = {}, body = null, timeoutMs = 10000) {
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

function stripHtml(html) { if (!html) return null; return html.replace(/<br\s*\/?>/gi, ', ').replace(/<\/p>/gi, ', ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/,(\s*,)+/g, ',').trim() || null; }

function parseNutrition(n) {
  if (!n || typeof n !== 'object') return null;
  const r = {};
  if (n.kcal) r.energy_kcal = parseFloat(String(n.kcal).replace(',', '.'));
  if (n.protein) r.protein_100g = parseFloat(String(n.protein).replace(',', '.'));
  if (n.fats) r.fat_100g = parseFloat(String(n.fats).replace(',', '.'));
  if (n.carbs) r.carbohydrates_100g = parseFloat(String(n.carbs).replace(',', '.'));
  return Object.keys(r).length > 0 ? r : null;
}

function isHalal(characteristics) { return Array.isArray(characteristics) && characteristics.some(c => c.name && c.name.toLowerCase().includes('халал')); }

function cleanQueryForNpc(name) {
  if (!name) return '';
  let q = name.split(',')[0];
  return q.replace(/\d+([.,]\d+)?\s*(г|кг|л|мл|шт|%)\.?/gi, '').replace(/[-\s.]+$/, '').trim();
}

async function fetchCatalog(token, catId, page, limit) {
  const r = await httpReq('GET', `${API_BASE}/shop/catalog/${catId}?page=${page}&limit=${limit}`, { 'Authorization': 'Bearer ' + token }, null, 15000);
  if (r.status !== 200) return null;
  return JSON.parse(r.body).data;
}

async function collectAllProducts(token) {
  const all = new Map();
  const catsToScrape = [225042, 206875, 20249, 20137, 225043, 20435, 224699, 224673, 224474, 200309, 225291, 225642];

  for (const catId of catsToScrape) {
    const root = await fetchCatalog(token, catId, 1, 40);
    if (!root || !root.products) continue;
    let page = 1, total = Infinity;
    while (page <= total) {
      const data = page === 1 ? root : await fetchCatalog(token, catId, page, 40);
      if (!data || !data.products || !data.products.data) break;
      for (const p of data.products.data) { if (!all.has(p.id)) all.set(p.id, p); }
      const pg = data.products.page;
      total = pg.last;
      if (page >= total) break;
      page++;
    }
  }
  return all;
}

async function main() {
  writeLog('=== COOKIES_BAKERY DEEP IMPORT ===');
  const tr = await httpReq('POST', `${API_BASE}/auth/token`, {}, { consumer: 'arbuz-kz.web.mobile', key: '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj' });
  const token = JSON.parse(tr.body).data.token;
  writeLog('Token acquired.');

  writeLog('\n-- Phase 1: Collect Products --');
  const allProducts = await collectAllProducts(token);
  writeLog(`Total unique products: ${allProducts.size}`);

  writeLog('\n-- Phase 2: Process & Enrich --');
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { normalizeCategory } = await import('../src/domain/product/categoryMap.js');
  const { extractAllAttributes } = await import('../src/domain/product/attributeExtractor.js');
  const { normalizeName } = await import('../src/domain/product/nameNormalizer.js');

  const processed = [];
  const stats = { npcMatches: 0, created: 0, enriched: 0, errors: 0 };
  const productArr = Array.from(allProducts.values());

  for (let i = 0; i < productArr.length; i += CONCURRENCY) {
    const batch = productArr.slice(i, i + CONCURRENCY);
    const details = await Promise.allSettled(batch.map(p => httpReq('GET', `${API_BASE}/shop/product/${p.id}`, { 'Authorization': 'Bearer ' + token }, null, 8000).catch(() => null)));
    for (let j = 0; j < batch.length; j++) {
      const raw = batch[j];
      let full = raw;
      if (details[j].status === 'fulfilled' && details[j].value) {
        try { const d = JSON.parse(details[j].value.body).data; if (d && d.name) full = d; } catch {}
      }
      if (full.brandName && full.brandName.toLowerCase().includes('arbuz')) continue;

      let ean = full.barcode ? String(full.barcode).trim() : null;
      if (ean) { const bc = classifyBarcode(ean); if (bc.valid && bc.ean13) ean = bc.ean13; else ean = null; }
      if (!ean) {
        const npcItem = await (async () => {
          if (!NPC_API_KEY || !full.name) return null;
          const cleaned = cleanQueryForNpc(full.name);
          const qs = [cleaned];
          if (full.brandName && !cleaned.toLowerCase().includes(full.brandName.toLowerCase())) qs.push(`${full.brandName} ${cleaned}`);
          for (const q of [...new Set(qs.filter(x => x && x.length > 2))]) {
            try {
              const r = await httpReq('POST', 'https://nationalcatalog.kz/gw/search/api/v1/search',
                { 'X-API-KEY': NPC_API_KEY, 'Content-Type': 'application/json' },
                { query: q.substring(0, 80), page: 1, size: 5 }, 5000);
              if (r.status === 200) {
                const items = JSON.parse(r.body).items || [];
                const gtin = items.find(x => x.gtin && /^\d+$/.test(x.gtin.trim()));
                if (gtin) return gtin;
              }
            } catch {}
          }
          return null;
        })();
        if (npcItem && npcItem.gtin) { const bc = classifyBarcode(npcItem.gtin.trim()); if (bc.valid && bc.ean13) { ean = bc.ean13; stats.npcMatches++; } }
      }
      if (!ean) ean = 'arbuz_' + full.id;

      const lowerName = (full.name || '').toLowerCase();
      const subcategory = (lowerName.includes('вафл') || lowerName.includes('вафель') || lowerName.includes('торт') || lowerName.includes('пирожн') || lowerName.includes('кекс') || lowerName.includes('рулет') || lowerName.includes('круассан') || lowerName.includes('пирог') || lowerName.includes('выпеч')) ? 'pastries' : 'cookies';

      const productRecord = {
        ean, name: normalizeName(full.name, { brand: full.brandName }),
        brand: full.brandName || null,
        ingredients_raw: stripHtml(full.ingredients || full.compound),
        nutriments_json: parseNutrition(full.nutrition),
        halal_status: isHalal(full.characteristics || []) ? 'yes' : 'unknown',
        image_url: full.image ? full.image.replace(/w=%w&h=%h/, 'w=400&h=400') : null,
        image_source: full.image ? 'arbuz' : null,
        country_of_origin: full.producerCountry || null,
        manufacturer: full.brandName || null,
        category: 'sweets', subcategory,
        specs_json: { arbuz_id: full.id, arbuz_price: full.priceActual || null, storage_conditions: stripHtml(full.storageConditions) || null },
        source_primary: 'arbuz', source_confidence: 90, is_verified: true, is_active: true,
      };

      const attrs = extractAllAttributes({ name: productRecord.name, category: 'sweets' });
      if (attrs.packaging_type) productRecord.packaging_type = attrs.packaging_type;
      if (attrs.fat_percent != null) productRecord.fat_percent = attrs.fat_percent;
      if (attrs.halal_status && attrs.halal_status !== 'unknown') productRecord.halal_status = attrs.halal_status;
      if (attrs.diet_tags_json) productRecord.diet_tags_json = attrs.diet_tags_json;
      productRecord.data_quality_score = Math.min(
        (productRecord.name ? 15 : 0) + (productRecord.ingredients_raw ? 25 : 0) + (productRecord.nutriments_json ? 15 : 0) +
        (productRecord.image_url ? 15 : 0) + (productRecord.halal_status === 'yes' ? 10 : 0) + (productRecord.brand ? 10 : 0) +
        (!ean.startsWith('arbuz_') ? 5 : 0) + (productRecord.country_of_origin ? 5 : 0), 100);
      processed.push(productRecord);
    }
    if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= productArr.length) writeLog(`  Processed ${Math.min(i + CONCURRENCY, productArr.length)}/${productArr.length}`);
  }

  writeLog(`\nProcessed ${processed.length} items.`);

  // Dedup
  processed.sort((a, b) => (b.data_quality_score || 0) - (a.data_quality_score || 0));
  const deduped = Array.from(new Map(processed.map(p => [p.ean, p])).values());
  writeLog(`De-duplicated to ${deduped.length} unique EAN.`);

  // Upsert
  writeLog('\n-- Phase 3: Upsert --');
  for (let i = 0; i < deduped.length; i += 100) {
    const batch = deduped.slice(i, i + 100);
    const { data: existing } = await sb.from('global_products').select('ean').in('ean', batch.map(p => p.ean));
    const existingSet = new Set((existing || []).map(r => r.ean));
    const { error } = await sb.from('global_products').upsert(batch, { onConflict: 'ean' });
    if (error) { stats.errors += batch.length; writeLog(`Error batch ${i}: ${error.message}`); }
    else { batch.forEach(p => { if (existingSet.has(p.ean)) stats.enriched++; else stats.created++; }); }
  }
  writeLog(`Batch upserter done.`);

  writeLog('\n=== SUMMARY ===');
  writeLog(`Total discovered: ${allProducts.size}`);
  writeLog(`NPC matches: ${stats.npcMatches}`);
  writeLog(`Created: ${stats.created}`);
  writeLog(`Enriched: ${stats.enriched}`);
  writeLog(`Errors: ${stats.errors}`);

  const outF = path.join(OUT_DIR, `cookies-deep-${Date.now()}.json`);
  fs.writeFileSync(outF, JSON.stringify({ testedAt: new Date().toISOString(), stats, results: deduped }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'cookies-deep-import.log'), log.join('\n'), 'utf8');
  writeLog(`Audit: ${outF}`);
  writeLog('=== DONE ===');
}

main().catch(e => { console.log('FATAL: ' + e.message + '\n' + e.stack); process.exit(1); });
