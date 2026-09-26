import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.korzinavdom.kz/client';
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json');
const FULL_OUT_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog_full.json');
const CHECKPOINT_PATH = path.join(__dirname, '..', 'data', 'korzina_harvest_checkpoint.json');

async function fetchPage(page, size = 100) {
  const url = `${API_BASE}/showcases?size=${size}&page=${page}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return j.data?.page;
}

async function fetchDetail(quantumNumber, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `${API_BASE}/showcases/${quantumNumber}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) return null;
      const j = await res.json();
      return j.data || null;
    } catch (e) {
      if (attempt === retries) return null;
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  return null;
}

async function main() {
  console.log('=== Harvesting Complete Korzina v Dom Assortment (Global Showcase) ===');

  let existingCatalog = [];
  if (fs.existsSync(CATALOG_PATH)) {
    try {
      existingCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
      console.log(`Loaded ${existingCatalog.length} existing items from ${CATALOG_PATH}`);
    } catch {}
  }
  const existingMap = new Map();
  for (const item of existingCatalog) {
    if (item.quantumNumber) {
      // Force null on imagePath (WATERMARK PROTECTION)
      item.imagePath = null;
      existingMap.set(item.quantumNumber, item);
    }
  }

  // Check if checkpoint exists
  const harvestedNew = new Map();
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
      if (Array.isArray(saved.items)) {
        for (const it of saved.items) {
          harvestedNew.set(it.quantumNumber, it);
        }
        console.log(`Resumed ${harvestedNew.size} items from checkpoint.`);
      }
    } catch {}
  }

  // 1. Fetch all showcases across all 93 pages
  console.log('Step 1: Fetching all global showcase pages...');
  const allShowcases = [];
  let page = 0;
  let totalPages = 93;

  while (page < totalPages) {
    try {
      const pageData = await fetchPage(page, 100);
      if (pageData?.totalPages) totalPages = pageData.totalPages;
      const content = pageData?.content || [];
      allShowcases.push(...content);
      if (page % 20 === 0 || page === totalPages - 1) {
        console.log(`  Page ${page}/${totalPages - 1} fetched (${allShowcases.length} items total)`);
      }
      page++;
    } catch (e) {
      console.error(`  Error on page ${page}:`, e.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`Total showcases found on Korzina v Dom: ${allShowcases.length}`);

  // 2. Identify missing items that need detail fetch
  const missingItems = allShowcases.filter(s => !existingMap.has(s.quantumNumber) && !harvestedNew.has(s.quantumNumber));
  console.log(`Missing items needing details: ${missingItems.length}`);

  // 3. Fetch details for missing items with concurrency
  const CONCURRENCY = 15;
  let fetchedCount = 0;
  const t0 = Date.now();

  for (let i = 0; i < missingItems.length; i += CONCURRENCY) {
    const chunk = missingItems.slice(i, i + CONCURRENCY);
    const details = await Promise.all(chunk.map(async s => {
      const d = await fetchDetail(s.quantumNumber);
      return {
        quantumNumber: s.quantumNumber,
        productName: d?.productName || s.productName,
        brand: d?.brand || null,
        composition: d?.composition || null,
        storageConditions: d?.storageConditions || null,
        shelfLife: d?.shelfLife || s.shelfLife || null,
        country: d?.country || null,
        options: d?.options || [],
        markers: d?.markers || [],
        imagePath: null, // STRICT INVARIANT: ZERO PHOTOS FROM KORZINA V DOM
        categoryPath: d?.catalogPath || []
      };
    }));

    for (const d of details) {
      harvestedNew.set(d.quantumNumber, d);
    }
    fetchedCount += chunk.length;

    if (fetchedCount % 150 === 0 || fetchedCount >= missingItems.length) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const rate = (fetchedCount / elapsed).toFixed(1);
      console.log(`Fetched ${fetchedCount}/${missingItems.length} missing details (${rate} it/s)`);

      fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
        items: Array.from(harvestedNew.values()),
        updatedAt: new Date().toISOString()
      }));
    }
  }

  // 4. Combine existing + newly harvested
  for (const [qNum, item] of harvestedNew.entries()) {
    existingMap.set(qNum, item);
  }

  const completeCatalog = Array.from(existingMap.values());
  console.log(`\nSaving ${completeCatalog.length} complete items to ${FULL_OUT_PATH}...`);
  fs.writeFileSync(FULL_OUT_PATH, JSON.stringify(completeCatalog, null, 2));

  // Backup old catalog and replace
  const BACKUP_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog_backup.json');
  if (fs.existsSync(CATALOG_PATH)) {
    fs.copyFileSync(CATALOG_PATH, BACKUP_PATH);
  }
  fs.copyFileSync(FULL_OUT_PATH, CATALOG_PATH);

  console.log(`=== DONE! Korzina v Dom catalog enriched from ${existingCatalog.length} to ${completeCatalog.length} items! ===`);
}

main().catch(console.error);
