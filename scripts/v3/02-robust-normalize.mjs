import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY missing from .env.local');
  process.exit(1);
}

const CACHE_DIR = path.join(__dirname, '..', '..', 'data', 'v3_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const KORSET_CATEGORIES = [
  'dairy_eggs', 'meat', 'deli', 'fish', 'water_beverages', 'tea_coffee',
  'sweets', 'snacks', 'grocery', 'sauces_spices', 'bread', 'frozen',
  'fruits_veg', 'baby_food', 'ready_meals', 'healthy', 'personal_care', 'household'
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function validateExtraction(rawText, parsed) {
  const issues = [];
  const text = String(rawText || '').toLowerCase().replace(/,/g, '.');

  if (parsed.quantity_value !== null && parsed.quantity_value !== undefined) {
    const qStr = String(parsed.quantity_value);
    if (!text.includes(qStr)) {
      if (parsed.quantity_value === 1000 && !text.includes('1кг') && !text.includes('1л') && !text.includes('1000') && !text.includes('1 кг') && !text.includes('1 л') && !text.includes('1.0')) {
        issues.push(`Quantity ${parsed.quantity_value} not in raw text`);
      }
    }
  }

  if (parsed.fat_percent !== null && parsed.fat_percent !== undefined) {
    const fStr = String(parsed.fat_percent);
    if (!text.includes(fStr)) {
      issues.push(`Fat % ${parsed.fat_percent} not in raw text`);
    }
  }

  if (!KORSET_CATEGORIES.includes(parsed.category)) {
    parsed.category = 'grocery';
  }

  return { valid: issues.length === 0, issues };
}

async function callGeminiBatch(batchItems) {
  const prompt = `Ты — ведущий эксперт по товарной номенклатуре и продуктовому ритейлу Казахстана.
Для каждого сырого заводского наименования (1С / Национальный каталог товаров) извлеки строго проверенные структурированные характеристики.

Входные данные:
${JSON.stringify(batchItems.map((item, idx) => ({
  index: idx,
  raw_text: item.raw_text,
  ean: item.ean,
  brand_hint: item.brand_hint,
  tnved_hint: item.tnved_hint
})), null, 2)}

Правила:
1. canonical_name: Красивое, уважительное название на русском языке для карточки товара в мобильном приложении (без заводских служебных кодов, без лишних "ПР", "ТД", "Д.П", "Т15", "Ж/Б").
2. name_kz: Грамотный перевод названия на казахский язык (для покупателей Казахстана).
3. brand: Официальная торговая марка (например: "3 Желания", "Lays", "Рахат", "Восток-Молоко", "Эмиль", "Гормолзавод", "Ferrero", "Bonduelle"). Если бренда нет — пиши название производителя или "Не указан".
4. quantity_value: Точное числовое значение веса или объема (например 700, 150, 400, 1, 250, 85). Если вес в кг/литрах (например 1 кг, 1 л) переводи в граммы/мл (1000) или ставь число и соответствующий quantity_unit.
5. quantity_unit: Единица измерения ('g', 'ml', 'kg', 'l', 'pcs').
6. quantity_display: Строка для ценника/карточки (например "150 г", "700 г", "1 л", "400 мл").
7. fat_percent: Процент жирности числом (например 67, 3.5, 2.5, 15, 72.5). Если товар обезжиренный или жирность не применима (например чипсы, чай, конфеты) — обязательно ставь null!
8. flavor: ТОЧНЫЙ вкус, аромат, сорт или наполнитель (например: "кокос и миндаль", "нежный сыр с зеленью", "провансаль", "топленое", "клубника", "малина"). Если это классический базовый продукт без наполнителя (обычный хлеб, обычное молоко, рафинированное масло) — ставь null.
9. package_type: Тип тары (например: "дой-пак", "бутылка", "стакан", "пакет", "коробка", "плитка", "жестяная банка", "стеклянная банка", "ведро", "тетра-пак").
10. category: Строго одна из 18 стандартных категорий Körset: ${JSON.stringify(KORSET_CATEGORIES)}.

Верни строго JSON массив объектов с полем index, соответствующим входному индексу.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }
  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini');
  const parsed = JSON.parse(rawText);
  return Array.isArray(parsed) ? parsed : (parsed.items || []);
}

export async function runRobustNormalization() {
  console.log('===============================================================');
  console.log('  CATALOG V3: ROBUST ZERO-LOSS AI NORMALIZATION (GEMINI)       ');
  console.log('===============================================================\n');

  const normPath = path.join(CACHE_DIR, 'full_normalized.json');
  let normCache = {};
  if (fs.existsSync(normPath)) {
    try { normCache = JSON.parse(fs.readFileSync(normPath, 'utf8')); } catch {}
  }
  console.log(`Already normalized in cache: ${Object.keys(normCache).length}`);

  // Gather items to normalize from all sources
  const toProcessMap = new Map();

  // 1. From NPC Full Results (base 11,399 items)
  const npcFullPath = path.join(CACHE_DIR, 'npc_full_results.json');
  if (fs.existsSync(npcFullPath)) {
    const npcFull = JSON.parse(fs.readFileSync(npcFullPath, 'utf8'));
    for (const [ean, item] of Object.entries(npcFull)) {
      if (!normCache[ean]) {
        toProcessMap.set(ean, {
          ean,
          raw_text: item.npc?.name_ru_factory || item.seed_name || '',
          brand_hint: item.npc?.brand_factory || item.seed_brand || '',
          tnved_hint: item.npc?.tnved_name || '',
          npc: item.npc
        });
      }
    }
  }

  // 2. From NPC Category Products
  const npcCatPath = path.join(CACHE_DIR, 'npc_category_products.json');
  if (fs.existsSync(npcCatPath)) {
    const npcCat = JSON.parse(fs.readFileSync(npcCatPath, 'utf8'));
    for (const [ean, item] of Object.entries(npcCat)) {
      if (!normCache[ean] && !toProcessMap.has(ean)) {
        toProcessMap.set(ean, {
          ean,
          raw_text: item.name_ru || '',
          brand_hint: item.brand || '',
          tnved_hint: item.tnved_name || '',
          npc: {
            source: 'npc_category',
            gtin: ean,
            name_ru_factory: item.name_ru,
            name_kk_factory: item.name_kk,
            brand_factory: item.brand,
            producer: item.producer,
            producer_bin: item.producer_bin,
            country: item.country,
            tnved_code: item.tnved_code,
            tnved_name: item.tnved_name
          }
        });
      }
    }
  }

  // 3. From OFF Products
  const offPath = path.join(CACHE_DIR, 'off_products.json');
  if (fs.existsSync(offPath)) {
    const offData = JSON.parse(fs.readFileSync(offPath, 'utf8'));
    for (const [ean, item] of Object.entries(offData)) {
      if (!normCache[ean] && !toProcessMap.has(ean)) {
        toProcessMap.set(ean, {
          ean,
          raw_text: item.name,
          brand_hint: item.brand || '',
          tnved_hint: '',
          off: item
        });
      }
    }
  }

  const unNormalized = Array.from(toProcessMap.values());
  console.log(`Items pending normalization: ${unNormalized.length}\n`);

  if (unNormalized.length === 0) {
    console.log('All products are already normalized!');
    return normCache;
  }

  const BATCH_SIZE = 20;
  let i = 0;

  while (i < unNormalized.length) {
    const chunk = unNormalized.slice(i, i + BATCH_SIZE);
    const batchInput = chunk.map(it => ({
      ean: it.ean,
      raw_text: it.raw_text,
      brand_hint: it.brand_hint,
      tnved_hint: it.tnved_hint,
    }));

    let success = false;
    let attempts = 0;

    while (!success && attempts < 8) {
      attempts++;
      try {
        const results = await callGeminiBatch(batchInput);
        for (const res of results) {
          const orig = chunk[res.index];
          if (!orig) continue;

          const val = validateExtraction(orig.raw_text, res);
          normCache[orig.ean] = {
            ean: orig.ean,
            raw_source_name: orig.raw_text,
            canonical_name: res.canonical_name || orig.raw_text,
            name_kz: res.name_kz || orig.npc?.name_kk_factory || null,
            brand: res.brand || orig.brand_hint || null,
            category: res.category || 'grocery',
            subcategory: res.subcategory || null,
            quantity: res.quantity_display || null,
            quantity_value: res.quantity_value || null,
            quantity_unit: res.quantity_unit || null,
            fat_percent: res.fat_percent || null,
            flavor: res.flavor || null,
            package_type: res.package_type || null,
            tnved: orig.npc?.tnved_code || null,
            producer_name: orig.npc?.producer || null,
            producer_bin: orig.npc?.producer_bin || null,
            country_of_origin: orig.npc?.country || null,
            validation_status: val.valid ? 'passed' : 'flagged',
            validation_issues: val.issues || [],
          };
        }

        fs.writeFileSync(normPath, JSON.stringify(normCache, null, 2), 'utf8');
        success = true;
        process.stdout.write(`\r[AI Progress] ${Math.min(i + BATCH_SIZE, unNormalized.length)}/${unNormalized.length} normalized (${Object.keys(normCache).length} total)`);
        await sleep(3500); // Respect Google Free Tier 15 RPM
      } catch (err) {
        const delay = Math.min(attempts * 4000, 30000);
        console.warn(`\n[AI Notice at ${i}, attempt ${attempts}/8]: ${err.message}. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }

    // Zero-Loss Fallback: If 8 API attempts failed, preserve item with fallback metadata
    if (!success) {
      console.warn(`\n[Fallback applied at index ${i}] Saving chunk with heuristic parsing to prevent data loss.`);
      for (const orig of chunk) {
        normCache[orig.ean] = {
          ean: orig.ean,
          raw_source_name: orig.raw_text,
          canonical_name: orig.raw_text,
          name_kz: orig.npc?.name_kk_factory || null,
          brand: orig.brand_hint || null,
          category: 'grocery',
          subcategory: null,
          quantity: null,
          quantity_value: null,
          quantity_unit: null,
          fat_percent: null,
          flavor: null,
          package_type: null,
          tnved: orig.npc?.tnved_code || null,
          producer_name: orig.npc?.producer || null,
          producer_bin: orig.npc?.producer_bin || null,
          country_of_origin: orig.npc?.country || null,
          validation_status: 'flagged',
          validation_issues: ['ai_timeout_fallback'],
        };
      }
      fs.writeFileSync(normPath, JSON.stringify(normCache, null, 2), 'utf8');
    }

    i += BATCH_SIZE;
  }

  fs.writeFileSync(normPath, JSON.stringify(normCache, null, 2), 'utf8');
  console.log(`\n\n=== Robust Normalization Complete! Total products: ${Object.keys(normCache).length} ===\n`);
  return normCache;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRobustNormalization().catch(console.error);
}
