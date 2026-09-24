import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.korzinavdom.kz/client';
const OUT_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json');

const CATEGORIES = [
  { number: 7, name: 'Чай, кофе, кондитерские изделия' },
  { number: 3, name: 'Молочные продукты и сыры, яйцо' },
  { number: 9, name: 'Напитки' },
  { number: 8, name: 'Консервированные продукты' },
  { number: 10, name: 'Макароны, крупы' },
  { number: 11, name: 'Мука, соль, сахар, специи и приправы' },
  { number: 12, name: 'Масла растительные, соусы, майонез, уксусы' },
  { number: 291, name: 'EURO маркет' },
  { number: 4, name: 'Мясо, мясо птицы, рыба' },
  { number: 14, name: 'Продукты быстрого приготовления, каши, мюсли' },
  { number: 15, name: 'Снеки (чипсы, попкорн, семечки)' },
  { number: 13, name: 'Хлеб, булочки, лепешки' },
  { number: 6, name: 'Полуфабрикаты' },
  { number: 5, name: 'Колбаса, сосиcки, сало, деликатесы из мяса' }
];

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
  } catch (e) {
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
  console.log('=== Harvesting Korzina v Dom Catalog ===');
  const allItems = new Map();

  for (const cat of CATEGORIES) {
    console.log(`Fetching category #${cat.number}: ${cat.name}...`);
    let page = 0;
    while (true) {
      const pageData = await fetchPage(cat.number, page, 500);
      if (!pageData || !pageData.content || pageData.content.length === 0) break;
      for (const item of pageData.content) {
        if (!allItems.has(item.quantumNumber)) {
          allItems.set(item.quantumNumber, item);
        }
      }
      if (pageData.last || page >= (pageData.totalPages - 1) || page > 10) break;
      page++;
    }
    console.log(`  Items so far: ${allItems.size}`);
  }

  console.log(`Total unique items discovered: ${allItems.size}`);

  // Fetch details in batches of 15
  const items = Array.from(allItems.values());
  const detailedProducts = [];
  const CONCURRENCY = 15;
  let count = 0;
  const t0 = Date.now();

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
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
        imagePath: detail.imagePath || item.imagePath || null,
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
        imagePath: item.imagePath || null,
        categoryPath: []
      };
    }));

    detailedProducts.push(...results);
    count += chunk.length;

    if (count % 300 === 0 || count >= items.length) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const rate = (count / elapsed).toFixed(1);
      console.log(`Progress: ${count} / ${items.length} details fetched (${rate} it/s)`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(detailedProducts, null, 2));
  console.log(`Saved ${detailedProducts.length} items to ${OUT_PATH}`);
}

main().catch(console.error);
