const fs = require('fs'); const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { classifyBarcode } = require('./validate-ean.cjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SB = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const API = 'https://arbuz.kz/api/v1';
const NPC_KEY = process.env.NPC_API_KEY;
const CATALOG_ID = 225042;
const CONCURRENCY = 10;
const OUT = path.join(__dirname, '..', 'data', 'subcategory-import');
const LOG = [];

function log(m) { const s = `[${new Date().toISOString()}] ${m}`; LOG.push(s); console.log(s); }
function req(method, url, headers = {}, body = null, t = 10000) {
  return new Promise((ok, no) => {
    const u = new URL(url);
    const o = require('https').request({ hostname: u.hostname, port: 443, path: u.pathname + u.search, method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers }, timeout: t },
      r => { let d = ''; r.on('data', c => d += c); r.on('end', () => ok({ status: r.statusCode, body: d })); });
    o.on('error', no); o.on('timeout', () => { o.destroy(); no(new Error('timeout')); });
    if (body) o.write(JSON.stringify(body)); o.end();
  });
}
function strip(h) { return h ? h.replace(/<br\s*\/?>/gi, ', ').replace(/<\/p>/gi, ', ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/,(\s*,)+/g, ',').trim() || null : null; }
function nutr(n) { if (!n) return null; const r = {}; if (n.kcal) r.energy_kcal = parseFloat(String(n.kcal).replace(',', '.')); if (n.protein) r.protein_100g = parseFloat(String(n.protein).replace(',', '.')); if (n.fats) r.fat_100g = parseFloat(String(n.fats).replace(',', '.')); if (n.carbs) r.carbohydrates_100g = parseFloat(String(n.carbs).replace(',', '.')); return Object.keys(r).length ? r : null; }

async function main() {
  log('=== COOKIES BAKERY — CLEAN IMPORT (only 225042) ===');
  const tr = await req('POST', API + '/auth/token', {}, { consumer: 'arbuz-kz.web.mobile', key: '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj' });
  const token = JSON.parse(tr.body).data.token;
  log('Token OK');

  // Phase 1: collect from parent catalog ONLY
  log('-- Phase 1: Catalog 225042 --');
  const products = new Map();
  let page = 1;
  while (true) {
    const r = await req('GET', `${API}/shop/catalog/${CATALOG_ID}?page=${page}&limit=40`, { Authorization: 'Bearer ' + token });
    if (r.status !== 200) break;
    const d = JSON.parse(r.body).data;
    if (!d || !d.products || !d.products.data || !d.products.data.length) break;
    for (const p of d.products.data) { if (!products.has(p.id)) products.set(p.id, p); }
    if (page >= d.products.page.last) break;
    page++;
  }
  log(`Found: ${products.size} products in ${page} pages`);



  // Phase 2: fetch details & enrich
  log('-- Phase 2: Details --');
  const { normalizeCategory } = await import('../src/domain/product/categoryMap.js');
  const { extractAllAttributes } = await import('../src/domain/product/attributeExtractor.js');
  const { normalizeName } = await import('../src/domain/product/nameNormalizer.js');

  const arr = Array.from(products.values());
  const processed = [];
  const stats = { npc: 0, created: 0, enriched: 0, errors: 0 };

  for (let i = 0; i < arr.length; i += CONCURRENCY) {
    const batch = arr.slice(i, i + CONCURRENCY);
    const dets = await Promise.allSettled(batch.map(p => req('GET', `${API}/shop/product/${p.id}`, { Authorization: 'Bearer ' + token }, null, 8000)));
    for (let j = 0; j < batch.length; j++) {
      const raw = batch[j];
      let full = raw;
      if (dets[j].status === 'fulfilled' && dets[j].value) {
        try { const d = JSON.parse(dets[j].value.body).data; if (d && d.name) full = d; } catch {}
      }
      if (full.brandName && full.brandName.toLowerCase().includes('arbuz')) continue;

      let ean = full.barcode ? String(full.barcode).trim() : null;
      if (ean) { const bc = classifyBarcode(ean); if (bc.valid && bc.ean13) ean = bc.ean13; else ean = null; }
      if (!ean && NPC_KEY && full.name) {
        const q = full.name.split(',')[0].replace(/\d+([.,]\d+)?\s*(г|кг|л|мл|шт|%)\.?/gi, '').replace(/[-\s.]+$/, '').trim();
        try { const nr = await req('POST', 'https://nationalcatalog.kz/gw/search/api/v1/search', { 'X-API-KEY': NPC_KEY, 'Content-Type': 'application/json' }, { query: q.substring(0, 80), page: 1, size: 5 }, 5000);
          if (nr.status === 200) { const items = JSON.parse(nr.body).items || []; const g = items.find(x => x.gtin && /^\d+$/.test(x.gtin.trim())); if (g) { const bc = classifyBarcode(g.gtin.trim()); if (bc.valid && bc.ean13) { ean = bc.ean13; stats.npc++; } } } } catch {}
      }
      if (!ean) ean = 'arbuz_' + full.id;

      const ln = (full.name || '').toLowerCase();
      const sub = (ln.includes('вафл') || ln.includes('вафель') || ln.includes('торт') || ln.includes('пирожн') || ln.includes('кекс') || ln.includes('рулет') || ln.includes('круассан') || ln.includes('пирог') || ln.includes('выпеч')) ? 'pastries' : 'cookies';
      const rec = {
        ean, name: normalizeName(full.name, { brand: full.brandName }),
        brand: full.brandName || null, ingredients_raw: strip(full.ingredients || full.compound),
        nutriments_json: nutr(full.nutrition),
        halal_status: (Array.isArray(full.characteristics) && full.characteristics.some(c => c.name && c.name.toLowerCase().includes('халал'))) ? 'yes' : 'unknown',
        image_url: full.image ? full.image.replace(/w=%w&h=%h/, 'w=400&h=400') : null, image_source: full.image ? 'arbuz' : null,
        country_of_origin: full.producerCountry || null, manufacturer: full.brandName || null,
        category: 'sweets', subcategory: sub,
        specs_json: { arbuz_id: full.id, arbuz_price: full.priceActual || null, storage_conditions: strip(full.storageConditions) || null },
        source_primary: 'arbuz', source_confidence: 90, is_verified: true, is_active: true,
      };
      const a = extractAllAttributes({ name: rec.name, category: 'sweets' });
      if (a.packaging_type) rec.packaging_type = a.packaging_type;
      if (a.fat_percent != null) rec.fat_percent = a.fat_percent;
      if (a.halal_status && a.halal_status !== 'unknown') rec.halal_status = a.halal_status;
      if (a.diet_tags_json) rec.diet_tags_json = a.diet_tags_json;
      rec.data_quality_score = Math.min((rec.name ? 15 : 0) + (rec.ingredients_raw ? 25 : 0) + (rec.nutriments_json ? 15 : 0) + (rec.image_url ? 15 : 0) + (rec.halal_status === 'yes' ? 10 : 0) + (rec.brand ? 10 : 0) + (!ean.startsWith('arbuz_') ? 5 : 0) + (rec.country_of_origin ? 5 : 0), 100);
      processed.push(rec);
    }
    if ((i + CONCURRENCY) % 200 === 0 || i + CONCURRENCY >= arr.length) log(`  ${Math.min(i + CONCURRENCY, arr.length)}/${arr.length} done`);
  }

  // Dedup
  processed.sort((a, b) => (b.data_quality_score || 0) - (a.data_quality_score || 0));
  const deduped = Array.from(new Map(processed.map(p => [p.ean, p])).values());
  log(`Processed: ${processed.length}, Deduped: ${deduped.length}`);

  // Upsert
  log('-- Phase 3: Upsert --');
  for (let i = 0; i < deduped.length; i += 100) {
    const batch = deduped.slice(i, i + 100);
    const { data: ex } = await SB.from('global_products').select('ean').in('ean', batch.map(p => p.ean));
    const exSet = new Set((ex || []).map(r => r.ean));
    const { error } = await SB.from('global_products').upsert(batch, { onConflict: 'ean' });
    if (error) { stats.errors += batch.length; log(`Error: ${error.message}`); }
    else { batch.forEach(p => { if (exSet.has(p.ean)) stats.enriched++; else stats.created++; }); }
  }

  log('\n=== FINAL ===');
  log(`Found: ${products.size}`);
  log(`NPC: ${stats.npc}`);
  log(`Created: ${stats.created}, Enriched: ${stats.enriched}, Errors: ${stats.errors}`);
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'cookies-clean-log.txt'), LOG.join('\n'), 'utf8');
  fs.writeFileSync(path.join(OUT, `cookies-clean-${Date.now()}.json`), JSON.stringify({ stats, results: deduped }, null, 2));
  log('DONE');
}

main().catch(e => { console.log('FATAL: ' + e.stack); process.exit(1); });
