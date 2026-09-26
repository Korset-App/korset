import fs from 'fs';
import path from 'path';
import readline from 'readline';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IN_PATH = path.join(__dirname, '..', 'data', 'arbuz_full_catalog.jsonl');
const OUT_PATH = path.join(__dirname, '..', 'data', 'arbuz_enriched_catalog.jsonl');
const CHECKPOINT_PATH = path.join(__dirname, '..', 'data', 'arbuz_enrich_checkpoint.json');

const CONCURRENCY = 12;
const agent = new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY });

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'identity'
      },
      timeout: 12000
    }, res => {
      let html = '';
      res.on('data', d => { html += d; });
      res.on('end', () => resolve({ status: res.statusCode, html }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function cleanHtml(str) {
  if (!str) return null;
  return str
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<\/p>/gi, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&deg;/g, '°')
    .replace(/&plusmn;/g, '±')
    .replace(/&mdash;/g, '—')
    .replace(/,(\s*,)+/g, ',')
    .replace(/^\s*,\s*/, '')
    .trim() || null;
}

async function main() {
  console.log('=== Starting Arbuz Catalog DOM / HTML Enrichment ===');

  const processedIds = new Set();
  if (fs.existsSync(OUT_PATH)) {
    const rlOut = readline.createInterface({ input: fs.createReadStream(OUT_PATH) });
    for await (const line of rlOut) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        if (item.id) processedIds.add(String(item.id));
      } catch {}
    }
    console.log(`Resuming: ${processedIds.size} already processed in ${OUT_PATH}`);
  }

  const allItems = [];
  const rlIn = readline.createInterface({ input: fs.createReadStream(IN_PATH) });
  for await (const line of rlIn) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      allItems.push(item);
    } catch {}
  }
  console.log(`Total items loaded from source: ${allItems.length}`);

  const toProcess = allItems.filter(item => !processedIds.has(String(item.id)));
  console.log(`Remaining to process: ${toProcess.length}`);

  const outStream = fs.createWriteStream(OUT_PATH, { flags: 'a' });
  let count = 0;
  let withEan = 0;
  let withHalal = 0;
  const startTime = Date.now();

  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const chunk = toProcess.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(async item => {
      if (!item.uri) return item;
      const url = 'https://arbuz.kz' + item.uri;
      try {
        const { status, html } = await fetchHtml(url);
        if (status === 200) {
          const match = html.match(/:product="([^"]+)"/);
          if (match) {
            const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            const obj = JSON.parse(raw);

            const rawBarcode = String(obj.barcode || obj.article_index || '').replace(/\D/g, '') || null;
            const isEan13 = rawBarcode && /^\d{13}$/.test(rawBarcode);
            const isEan8 = rawBarcode && /^\d{8}$/.test(rawBarcode);
            const isEan12 = rawBarcode && /^\d{12}$/.test(rawBarcode);
            const isStdBarcode = isEan13 || isEan8 || isEan12;

            const isHalalPref = obj.diet_preferences && String(obj.diet_preferences).includes('6');
            const isHalalChar = Array.isArray(item.characteristics) &&
              item.characteristics.some(c => c.name && c.name.toLowerCase().includes('халал'));
            const isHalal = Boolean(isHalalPref || isHalalChar);

            return {
              ...item,
              barcode: rawBarcode,
              ean: isStdBarcode ? rawBarcode : null,
              shelf_life_days: obj.shelf_life_days != null ? Number(obj.shelf_life_days) : null,
              shelf_life_hours: obj.shelf_life_hours != null ? Number(obj.shelf_life_hours) : null,
              producer_country: obj.manufacturer_country || item.producer_country || null,
              brand: obj.brand_name || item.brand || null,
              halal_status: isHalal ? 'yes' : null,
              halal_source: isHalal ? (isHalalPref ? 'arbuz_diet_preference' : 'arbuz_characteristic') : null,
              storage_conditions: cleanHtml(obj.storage_conditions) || item.storage_conditions || null,
              ingredients_raw: cleanHtml(obj.ingredients) || item.ingredients_raw || null,
              dom_enriched: true,
              dom_enriched_at: new Date().toISOString()
            };
          }
        }
      } catch (err) {
        // Silently preserve item with dom_enriched: false
      }
      return { ...item, dom_enriched: false };
    }));

    for (const enriched of results) {
      outStream.write(JSON.stringify(enriched) + '\n');
      count++;
      if (enriched.ean) withEan++;
      if (enriched.halal_status === 'yes') withHalal++;
    }

    if (count % 200 === 0 || count === toProcess.length) {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speed = (count / elapsedSec).toFixed(1);
      console.log(`[${count}/${toProcess.length}] ${(count / toProcess.length * 100).toFixed(1)}% | EANs: ${withEan} | Halal: ${withHalal} | Speed: ${speed} req/s`);
      fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
        totalProcessed: processedIds.size + count,
        totalItems: allItems.length,
        withEan,
        withHalal,
        updatedAt: new Date().toISOString()
      }, null, 2));
    }
  }

  outStream.end();
  console.log(`\n=== Arbuz DOM Enrichment Complete! ===`);
  console.log(`Processed: ${count} items | EANs: ${withEan} | Halal: ${withHalal}`);
}

main().catch(console.error);
