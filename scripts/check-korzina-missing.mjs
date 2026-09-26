import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.korzinavdom.kz/client';
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json');

async function checkMissing() {
  const existingCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const existingQuantums = new Set(existingCatalog.map(p => p.quantumNumber));
  console.log(`Loaded ${existingCatalog.length} existing items from ${CATALOG_PATH}`);

  const allShowcases = [];
  console.log('Fetching all 93 pages from global showcases endpoint...');

  for (let page = 0; page < 93; page++) {
    try {
      const url = `${API_BASE}/showcases?size=100&page=${page}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
      const j = await res.json();
      const content = j.data?.page?.content || [];
      allShowcases.push(...content);
      if (page % 20 === 0 || page === 92) {
        console.log(`  Page ${page}/92 fetched (${allShowcases.length} items so far)`);
      }
    } catch (e) {
      console.error(`  Error on page ${page}:`, e.message);
    }
  }

  const missing = allShowcases.filter(s => !existingQuantums.has(s.quantumNumber));
  console.log(`\n=== RESULTS ===`);
  console.log(`Total showcases found: ${allShowcases.length}`);
  console.log(`Already in catalog: ${allShowcases.length - missing.length}`);
  console.log(`Missing from catalog: ${missing.length}`);
}

checkMissing().catch(console.error);
