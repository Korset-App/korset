import fs from 'fs';
import readline from 'readline';
import https from 'https';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9'
      }
    }, res => {
      let html = '';
      res.on('data', d => { html += d; });
      res.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

async function testPackaged() {
  const rl = readline.createInterface({ input: fs.createReadStream('data/arbuz_full_catalog.jsonl') });
  const samples = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    // Find branded packaged goods
    if (p.brand && p.ingredients_raw && p.uri) {
      samples.push(p);
      if (samples.length >= 5) break;
    }
  }

  for (const s of samples) {
    const fullUrl = 'https://arbuz.kz' + s.uri;
    console.log(`\nFetching: ${s.name} (${s.id})`);
    try {
      const html = await fetchPage(fullUrl);
      const match = html.match(/:product="([^"]+)"/);
      if (match) {
        const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const obj = JSON.parse(raw);
        console.log('  Result:', {
          id: obj.id,
          name: obj.name,
          barcode: obj.barcode,
          article_index: obj.article_index,
          shelf_life_days: obj.shelf_life_days,
          diet_preferences: obj.diet_preferences,
          manufacturer_country: obj.manufacturer_country,
          brand: obj.brand_name,
          ingredients: (obj.ingredients || '').replace(/<[^>]+>/g, '').trim().slice(0, 100)
        });
      }
    } catch (e) {
      console.error('  Fetch error:', e.message);
    }
  }
}

testPackaged().catch(console.error);
