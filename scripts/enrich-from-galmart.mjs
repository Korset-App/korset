/**
 * enrich-from-galmart.mjs  (v2 — fast inverted-index matching)
 * Matches Galmart catalog to clean_products_v2 using a token-based
 * inverted index — runs in seconds, no AI, no paid APIs.
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Helpers ────────────────────────────────────────────────────────────────

const norm = s => (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

const tokens = s => new Set(norm(s).split(' ').filter(w => w.length > 3));

const extractGrams = s => {
  const m = (s || '').match(/(\d[\d,.]*)\s*(кг|kg|г\b|гр|g\b|мл|ml|л\b|l\b)/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  if (u === 'кг' || u === 'kg') return Math.round(v * 1000);
  if (u === 'л' || u === 'l') return Math.round(v * 1000);
  return Math.round(v);
};

// ─── Load Galmart ────────────────────────────────────────────────────────────

console.log('Loading Galmart catalog...');
const galmart = JSON.parse(fs.readFileSync('data/galmart_catalog.json', 'utf8'))
  .filter(g => g.description || g.composition || g.calories || g.storage_conditions);
console.log(`Useful Galmart items: ${galmart.length}`);

// Build inverted index: token → [galmartItem indices]
const invertedIndex = new Map();
galmart.forEach((g, idx) => {
  for (const tok of tokens(g.title)) {
    if (!invertedIndex.has(tok)) invertedIndex.set(tok, []);
    invertedIndex.get(tok).push(idx);
  }
});

function findBestMatch(product) {
  const productTokens = tokens(product.name);
  if (!productTokens.size) return null;

  // Count how many of our tokens appear in each galmart item
  const scores = new Map();
  for (const tok of productTokens) {
    const candidates = invertedIndex.get(tok) || [];
    for (const idx of candidates) {
      scores.set(idx, (scores.get(idx) || 0) + 1);
    }
  }

  if (!scores.size) return null;

  // Find best scoring galmart item
  let bestIdx = -1, bestScore = 0;
  for (const [idx, score] of scores) {
    const ratio = score / Math.max(productTokens.size, tokens(galmart[idx].title).size);
    if (ratio > bestScore) {
      bestScore = ratio;
      bestIdx = idx;
    }
  }

  if (bestScore < 0.55) return null;

  const g = galmart[bestIdx];

  // Weight sanity check
  const gw = extractGrams(g.title);
  const pw = extractGrams(product.name) || extractGrams(product.quantity);
  if (gw && pw && Math.abs(gw - pw) / Math.max(gw, pw) > 0.08) return null;

  return g;
}

// ─── Fetch our products missing data (paginated) ─────────────────────────────

console.log('Fetching products missing description or ingredients...');
const ourProducts = [];
let offset = 0;
while (true) {
  const { data } = await supabase
    .from('clean_products_v2')
    .select('id, ean, name, brand, quantity, description, ingredients_raw, storage_conditions, country_of_origin, producer_name, nutriments_json')
    .or('description.is.null,ingredients_raw.is.null')
    .range(offset, offset + 999);
  if (!data || data.length === 0) break;
  ourProducts.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
console.log(`Products to enrich: ${ourProducts.length}`);

// ─── Match ───────────────────────────────────────────────────────────────────

const updates = [];
let matched = 0;

for (const p of ourProducts) {
  const g = findBestMatch(p);
  if (!g) continue;
  matched++;

  const upd = { id: p.id };
  let changed = false;

  if (!p.description && g.description) { upd.description = g.description.trim(); changed = true; }
  if (!p.ingredients_raw && g.composition) { upd.ingredients_raw = g.composition.trim(); changed = true; }
  if (!p.storage_conditions && g.storage_conditions) { upd.storage_conditions = g.storage_conditions.trim(); changed = true; }
  if (!p.country_of_origin && g.country) { upd.country_of_origin = g.country; changed = true; }
  if (!p.producer_name && g.manufacturer) { upd.producer_name = g.manufacturer; changed = true; }
  if (!p.nutriments_json && (g.calories || g.protein || g.fat || g.carbs)) {
    upd.nutriments_json = JSON.stringify({
      energy_kcal_100g: g.calories,
      proteins_100g: g.protein,
      fat_100g: g.fat,
      carbohydrates_100g: g.carbs
    });
    changed = true;
  }

  if (changed) updates.push(upd);
}

console.log(`Matched: ${matched}, updates to write: ${updates.length}`);

// ─── Write in batches of 100 ─────────────────────────────────────────────────

let written = 0;
const CONCURRENCY = 20;
for (let i = 0; i < updates.length; i += CONCURRENCY) {
  const chunk = updates.slice(i, i + CONCURRENCY);
  await Promise.all(chunk.map(async upd => {
    const { id, ...fields } = upd;
    const { error } = await supabase.from('clean_products_v2').update(fields).eq('id', id);
    if (!error) written++;
  }));
  if (i % 200 === 0) process.stdout.write(`\rWritten ${written}/${updates.length}...`);
}

// ─── Final stats ──────────────────────────────────────────────────────────────

const { count: noIng } = await supabase.from('clean_products_v2').select('*', { count: 'exact', head: true }).is('ingredients_raw', null);
const { count: noDesc } = await supabase.from('clean_products_v2').select('*', { count: 'exact', head: true }).is('description', null);

console.log(`\n\n=== DONE ===`);
console.log(`Written: ${written} records`);
console.log(`Remaining missing ingredients: ${noIng}`);
console.log(`Remaining missing descriptions: ${noDesc}`);
