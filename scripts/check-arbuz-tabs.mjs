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

async function checkArbuzTabs() {
  const rl = readline.createInterface({ input: fs.createReadStream('data/arbuz_full_catalog.jsonl') });
  const items = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    if (p.uri) items.push(p);
    if (items.length >= 25) break;
  }

  const tabsSet = new Set();
  const certsFound = [];

  for (const item of items) {
    const url = 'https://arbuz.kz' + item.uri;
    try {
      const { status, html } = await fetchPage(url);
      if (status !== 200) continue;
      const match = html.match(/:product="([^"]+)"/);
      if (!match) continue;
      const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const p = JSON.parse(raw);
      if (p.tab_name) tabsSet.add(p.tab_name);
      if (p.tab_name_2) tabsSet.add(p.tab_name_2);
      if (p.tab_name_3) tabsSet.add(p.tab_name_3);
      if (html.includes('сертификат') || html.includes('Сертификат') || html.includes('qmdb') || html.includes('QMDB')) {
        certsFound.push({ id: p.id, name: p.name });
      }
    } catch {}
  }

  console.log('Unique tab names encountered:', [...tabsSet]);
  console.log('Certificates mentioned in HTML:', certsFound);
}

checkArbuzTabs().catch(console.error);
