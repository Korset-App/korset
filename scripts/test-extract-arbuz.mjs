import fs from 'fs';
import readline from 'readline';
import https from 'https';

const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'identity'
      },
      timeout: 10000
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

async function testExtract10() {
  const rl = readline.createInterface({ input: fs.createReadStream('data/arbuz_full_catalog.jsonl') });
  const items = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    if (p.uri) items.push(p);
    if (items.length >= 10) break;
  }

  for (const item of items) {
    const { status, html } = await fetchHtml('https://arbuz.kz' + item.uri);
    if (status !== 200) {
      console.log(`Error ${status} for ${item.name}`);
      continue;
    }
    const match = html.match(/:product="([^"]+)"/);
    if (!match) {
      console.log(`No :product for ${item.name}`);
      continue;
    }
    const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const obj = JSON.parse(raw);

    const barcode = String(obj.barcode || obj.article_index || '').replace(/\D/g, '') || null;
    const isHalal = (obj.diet_preferences && String(obj.diet_preferences).includes('6')) ||
      (Array.isArray(item.characteristics) && item.characteristics.some(c => c.name && c.name.toLowerCase().includes('халал')));

    console.log({
      id: obj.id,
      name: obj.name,
      barcode,
      shelf_life_days: obj.shelf_life_days,
      country: obj.manufacturer_country,
      brand: obj.brand_name,
      isHalal,
      ingredients: cleanHtml(obj.ingredients)?.slice(0, 60),
      storage: cleanHtml(obj.storage_conditions)?.slice(0, 60)
    });
  }
}

testExtract10().catch(console.error);
