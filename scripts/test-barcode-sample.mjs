import fs from 'fs';
import readline from 'readline';
import https from 'https';

const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });

function fetchPage(url) {
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

async function testBarcodePercentage() {
  const rl = readline.createInterface({ input: fs.createReadStream('data/arbuz_full_catalog.jsonl') });
  const allItems = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    if (p.uri) allItems.push(p);
  }
  console.log(`Total Arbuz items in jsonl: ${allItems.length}`);

  // Take every 200th item for a broad sample across all 16 categories
  const samples = [];
  for (let i = 0; i < allItems.length; i += 200) {
    samples.push(allItems[i]);
    if (samples.length >= 30) break;
  }

  let withEan13 = 0;
  let withAnyBarcode = 0;
  let withIngredients = 0;
  let withHalal = 0;
  let withShelfLife = 0;

  console.log(`\nTesting sample of ${samples.length} items across categories...`);
  for (const s of samples) {
    const url = 'https://arbuz.kz' + s.uri;
    try {
      const { status, html } = await fetchPage(url);
      if (status !== 200) {
        console.log(`[${status}] ${s.name}`);
        continue;
      }
      const match = html.match(/:product="([^"]+)"/);
      if (!match) {
        console.log(`[NO_PROP] ${s.name}`);
        continue;
      }
      const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const obj = JSON.parse(raw);
      const barcode = String(obj.barcode || obj.article_index || '').trim();
      const isEan13 = /^\d{13}$/.test(barcode);
      const isEan8 = /^\d{8}$/.test(barcode);
      const hasIng = Boolean(obj.ingredients && obj.ingredients.trim());
      const hasShelf = Boolean(obj.shelf_life_days || obj.shelf_life_hours);
      const isHalal = Boolean(obj.diet_preferences && obj.diet_preferences.includes('6'));

      if (isEan13) withEan13++;
      if (barcode) withAnyBarcode++;
      if (hasIng) withIngredients++;
      if (hasShelf) withShelfLife++;
      if (isHalal) withHalal++;

      console.log(`  EAN: ${barcode.padEnd(14)} | Shelf: ${String(obj.shelf_life_days || '-').padEnd(4)}d | Halal: ${isHalal ? 'YES' : ' - '} | ${s.name.slice(0, 45)}`);
    } catch (e) {
      console.log(`[ERR] ${s.name}: ${e.message}`);
    }
  }

  console.log('\n--- SAMPLE SUMMARY ---');
  console.log(`Total tested: ${samples.length}`);
  console.log(`With valid EAN-13: ${withEan13} (${Math.round(withEan13 / samples.length * 100)}%)`);
  console.log(`With any barcode: ${withAnyBarcode} (${Math.round(withAnyBarcode / samples.length * 100)}%)`);
  console.log(`With ingredients: ${withIngredients} (${Math.round(withIngredients / samples.length * 100)}%)`);
  console.log(`With shelf life: ${withShelfLife} (${Math.round(withShelfLife / samples.length * 100)}%)`);
  console.log(`With Halal badge: ${withHalal} (${Math.round(withHalal / samples.length * 100)}%)`);
}

testBarcodePercentage().catch(console.error);
