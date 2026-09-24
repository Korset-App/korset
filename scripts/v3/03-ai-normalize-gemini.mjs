/**
 * Step 03: AI-Powered Normalization Pipeline via Gemini 3.5 Flash-lite
 * Ingests factory trade names and 1C strings, extracts pristine structured attributes
 * (canonical name RU/KZ, brand, exact quantity, unit, fat %, flavor, packaging, Körset category).
 * Includes a Deterministic Validator to guard against LLM hallucinations.
 */

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

const KORSET_CATEGORIES = [
  'dairy_eggs', 'meat', 'deli', 'fish', 'water_beverages', 'tea_coffee',
  'sweets', 'snacks', 'grocery', 'sauces_spices', 'bread', 'frozen',
  'fruits_veg', 'baby_food', 'ready_meals', 'healthy', 'personal_care', 'household'
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
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
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini');
      const parsed = JSON.parse(rawText);
      return Array.isArray(parsed) ? parsed : (parsed.items || []);
    } catch (err) {
      console.warn(`Gemini batch attempt ${attempt} failed: ${err.message}`);
      if (attempt < 3) await sleep(2000 * attempt);
      else throw err;
    }
  }
}

// Deterministic Safety Validator
function validateExtraction(rawText, parsed) {
  const issues = [];
  const text = String(rawText).toLowerCase().replace(/,/g, '.');

  // Validate quantity
  if (parsed.quantity_value !== null && parsed.quantity_value !== undefined) {
    const qStr = String(parsed.quantity_value);
    // Check if number or direct match exists in rawText
    if (!text.includes(qStr)) {
      // Could be kg -> g conversion (e.g. 1кг -> 1000)
      if (parsed.quantity_value === 1000 && !text.includes('1кг') && !text.includes('1л') && !text.includes('1000') && !text.includes('1 кг') && !text.includes('1 л') && !text.includes('1.0')) {
        issues.push(`Quantity ${parsed.quantity_value} not found in raw text`);
      }
    }
  }

  // Validate fat
  if (parsed.fat_percent !== null && parsed.fat_percent !== undefined) {
    const fStr = String(parsed.fat_percent);
    if (!text.includes(fStr)) {
      issues.push(`Fat % ${parsed.fat_percent} not found in raw text`);
    }
  }

  // Validate category
  if (!KORSET_CATEGORIES.includes(parsed.category)) {
    parsed.category = 'grocery'; // fallback
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

async function runNormalization(inputFile, outputFile) {
  console.log('=== Step 03: AI Normalization via Gemini 3.5 Flash-lite ===');
  const inPath = path.join(__dirname, '..', '..', 'data', 'v3_cache', inputFile);
  const outPath = path.join(__dirname, '..', '..', 'data', 'v3_cache', outputFile);

  if (!fs.existsSync(inPath)) {
    console.error(`Input file ${inPath} does not exist. Run Step 02 first.`);
    return;
  }

  const rawCache = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const items = Object.values(rawCache);

  console.log(`Loaded ${items.length} items for AI normalization.`);

  let normalizedMap = {};
  if (fs.existsSync(outPath)) {
    try {
      normalizedMap = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    } catch {}
  }

  const BATCH_SIZE = 12;
  const toProcess = items.filter(it => !normalizedMap[it.ean]);
  console.log(`Items remaining to normalize: ${toProcess.length}`);

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const chunk = toProcess.slice(i, i + BATCH_SIZE);
    const batchInput = chunk.map(it => {
      const raw = it.npc?.name_ru_factory || it.seed_name || '';
      return {
        ean: it.ean,
        raw_text: raw,
        brand_hint: it.npc?.brand_factory || it.seed_brand || '',
        tnved_hint: it.npc?.tnved_name || '',
      };
    });

    try {
      const results = await callGeminiBatch(batchInput);
      for (const res of results) {
        const orig = chunk[res.index];
        if (!orig) continue;

        const validation = validateExtraction(orig.npc?.name_ru_factory || orig.seed_name, res);

        normalizedMap[orig.ean] = {
          ean: orig.ean,
          raw_source_name: orig.npc?.name_ru_factory || orig.seed_name,
          canonical_name: res.canonical_name,
          name_kz: res.name_kz,
          brand: res.brand,
          category: res.category,
          subcategory: res.subcategory || null,
          quantity: res.quantity_display,
          quantity_value: res.quantity_value,
          quantity_unit: res.quantity_unit,
          fat_percent: res.fat_percent,
          flavor: res.flavor,
          package_type: res.package_type,
          tnved: orig.npc?.tnved_code || null,
          producer_name: orig.npc?.producer || null,
          producer_bin: orig.npc?.producer_bin || null,
          country_of_origin: orig.npc?.country || null,
          validation_status: validation.valid ? 'passed' : 'flagged',
          validation_issues: validation.issues,
        };
      }

      console.log(`Normalized ${Math.min(i + BATCH_SIZE, toProcess.length)}/${toProcess.length} items`);
      fs.writeFileSync(outPath, JSON.stringify(normalizedMap, null, 2), 'utf8');
      await sleep(100);
    } catch (err) {
      console.error(`Error processing batch starting at ${i}:`, err.message);
    }
  }

  console.log(`Step 03 complete. Total normalized in cache: ${Object.keys(normalizedMap).length}`);
}

const args = process.argv.slice(2);
const isPilot = !args.includes('--full');
const inputFile = isPilot ? 'npc_pilot_results.json' : 'npc_full_results.json';
const outputFile = isPilot ? 'pilot_normalized.json' : 'full_normalized.json';

runNormalization(inputFile, outputFile).catch(console.error);
