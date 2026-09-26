/**
 * scripts/audit-catalog-500-sample.mjs
 * 
 * Strict 500-Product Catalog Audit on Core Studio Assortment (23,112 items)
 *  - Part 1: Exactly 250 Products inspected via Google Gemini Vision API
 *            (Packshot vs Name, Brand, Flavor, Volume, Watermarks)
 *            Running with concurrency = 5 for high speed (~2-3 mins).
 *  - Part 2: Exactly 250 Products deep-audited for Composition & KBJU Consistency
 *            (Ingredients vs Title/Flavor, Plausible Nutriments, Halal Integrity)
 * 
 * Generates data/audit_500_sample_results.json with detailed findings.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const AUDIT_OUT_PATH = path.join(__dirname, '..', 'data', 'audit_500_sample_results.json');

// Gemini API Key
const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const keyMatch = envLocal.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
if (!keyMatch) {
  console.error('FATAL: GEMINI_API_KEY missing in .env.local');
  process.exit(1);
}
const GEMINI_API_KEY = keyMatch[1];
const GEMINI_MODEL = 'models/gemini-flash-latest';

function cleanNutriments(n) {
  if (!n || typeof n !== 'object') return null;
  const kcal = n.energy_kcal != null && !isNaN(Number(n.energy_kcal)) ? Number(n.energy_kcal) : null;
  const p = n.protein_100g != null && !isNaN(Number(n.protein_100g)) ? Number(n.protein_100g) : null;
  const f = n.fat_100g != null && !isNaN(Number(n.fat_100g)) ? Number(n.fat_100g) : null;
  const c = n.carbohydrates_100g != null && !isNaN(Number(n.carbohydrates_100g)) ? Number(n.carbohydrates_100g) : null;

  if (kcal == null && p == null && f == null && c == null) return null;
  const res = {};
  if (kcal != null && kcal >= 0 && kcal <= 1000) res.energy_kcal = kcal;
  if (p != null && p >= 0 && p <= 100) res.protein_100g = p;
  if (f != null && f >= 0 && f <= 100) res.fat_100g = f;
  if (c != null && c >= 0 && c <= 100) res.carbohydrates_100g = c;
  return Object.keys(res).length > 0 ? res : null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Pseudo-random deterministic shuffle
function pseudoShuffle(arr, seed = 42) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function verifyImageWithGemini(imageUrl, product) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const imgRes = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(12000)
      });
      if (!imgRes.ok) {
        return { isMatch: false, confidence: 0, rationale: `Image download failed with status ${imgRes.status}` };
      }
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const mime = imgRes.headers.get('content-type') || 'image/jpeg';

      const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `Inspect the attached retail product packshot and verify if it matches the target product record:
Target Product:
- EAN: "${product.ean}"
- Name: "${product.name}"
- Brand: "${product.brand || 'N/A'}"
- Category: "${product.category || 'N/A'}"

Evaluate with extreme rigor:
1. Brand: Does the brand on packaging match target brand?
2. Product Type & Flavor: Does the flavor, aroma, or variant match? (e.g. Cherry vs Strawberry, Dark vs Milk chocolate).
3. Package Format & Volume: Does the format (bottle, jar, pack, bar) match the product title?
4. Quality: Is it a clean studio packshot? Does it have any watermark or amateur photo artifacts?

Return strictly valid JSON:
{
  "isMatch": boolean,
  "confidence": number,
  "recognizedBrand": string,
  "recognizedProduct": string,
  "recognizedFlavorOrVariant": string,
  "hasWatermark": boolean,
  "rationale": "Clear Russian explanation of your verdict"
}`;

      const aiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mime, data: b64 } }
            ]
          }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (aiRes.status === 429 || aiRes.status >= 500) {
        await sleep(1500 * attempt);
        continue;
      }

      if (!aiRes.ok) {
        return { isMatch: false, confidence: 0, rationale: `API Error ${aiRes.status}` };
      }

      const data = await aiRes.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { isMatch: false, confidence: 0, rationale: 'Empty Gemini response' };

      return JSON.parse(text);
    } catch (e) {
      if (attempt === 3) {
        return { isMatch: false, confidence: 0, rationale: `Exception: ${e.message}` };
      }
      await sleep(1000 * attempt);
    }
  }
  return { isMatch: false, confidence: 0, rationale: 'Exhausted retries' };
}

async function auditDataConsistency(product) {
  const name = (product.name || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const cat = (product.category || '').toLowerCase();
  const ing = (product.ingredients_raw || '').toLowerCase();
  const nutr = cleanNutriments(product.nutriments_json);
  const isHalal = product.halal_status === 'yes';

  const issues = [];

  // 1. Check non-food contamination
  if (cat === 'household' || cat === 'personal_care') {
    if (nutr) {
      issues.push(`КБЖУ у непродовольственного товара категории ${cat}`);
    }
    if (ing.includes('говядин') || ing.includes('мука пшеничн') || ing.includes('свинин') || ing.includes('сахар белый')) {
      issues.push(`Пищевой состав у бытовой химии/гигиены`);
    }
    if (isHalal) {
      issues.push(`Халяль у непродовольственного товара`);
    }
  }

  // 2. Check Halal Haram contamination
  if (isHalal) {
    if (ing.includes('свинин') || ing.includes('шпик') || ing.includes('бекон') || ing.includes('ветчин') || name.includes('свинин') || name.includes('свин.')) {
      issues.push(`Свинина/шпик в составе товара со статусом Halal!`);
    }
  }

  // 3. Check Flavor / Key Ingredient consistency
  if (ing.length > 5) {
    const flavorKeywords = ['клубник', 'малин', 'вишн', 'шоколад', 'кофе', 'сыр', 'томат', 'чеснок', 'гриб', 'куриц', 'говядин'];
    for (const kw of flavorKeywords) {
      if (name.includes(kw)) {
        const hasKwInIng = ing.includes(kw) || ing.includes('ароматизатор') || ing.includes('вкус') || ing.includes('наполнитель');
        if (!hasKwInIng && ing.length > 50) {
          issues.push(`В названии указан "${kw}", но в составе нет упоминания "${kw}" или ароматизатора`);
        }
      }
    }
  }

  // 4. Check КБЖУ plausibility
  if (nutr) {
    if (nutr.energy_kcal != null && (nutr.energy_kcal < 0 || nutr.energy_kcal > 950)) {
      issues.push(`Неправдоподобная калорийность: ${nutr.energy_kcal} ккал`);
    }
    if (nutr.protein_100g != null && (nutr.protein_100g < 0 || nutr.protein_100g > 100)) {
      issues.push(`Неправдоподобный белок: ${nutr.protein_100g} г`);
    }
    if (nutr.fat_100g != null && (nutr.fat_100g < 0 || nutr.fat_100g > 100)) {
      issues.push(`Неправдоподобный жир: ${nutr.fat_100g} г`);
    }
    if (nutr.carbohydrates_100g != null && (nutr.carbohydrates_100g < 0 || nutr.carbohydrates_100g > 100)) {
      issues.push(`Неправдоподобные углеводы: ${nutr.carbohydrates_100g} г`);
    }
    const sumMacronutrients = (nutr.protein_100g || 0) + (nutr.fat_100g || 0) + (nutr.carbohydrates_100g || 0);
    if (sumMacronutrients > 105) {
      issues.push(`Сумма макронутриентов превышает 100 г: ${sumMacronutrients.toFixed(1)} г`);
    }
  }

  return {
    isClean: issues.length === 0,
    issues,
    summary: issues.length === 0 ? 'Данные состава и КБЖУ полностью согласованы с товаром' : issues.join('; ')
  };
}

export async function runFullAudit({ sampleSize = 500, concurrency = 5 } = {}) {
  console.log(`\n======================================================`);
  console.log(`=== КАТАЛОГ V4: СТРОГИЙ АУДИТ 500 ТОВАРОВ ИЗ 23 112 ===`);
  console.log(`=== Выборка: 250 фото через Google Vision + 250 состав/КБЖУ ===`);
  console.log(`======================================================\n`);

  // 1. Load Master Products with Studio Photos
  console.log('Загрузка товаров из Золотого Мастера V4...');
  const studioProducts = [];
  const rl = readline.createInterface({ input: fs.createReadStream(MASTER_PATH) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    if (p.image_url && !p.image_url.includes('empty_photo')) {
      studioProducts.push(p);
    }
  }
  console.log(`Всего товаров со студийными фото: ${studioProducts.length}`);

  // Shuffle and select exactly 250 for Vision and 250 for Data Consistency
  const shuffled = pseudoShuffle(studioProducts, 777);
  const part1Vision = shuffled.slice(0, 250);
  const part2Data = shuffled.slice(250, 500);

  console.log(`Выбрано для аудита:`);
  console.log(`- Часть 1 (Google AI Vision по фото): ${part1Vision.length} товаров (конкурентность: ${concurrency})`);
  console.log(`- Часть 2 (Аудит состава и КБЖУ):      ${part2Data.length} товаров`);

  // -------------------------------------------------------------------------
  // RUN PART 1: Google AI Vision (Concurrent)
  // -------------------------------------------------------------------------
  console.log(`\n--- ЧАСТЬ 1: Аудит 250 фото через Google AI Vision ---`);
  const visionResults = new Array(part1Vision.length);
  let completed = 0;
  let visionMatches = 0;
  let visionMismatches = 0;
  let visionErrors = 0;

  async function worker(startIndex, step) {
    for (let i = startIndex; i < part1Vision.length; i += step) {
      const p = part1Vision[i];
      const vRes = await verifyImageWithGemini(p.image_url, p);
      visionResults[i] = {
        ean: p.ean,
        name: p.name,
        brand: p.brand,
        category: p.category,
        imageUrl: p.image_url,
        hasIngredients: Boolean(p.ingredients_raw),
        hasNutriments: Boolean(cleanNutriments(p.nutriments_json)),
        aiResult: vRes
      };

      if (vRes.isMatch) visionMatches++;
      else if (vRes.confidence > 0) visionMismatches++;
      else visionErrors++;

      completed++;
      if (completed % 10 === 0 || completed === part1Vision.length) {
        console.log(`[Vision Progress] ${completed}/${part1Vision.length} проверено | Совпало: ${visionMatches} | Не совпало: ${visionMismatches} | Ошибок: ${visionErrors}`);
      }
      await sleep(250);
    }
  }

  const workers = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(worker(w, concurrency));
  }
  await Promise.all(workers);

  console.log(`\nИтоги Части 1 (AI Vision):`);
  console.log(`  Полное совпадение фото и товара: ${visionMatches} / ${part1Vision.length} (${((visionMatches/part1Vision.length)*100).toFixed(1)}%)`);
  console.log(`  Несовпадение фото / расхождение вкуса: ${visionMismatches} / ${part1Vision.length} (${((visionMismatches/part1Vision.length)*100).toFixed(1)}%)`);
  console.log(`  Ошибки сети/загрузки: ${visionErrors}`);

  // -------------------------------------------------------------------------
  // RUN PART 2: Data Integrity & Consistency
  // -------------------------------------------------------------------------
  console.log(`\n--- ЧАСТЬ 2: Аудит 250 товаров на чистоту состава и КБЖУ ---`);
  const dataResults = [];
  let dataClean = 0;
  let dataIssuesCount = 0;

  for (let i = 0; i < part2Data.length; i++) {
    const p = part2Data[i];
    const check = await auditDataConsistency(p);
    dataResults.push({
      ean: p.ean,
      name: p.name,
      brand: p.brand,
      category: p.category,
      ingredients: p.ingredients_raw ? p.ingredients_raw.slice(0, 100) : null,
      nutriments: p.nutriments_json,
      halalStatus: p.halal_status,
      check
    });

    if (check.isClean) {
      dataClean++;
    } else {
      dataIssuesCount++;
    }
  }

  console.log(`\nИтоги Части 2 (Составы и КБЖУ):`);
  console.log(`  Идеально согласованы: ${dataClean} / ${part2Data.length} (${((dataClean/part2Data.length)*100).toFixed(1)}%)`);
  console.log(`  Выявлены замечания:   ${dataIssuesCount} / ${part2Data.length} (${((dataIssuesCount/part2Data.length)*100).toFixed(1)}%)`);

  // Write full audit findings to file
  const fullAuditReport = {
    auditDate: new Date().toISOString(),
    totalAudited: 500,
    part1Vision: {
      total: part1Vision.length,
      matches: visionMatches,
      mismatches: visionMismatches,
      errors: visionErrors,
      sampleMismatches: visionResults.filter(r => r && !r.aiResult?.isMatch).slice(0, 20)
    },
    part2Data: {
      total: part2Data.length,
      clean: dataClean,
      issuesCount: dataIssuesCount,
      sampleIssues: dataResults.filter(r => !r.check?.isClean).slice(0, 20)
    }
  };

  fs.writeFileSync(AUDIT_OUT_PATH, JSON.stringify(fullAuditReport, null, 2), 'utf8');
  console.log(`\n[Audit] Полный отчет сохранен в: ${AUDIT_OUT_PATH}`);

  return fullAuditReport;
}

if (process.argv[1] && process.argv[1].endsWith('audit-catalog-500-sample.mjs')) {
  runFullAudit().catch(err => {
    console.error('Fatal audit error:', err);
    process.exit(1);
  });
}
