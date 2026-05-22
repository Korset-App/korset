const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { classifyBarcode } = require('./validate-ean.cjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SB = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const API = 'https://arbuz.kz/api/v1';
const OUT = path.join(__dirname, '..', 'data', 'subcategory-import');
const TMP = path.join(OUT, 'cookies-445-products.json');

const log = [];
function l(m) { const s = `[${new Date().toISOString()}] ${m}`; log.push(s); console.log(s); }

async function req(method, url, headers = {}, body = null) {
  return new Promise((ok, no) => {
    const u = new URL(url);
    const o = require('https').request({ hostname: u.hostname, port: 443, path: u.pathname + u.search, method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers }, timeout: 8000 },
      r => { let d = ''; r.on('data', c => d += c); r.on('end', () => ok({ status: r.statusCode, body: d })); });
    o.on('error', no); o.on('timeout', () => { o.destroy(); no(new Error('timeout')); });
    if (body) o.write(JSON.stringify(body)); o.end();
  });
}

function strip(h) { return h ? h.replace(/<br[^>]*>/gi, ', ').replace(/<\/p>/gi, ', ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/,(\s*,)+/g, ',').trim() || null : null; }

function nutr(n) { if (!n) return null; const r = {}; if (n.kcal) r.energy_kcal = parseFloat(String(n.kcal).replace(',', '.')); if (n.protein) r.protein_100g = parseFloat(String(n.protein).replace(',', '.')); if (n.fats) r.fat_100g = parseFloat(String(n.fats).replace(',', '.')); if (n.carbs) r.carbohydrates_100g = parseFloat(String(n.carbs).replace(',', '.')); return Object.keys(r).length ? r : null; }

async function main() {
  try {
    l('=== COOKIES IMPORT ===');
    const tr = await req('POST', API + '/auth/token', {}, { consumer: 'arbuz-kz.web.mobile', key: '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj' });
    const token = JSON.parse(tr.body).data.token;
    l('Token OK');

    // PHASE 1
    l('-- Phase 1 --');
    const products = new Map();
    let page = 1;
    while (true) {
      const r = await req('GET', API + '/shop/catalog/225042?page=' + page + '&limit=40', { Authorization: 'Bearer ' + token });
      if (r.status !== 200) break;
      const d = JSON.parse(r.body).data;
      if (!d || !d.products || !d.products.data || !d.products.data.length) break;
      for (const p of d.products.data) { if (!products.has(p.id)) products.set(p.id, p); }
      if (page >= d.products.page.last) break;
      page++;
    }
    l('Found: ' + products.size);

    // PHASE 2
    l('-- Phase 2: Details --');
    const { normalizeCategory } = await import('../src/domain/product/categoryMap.js');
    const { extractAllAttributes } = await import('../src/domain/product/attributeExtractor.js');
    const { normalizeName } = await import('../src/domain/product/nameNormalizer.js');

    const arr = Array.from(products.values());
    const processed = [];
    const stats = { created: 0, enriched: 0, errors: 0 };

    for (let i = 0; i < arr.length; i += 10) {
      const batch = arr.slice(i, i + 10);
      const dets = await Promise.allSettled(batch.map(p => req('GET', API + '/shop/product/' + p.id, { Authorization: 'Bearer ' + token })));
      for (let j = 0; j < batch.length; j++) {
        const raw = batch[j];
        let full = raw;
        if (dets[j].status === 'fulfilled' && dets[j].value) {
          try { const d = JSON.parse(dets[j].value.body).data; if (d && d.name) full = d; } catch {}
        }
        if (full.brandName && full.brandName.toLowerCase().includes('arbuz')) continue;

        // EAN from detail barcode only, no NPC
        let ean = full.barcode ? String(full.barcode).trim() : null;
        if (ean) { const bc = classifyBarcode(ean); if (bc.valid && bc.ean13) ean = bc.ean13; else ean = null; }
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
      if ((i + 10) % 100 === 0 || i + 10 >= arr.length) l('  ' + Math.min(i + 10, arr.length) + '/' + arr.length);
    }

    l('Processed: ' + processed.length);

    // Dedup
    processed.sort((a, b) => (b.data_quality_score || 0) - (a.data_quality_score || 0));
    const deduped = Array.from(new Map(processed.map(p => [p.ean, p])).values());
    l('Deduped: ' + deduped.length);

    // Save intermediate
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(TMP, JSON.stringify(deduped, null, 2));
    l('Saved intermediate: ' + TMP);

    // PHASE 3
    l('-- Phase 3: Upsert --');
    for (let i = 0; i < deduped.length; i += 100) {
      const batch = deduped.slice(i, i + 100);
      const { data: ex } = await SB.from('global_products').select('ean').in('ean', batch.map(p => p.ean));
      const exSet = new Set((ex || []).map(r => r.ean));
      const { error } = await SB.from('global_products').upsert(batch, { onConflict: 'ean' });
      if (error) { stats.errors += batch.length; l('Error: ' + error.message); }
      else { batch.forEach(p => { if (exSet.has(p.ean)) stats.enriched++; else stats.created++; }); }
    }

    l('=== DONE ===');
    l('Created: ' + stats.created + ', Enriched: ' + stats.enriched + ', Errors: ' + stats.errors);
    fs.writeFileSync(path.join(OUT, 'cookies-import-final.log'), log.join('\n'), 'utf8');
  } catch (e) {
    l('FATAL: ' + (e.stack || e.message));
    fs.writeFileSync(path.join(OUT, 'cookies-import-final.log'), log.join('\n'), 'utf8');
    process.exit(1);
  }
}

main();
