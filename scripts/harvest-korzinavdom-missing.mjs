import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.korzinavdom.kz/client';
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json');

async function fetchPage(catNumber, page = 0, size = 500) {
  try {
    const url = `${API_BASE}/showcases?categoryNumber=${catNumber}&size=${size}&page=${page}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.data?.page || null;
  } catch {
    return null;
  }
}

async function fetchDetail(quantumNumber) {
  try {
    const url = `${API_BASE}/showcases/${quantumNumber}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.data || null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== Harvesting Missing Korzina v Dom Items ===');

  const existingCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  console.log(`Loaded ${existingCatalog.length} existing items from ${CATALOG_PATH}`);
  const existingQuantums = new Set(existingCatalog.map(p => p.quantumNumber));

  // Get full category tree
  const catRes = await fetch(`${API_BASE}/catalog`);
  const catJson = await catRes.json();
  const nonFoodRoots = [17, 18, 19, 20, 288];
  const foodCats = [];

  function traverse(nodes, isFood = true) {
    for (const n of nodes) {
      const food = isFood && !nonFoodRoots.includes(n.number);
      if (food && !n.isGroup) {
        foodCats.push({ number: n.number, title: n.title });
      }
      if (n.children && n.children.length > 0) traverse(n.children, food);
    }
  }
  traverse(catJson.data.items);
  console.log(`Scanning ${foodCats.length} leaf food categories...`);

  const missingShowcases = new Map();

  for (const cat of foodCats) {
    let page = 0;
    while (true) {
      const pageData = await fetchPage(cat.number, page, 500);
      if (!pageData || !pageData.content || pageData.content.length === 0) break;

      for (const item of pageData.content) {
        if (!existingQuantums.has(item.quantumNumber) && !missingShowcases.has(item.quantumNumber)) {
          missingShowcases.set(item.quantumNumber, item);
        }
      }

      if (pageData.last || page >= (pageData.totalPages - 1)) break;
      page++;
    }
  }

  const itemsToFetch = Array.from(missingShowcases.values());
  console.log(`Found ${itemsToFetch.length} new unique items to fetch details for.`);

  if (itemsToFetch.length === 0) {
    console.log('Catalog is already up to date!');
    return;
  }

  const CONCURRENCY = 15;
  const newDetailed = [];
  let count = 0;
  const t0 = Date.now();

  for (let i = 0; i < itemsToFetch.length; i += CONCURRENCY) {
    const chunk = itemsToFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(async item => {
      const detail = await fetchDetail(item.quantumNumber);
      return detail ? {
        quantumNumber: item.quantumNumber,
        productName: detail.productName || item.productName,
        brand: detail.brand || null,
        composition: detail.composition || null,
        storageConditions: detail.storageConditions || null,
        shelfLife: detail.shelfLife || item.shelfLife || null,
        country: detail.country || null,
        options: detail.options || [],
        markers: detail.markers || [],
        imagePath: null, // STRICT INVARIANT: ZERO PHOTOS FROM KORZINA V DOM
        categoryPath: detail.catalogPath || []
      } : {
        quantumNumber: item.quantumNumber,
        productName: item.productName,
        brand: null,
        composition: null,
        storageConditions: null,
        shelfLife: item.shelfLife || null,
        country: null,
        options: [],
        markers: [],
        imagePath: null, // STRICT INVARIANT: ZERO PHOTOS FROM KORZINA V DOM
        categoryPath: []
      };
    }));

    newDetailed.push(...results);
    count += chunk.length;

    if (count % 200 === 0 || count >= itemsToFetch.length) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const rate = (count / elapsed).toFixed(1);
      console.log(`Progress: ${count} / ${itemsToFetch.length} details fetched (${rate} it/s)`);
    }
  }

  const fullCatalog = [...existingCatalog, ...newDetailed];
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(fullCatalog, null, 2));
  console.log(`=== Successfully saved ${fullCatalog.length} items (+${newDetailed.length} new) to ${CATALOG_PATH} ===`);
}

main().catch(console.error);
