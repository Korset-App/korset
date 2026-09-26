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

async function testPacing() {
  const rl = readline.createInterface({ input: fs.createReadStream('data/arbuz_full_catalog.jsonl') });
  const items = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    if (p.uri) items.push(p);
    if (items.length >= 100) break;
  }

  console.log(`Testing 100 items concurrency=10...`);
  const start = Date.now();
  let success = 0;
  let errors = 0;
  let barcodes = 0;

  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);
    const results = await Promise.all(batch.map(async item => {
      try {
        const { status, html } = await fetchPage('https://arbuz.kz' + item.uri);
        if (status === 200) {
          const match = html.match(/:product="([^"]+)"/);
          if (match) {
            const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            const obj = JSON.parse(raw);
            return { ok: true, barcode: obj.barcode || obj.article_index };
          }
        }
        return { ok: false, status };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }));

    for (const r of results) {
      if (r.ok) {
        success++;
        if (r.barcode) barcodes++;
      } else {
        errors++;
      }
    }
  }

  const elapsed = (Date.now() - start) / 1000;
  console.log(`Finished 100 requests in ${elapsed.toFixed(1)}s (${(100 / elapsed).toFixed(1)} req/s)`);
  console.log(`Success: ${success}, Errors: ${errors}, Found Barcodes: ${barcodes}`);
}

testPacing().catch(console.error);
