/**
 * Step 01: Collect Seed EANs
 * Gathers authentic EANs from stores (mars, bereke, nurly, kalina) and clean catalog v2.
 * Strictly filters out scale barcodes (20-29), validates EAN-8/12/13/14 checksums.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isValidEanChecksum(barcode) {
  if (!/^\d{8}$|^\d{12,14}$/.test(barcode)) return false;
  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  // Weight alternates: 3, 1 from right to left
  const len = digits.length;
  for (let i = len - 1; i >= 0; i--) {
    const weight = (len - 1 - i) % 2 === 0 ? 3 : 1;
    sum += digits[i] * weight;
  }
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

function isScaleBarcode(barcode) {
  // GS1 prefix 20-29 reserved for in-store variable measure
  return /^2[0-9]/.test(barcode);
}

async function collectSeedEans() {
  console.log('=== Step 01: Collecting High-Integrity Seed EANs ===');
  const eanMap = new Map(); // ean -> { name, source }

  // 1. From clean_catalog_v2.jsonl
  const catalogPath = path.join(__dirname, '..', '..', 'data', 'clean_catalog_v2.jsonl');
  if (fs.existsSync(catalogPath)) {
    const fileStream = fs.createReadStream(catalogPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        const ean = String(item.ean || '').trim();
        if (!ean) continue;
        if (isScaleBarcode(ean)) continue;
        if (!isValidEanChecksum(ean)) continue;

        eanMap.set(ean, {
          ean,
          name: item.name || '',
          brand: item.brand || '',
          category: item.category || '',
          source: 'clean_catalog_v2',
        });
      } catch (err) {
        // ignore malformed lines
      }
    }
    console.log(`Ingested from clean_catalog_v2: ${eanMap.size} valid EANs`);
  }

  // 2. From Supabase store_products (active store shelves)
  if (SUPABASE_URL && SUPABASE_KEY) {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: storeRows, error } = await sb
      .from('store_products')
      .select('ean, local_name, price_kzt')
      .eq('is_active', true);

    if (!error && storeRows) {
      let storeAdded = 0;
      for (const row of storeRows) {
        const ean = String(row.ean || '').trim();
        if (!ean) continue;
        if (isScaleBarcode(ean)) continue;
        if (!isValidEanChecksum(ean)) continue;

        if (!eanMap.has(ean)) {
          eanMap.set(ean, {
            ean,
            name: row.local_name || '',
            brand: '',
            category: '',
            source: 'store_products',
          });
          storeAdded++;
        }
      }
      console.log(`Ingested from store_products: ${storeAdded} additional EANs`);
    }
  }

  const allEans = Array.from(eanMap.values());
  console.log(`Total valid, non-scale EANs collected: ${allEans.length}`);

  const cacheDir = path.join(__dirname, '..', '..', 'data', 'v3_cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(cacheDir, 'seed_eans.json'),
    JSON.stringify(allEans, null, 2),
    'utf8'
  );
  console.log(`Saved all seed EANs to: data/v3_cache/seed_eans.json`);

  // Create a 100-item Pilot Batch spanning diverse categories:
  // 1. Dairy (Восток-Молоко, Эмиль, Гормолзавод, FoodMaster, Lactel)
  // 2. Snacks / Chips (Lays, Lorenz)
  // 3. Sweets (Рахат, Баян Сулу, Ferrero, Mars, Toffifee)
  // 4. Sauces / Mayonnaise / Ketchup (3 Желания, Цин-Каз, Махеевъ)
  // 5. Bakery / Beverages / Tea (local bread, Aport, Gracio, Asu, Greenfield)
  const pilotEans = [];
  const targetKeywords = [
    // 1. Dairy & local
    'молоко', 'сметана', 'творог', 'сыр', 'восток', 'эмиль', 'гормолзавод', 'foodmaster', 'lactel',
    // 2. Snacks & chips (flavor test!)
    'lays', 'чипсы', 'lorenz', 'сухарики',
    // 3. Sweets & Chocolate
    'рахат', 'баян сулу', 'raffaello', 'конфеты', 'toffifee', 'шоколад', 'snickers',
    // 4. Sauces
    '3 желания', 'майонез', 'цин-каз', 'кетчуп', 'аджика', 'томатная паста',
    // 5. Drinks & Tea & Bread
    'чай', 'пиала', 'наурыз', 'gracio', 'asu', 'хлеб', 'батон', 'печенье'
  ];

  const added = new Set();
  for (const kw of targetKeywords) {
    for (const item of allEans) {
      if (pilotEans.length >= 100) break;
      if (added.has(item.ean)) continue;
      const text = `${item.name} ${item.brand}`.toLowerCase();
      if (text.includes(kw)) {
        pilotEans.push(item);
        added.add(item.ean);
      }
    }
  }

  // If under 100, pad with remaining items
  for (const item of allEans) {
    if (pilotEans.length >= 100) break;
    if (!added.has(item.ean)) {
      pilotEans.push(item);
      added.add(item.ean);
    }
  }

  fs.writeFileSync(
    path.join(cacheDir, 'pilot_seed_eans.json'),
    JSON.stringify(pilotEans, null, 2),
    'utf8'
  );
  console.log(`Generated pilot batch: ${pilotEans.length} diverse items in data/v3_cache/pilot_seed_eans.json`);
}

collectSeedEans().catch(console.error);
