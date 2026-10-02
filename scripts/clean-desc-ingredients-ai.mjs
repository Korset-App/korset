import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqKey = (process.env.GROQ_API_KEY || '').replace(/['"]/g, '').trim();
const geminiKey = (process.env.GEMINI_API_KEY || '').replace(/['"]/g, '').trim();
const deepseekKey = (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || '').replace(/['"]/g, '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}
if (!groqKey && !geminiKey && !deepseekKey) {
  console.error('Missing AI API keys (GROQ_API_KEY, GEMINI_API_KEY) in .env.local');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const SYSTEM_PROMPT = `Ты — ведущий эксперт по стандартизации каталогов потребительских товаров (e-commerce catalog master data editor).
В каталоге продуктов питания и FMCG поля description (описание) и ingredients_raw (состав) часто загрязнены, склеены и дублируют друг друга:
- В description поставщики часто вставляют и рекламу, и состав ("Состав: ..."), и адрес фабрики/изготовителя, и историю бренда.
- В ingredients_raw часто попадает не только чистый перечень компонентов, но и рекламные слоганы ("Мы сделали йогурт так..."), способы применения ("Способ применения: растворить 150г..."), контакты изготовителя ("Изготовитель: ИП...").

Твоя задача — для каждого товара из входящего списка аккуратно и хирургически разделить текст на два эталонных поля:

1. "description":
   - Только полезное потребительское и маркетинговое описание товара (вкус, назначение, ключевые особенности, гастрономические сочетания).
   - ПОЛНОСТЬЮ УДАЛИ из описания перечисление состава (включая блоки "Состав:", "СОСТАВ:", "Құрамы:").
   - ПОЛНОСТЬЮ УДАЛИ адреса заводов, реквизиты, телефоны, ГОСТ/ТУ (если они в конце текста).
   - Если в исходном тексте не было настоящего описания (а был только состав), верни null.
   - Текст должен быть связным, грамотным на русском языке, без висячих обрывков фраз.

2. "ingredients_raw":
   - Только чистый строгий перечень ингредиентов и компонентов (пищевые ингредиенты, пищевые добавки E-номера, закваски, специи, химические ПАВ для бытовой химии).
   - ПОЛНОСТЬЮ УДАЛИ вводные слова "Состав:", "Состав продукта:", "Құрамы:".
   - ПОЛНОСТЬЮ УДАЛИ любые рекламные лозунги, обещания бренда, истории создания продукта.
   - ПОЛНОСТЬЮ УДАЛИ способы применения / инструкции по стирке / рецепты.
   - ПОЛНОСТЬЮ УДАЛИ упоминания изготовителя ("Изготовитель:", "Произведено:", "ИП...").
   - Если состава нигде в предоставленном тексте нет, верни null.

3. "manufacturer":
   - Если в исходном тексте прямо указан изготовитель/производитель (например: "ИП Шамахсутов... г. Тараз", "Procter & Gamble", "ООО Юнилевер Русь"), выдели его короткой строкой. Иначе верни null.

ВАЖНЫЕ ИНВАРИАНТЫ:
- НИКОГДА не выдумывай и не галлюцинируй факты или ингредиенты, которых нет во входных данных. Только извлечение и очистка.
- Сохраняй исходные формулировки ингредиентов (проценты, скобки, экстракты), не искажая рецептуру.

Верни строго JSON объект с полем "products":
{
  "products": [
    {
      "id": "uuid товара",
      "description": "очищенное описание или null",
      "ingredients_raw": "очищенный состав или null",
      "manufacturer": "выделенный изготовитель или null"
    }
  ]
}`;

function parseAiResponse(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (jsonErr) {
    const cleanedContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleanedContent);
  }

  let list = [];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (Array.isArray(parsed.products)) {
    list = parsed.products;
  } else if (Array.isArray(parsed.items)) {
    list = parsed.items;
  } else if (Array.isArray(parsed.result)) {
    list = parsed.result;
  } else if (typeof parsed === 'object' && parsed !== null) {
    list = Object.entries(parsed).map(([k, v]) => {
      if (v && typeof v === 'object') {
        return { id: v.id || k, ...v };
      }
      return null;
    }).filter(Boolean);
  }

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Parsed response is empty or not convertible to array: ' + content.slice(0, 100));
  }
  return list;
}

const MODEL_POOL = [
  ...(groqKey ? [
    { provider: 'groq', model: 'openai/gpt-oss-120b' },
    { provider: 'groq', model: 'qwen/qwen3.8-27b' },
    { provider: 'groq', model: 'openai/gpt-oss-20b' }
  ] : []),
  ...(geminiKey ? [
    { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
    { provider: 'gemini', model: 'gemini-3.6-flash' },
    { provider: 'gemini', model: 'gemini-3.5-flash-lite' }
  ] : [])
];

const disabledModels = new Set();
let poolCursor = 0;

async function callGroqModel(batch, model) {
  const userPayload = batch.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    ingredients_raw: item.ingredients_raw
  }));

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + groqKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Groq(${model}) HTTP ${res.status}: ${errText.slice(0, 150)}`);
    err.status = res.status;
    err.raw = errText;
    throw err;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty Groq(${model}) completion`);
  return parseAiResponse(content);
}

async function callGeminiModel(batch, model) {
  const userPayload = batch.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    ingredients_raw: item.ingredients_raw
  }));

  const prompt = `${SYSTEM_PROMPT}\n\nВХОДНЫЕ ДАННЫЕ:\n${JSON.stringify(userPayload, null, 2)}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini(${model}) HTTP ${res.status}: ${errText.slice(0, 150)}`);
    err.status = res.status;
    err.raw = errText;
    throw err;
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error(`Empty Gemini(${model}) completion`);
  return parseAiResponse(content);
}

async function callAiWithFallback(batch, maxCycles = 3) {
  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    let poolToTry = MODEL_POOL.filter(m => !disabledModels.has(m.model));
    if (poolToTry.length === 0) {
      disabledModels.clear();
      poolToTry = [...MODEL_POOL];
    }

    for (let i = 0; i < poolToTry.length; i++) {
      const idx = (poolCursor + i) % poolToTry.length;
      const entry = poolToTry[idx];
      try {
        const result = entry.provider === 'groq'
          ? await callGroqModel(batch, entry.model)
          : await callGeminiModel(batch, entry.model);
        poolCursor = (idx + 1) % poolToTry.length;
        return result;
      } catch (err) {
        const raw = err.raw || err.message || '';
        if (/free_tier_requests|limit:\s*500|per day/i.test(raw)) {
          console.warn(`⚠️ [Model Disabled] ${entry.model} hit daily quota limit. Removing from active pool.`);
          disabledModels.add(entry.model);
          continue;
        }
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    console.warn(`[AI Pool cycle ${cycle}/${maxCycles} busy]. Waiting ${cycle * 5}s for token buckets to refill...`);
    if (cycle === maxCycles) throw new Error('All AI models in pool failed after retries');
    await new Promise(r => setTimeout(r, cycle * 5000));
  }
}

function needsAiCleaning(desc, ing) {
  const d = (desc || '').trim();
  const i = (ing || '').trim();
  if (!d && !i) return false;

  const dLower = d.toLowerCase();
  const iLower = i.toLowerCase();

  // 1. Description contains composition or manufacturer/storage/phone clutter
  const descHasComposition = /(?:состав[:\s]|құрамы|құрамында|ингредиент|компонент)/i.test(d);
  const descHasClutter = /(?:изготовитель|производитель|өндіруші|хранить при|гост|ту\s+\d|горячая линия|адрес производства|телефон)/i.test(d);

  // 2. Ingredients contains marketing / recipe / usage instructions / manufacturer / storage / clutter
  const ingHasMarketing = /(?:идеально|прекрасно|отлично|попробуйте|уникальн|подарит|порадует|рекомендуется|наш продукт|способ применения|изготовитель|производитель|өндіруші|хранить при|срок годности|горячая линия|адрес производства|телефон)/i.test(i);

  // 2b. Ingredients has embedded composition header (marketing/desc comes before "состав:")
  const ingHasEmbeddedComposition = /(?:.+)\s+(?:состав|құрамы|ингредиенты)[:\s]/i.test(i);

  // 3. Overlap check (description and ingredients repeating each other)
  let overlaps = false;
  if (d && i) {
    if (dLower === iLower) {
      overlaps = true;
    } else {
      const cleanD = dLower.replace(/[^a-яa-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
      const cleanI = iLower.replace(/[^a-яa-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim();

      const iWords = cleanI.split(' ').filter(w => w.length > 3).slice(0, 3);
      if (iWords.length >= 2 && cleanD.includes(iWords.join(' '))) {
        overlaps = true;
      }
      const dWords = cleanD.split(' ').filter(w => w.length > 3).slice(0, 3);
      if (dWords.length >= 2 && cleanI.includes(dWords.join(' '))) {
        overlaps = true;
      }
    }
  }

  // 4. Description has composition while ingredients is missing
  const descOnlyWithSostav = Boolean(d && !i && descHasComposition);

  return descHasComposition || descHasClutter || ingHasMarketing || ingHasEmbeddedComposition || overlaps || descOnlyWithSostav;
}

function saveCheckpointAtomic(cpPath, data) {
  const payloadStr = JSON.stringify(data, null, 2);
  fs.writeFileSync(cpPath, payloadStr, 'utf8');
}

async function main() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = !isApply;
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const maxLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;
  const startAfterArg = process.argv.find(a => a.startsWith('--start-after='));
  const fromStartArg = process.argv.includes('--from-start');

  const checkpointPath = path.join(process.cwd(), 'scratch', 'desc-ing-checkpoint.json');
  console.log(`Using checkpoint path: ${checkpointPath}`);
  let lastId = '00000000-0000-0000-0000-000000000000';

  let totalScanned = 0;
  let totalProcessed = 0;
  let totalCleanVerified = 0;
  let totalChanged = 0;
  let totalErrors = 0;
  const samples = [];

  if (startAfterArg) {
    lastId = startAfterArg.split('=')[1];
    console.log(`Manual start-after ID: ${lastId}`);
  }
  if (fs.existsSync(checkpointPath)) {
    try {
      const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
      totalProcessed = cp.totalProcessed || 0;
      totalCleanVerified = cp.totalCleanVerified || 0;
      totalChanged = cp.totalChanged || 0;
      if (!fromStartArg && !startAfterArg && cp.lastId && !cp.lastId.startsWith('ffff')) {
        lastId = cp.lastId;
        totalScanned = cp.totalScanned || 0;
        console.log(`Auto-resuming from checkpoint lastId: ${lastId} (processed: ${totalProcessed}, clean: ${totalCleanVerified}, changed: ${totalChanged})`);
      } else {
        console.log(`Starting new pass from ${lastId} (preserving cumulative stats: processed=${totalProcessed}, clean=${totalCleanVerified}, changed=${totalChanged})`);
      }
    } catch {}
  }

  console.log(`\n======================================================`);
  console.log(`🧠 CATALOG PHASE 2 — DESCRIPTION & INGREDIENTS AI SEPARATION`);
  console.log(`Mode:  ${isDryRun ? '🧪 DRY RUN (no DB writes)' : '🚀 LIVE APPLY (writing to Supabase)'}`);
  if (maxLimit > 0) console.log(`Limit: Process next ${maxLimit} items only`);
  console.log(`Pool:  6-Model Round-Robin (Groq 120B/27B/20B + Gemini 3.1/3.6/3.5 Flash)`);
  console.log(`======================================================\n`);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const logPath = path.join(__dirname, '..', 'scratch', `desc-ing-log-${dateStr}.jsonl`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });

  const sessionProcessedStart = totalProcessed;

  const FETCH_PAGE_SIZE = 30;
  const AI_BATCH_SIZE = 3;
  let currentPageSize = FETCH_PAGE_SIZE;

  while (true) {
    const sessionProcessed = totalProcessed - sessionProcessedStart;
    if (maxLimit > 0 && sessionProcessed >= maxLimit) break;
    const fetchLimit = maxLimit > 0 ? Math.min(currentPageSize, maxLimit - sessionProcessed) : currentPageSize;
    if (fetchLimit <= 0) break;

    // Fetch active products using indexed primary key pagination
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, name, description, ingredients_raw, manufacturer, specs_json')
      .eq('is_active', true)
      .gt('id', lastId)
      .order('id')
      .limit(fetchLimit);

    if (error) {
      console.error(`DB Fetch error at lastId ${lastId} (limit=${fetchLimit}):`, error.message);
      totalErrors++;
      currentPageSize = Math.max(5, Math.floor(currentPageSize / 2));
      await new Promise(r => setTimeout(r, 4000));
      continue;
    }
    currentPageSize = FETCH_PAGE_SIZE;

    if (!data || data.length === 0) {
      break;
    }

    const pageLastId = data[data.length - 1].id;
    totalScanned += data.length;

    // Filter candidates that need separation / inspection vs already clean
    const candidates = [];
    const cleanToMark = [];

    for (const item of data) {
      const specs = item.specs_json || {};
      if (specs.desc_ing_normalized === true) continue;

      const d = item.description?.trim();
      const i = item.ingredients_raw?.trim();

      if (!d && !i) {
        cleanToMark.push(item);
        continue;
      }

      if (needsAiCleaning(d, i)) {
        candidates.push(item);
      } else {
        cleanToMark.push(item);
      }
    }

    // Mark verified clean items directly in Supabase (0 tokens spent!)
    if (isApply && cleanToMark.length > 0) {
      const CONCURRENCY = 4;
      for (let c = 0; c < cleanToMark.length; c += CONCURRENCY) {
        const subChunk = cleanToMark.slice(c, c + CONCURRENCY);
        await Promise.all(subChunk.map(async (item) => {
          const rawIng = item.ingredients_raw?.trim() || null;
          let cleanIng = rawIng;
          if (cleanIng) {
            cleanIng = cleanIng.replace(/^(?:состав(?:\s+продукта)?|құрамы|құрамында|ингредиенты)\s*[:—–-]?\s*/i, '').trim();
            if (!cleanIng) cleanIng = null;
          }
          const ingChanged = cleanIng !== rawIng;

          const newSpecs = {
            ...(item.specs_json || {}),
            desc_ing_normalized: true,
            desc_ing_clean_verified: true,
            desc_ing_normalized_at: new Date().toISOString()
          };
          const updatePayload = { specs_json: newSpecs };
          if (ingChanged) {
            updatePayload.ingredients_raw = cleanIng;
            totalChanged++;
          }
          const { error: updErr } = await sb
            .from('global_products')
            .update(updatePayload)
            .eq('id', item.id);
          if (updErr) {
            console.error(`DB Update error on clean item ${item.id}:`, updErr.message);
            totalErrors++;
          } else {
            totalCleanVerified++;
          }
        }));
        await new Promise(r => setTimeout(r, 100));
      }
    }

    console.log(`[Batch] Scanned: ${totalScanned} | Clean marked: ${cleanToMark.length} (total clean: ${totalCleanVerified}) | AI to process: ${candidates.length}`);

    if (candidates.length === 0) {
      lastId = pageLastId;
      if (isApply) {
        saveCheckpointAtomic(checkpointPath, {
          lastId,
          totalScanned,
          totalProcessed,
          totalCleanVerified,
          totalChanged,
          totalErrors,
          updatedAt: new Date().toISOString()
        });
      }
      continue;
    }

    // Process candidates in chunks of AI_BATCH_SIZE
    for (let b = 0; b < candidates.length; b += AI_BATCH_SIZE) {
      if (maxLimit > 0 && (totalProcessed - sessionProcessedStart) >= maxLimit) break;

      const chunk = candidates.slice(b, b + AI_BATCH_SIZE);
      let aiResults;

      try {
        aiResults = await callAiWithFallback(chunk);
      } catch (aiErr) {
        console.error(`Failed AI call for batch starting at ${chunk[0].id}:`, aiErr.message);
        totalErrors += chunk.length;
        continue;
      }

      const resultMap = new Map();
      for (const res of aiResults) {
        if (res?.id) resultMap.set(res.id, res);
      }

      const updatesToApply = [];

      for (const original of chunk) {
        totalProcessed++;
        const cleaned = resultMap.get(original.id);
        if (!cleaned) continue;

        const newDesc = cleaned.description ? cleaned.description.trim() : null;
        let newIng = cleaned.ingredients_raw ? cleaned.ingredients_raw.trim() : null;
        // Safety guard: if original had real food ingredients but AI returned null/empty, retain original
        if (!newIng && original.ingredients_raw) {
          const origIngLower = original.ingredients_raw.toLowerCase();
          const hasFoodTokens = /(?:мука|сахар|соль|масло|вода|молоко|е\d{3}|e\d{3}|экстракт|консервант|ароматизатор|какао|дрожжи)/i.test(origIngLower);
          if (hasFoodTokens) {
            console.warn(`[SAFETY] AI returned empty ingredients for ${original.ean}, but original had food tokens. Retaining original.`);
            newIng = original.ingredients_raw.replace(/^(?:состав(?:\s+продукта)?|құрамы|құрамында|ингредиенты)\s*[:—–-]?\s*/i, '').trim();
          }
        }
        const newMfr = cleaned.manufacturer ? cleaned.manufacturer.trim() : null;

        const descChanged = newDesc !== (original.description || null);
        const ingChanged = newIng !== (original.ingredients_raw || null);
        const mfrCanAdd = newMfr && !original.manufacturer;

        if (descChanged || ingChanged || mfrCanAdd) {
          totalChanged++;

          const newSpecs = {
            ...(original.specs_json || {}),
            desc_ing_normalized: true,
            desc_ing_normalized_at: new Date().toISOString()
          };

          const updatePayload = {
            id: original.id,
            ean: original.ean,
            description: newDesc,
            ingredients_raw: newIng,
            specs_json: newSpecs,
            ...(mfrCanAdd ? { manufacturer: newMfr } : {})
          };

          updatesToApply.push(updatePayload);

          if (samples.length < 25) {
            samples.push({
              ean: original.ean,
              name: original.name,
              oldDesc: original.description?.slice(0, 100),
              newDesc: newDesc?.slice(0, 100),
              oldIng: original.ingredients_raw?.slice(0, 100),
              newIng: newIng?.slice(0, 100),
              mfr: newMfr
            });
          }

          logStream.write(JSON.stringify({
            timestamp: new Date().toISOString(),
            status: isDryRun ? 'dry_run' : 'applied',
            id: original.id,
            ean: original.ean,
            name: original.name,
            before: { desc: original.description, ing: original.ingredients_raw, mfr: original.manufacturer },
            after: { desc: newDesc, ing: newIng, mfr: newMfr }
          }) + '\n');
        } else {
          // No changes needed, mark as checked
          if (isApply) {
            const newSpecs = {
              ...(original.specs_json || {}),
              desc_ing_normalized: true,
              desc_ing_normalized_at: new Date().toISOString()
            };
            updatesToApply.push({
              id: original.id,
              specs_json: newSpecs
            });
          }
        }
      }

      // Apply batch updates to Supabase
      if (isApply && updatesToApply.length > 0) {
        const CONCURRENCY = 4;
        for (let c = 0; c < updatesToApply.length; c += CONCURRENCY) {
          const subChunk = updatesToApply.slice(c, c + CONCURRENCY);
          await Promise.all(subChunk.map(async (item) => {
            const payload = { ...item };
            const itemId = payload.id;
            delete payload.id;
            delete payload.ean;

            const { error: updErr } = await sb
              .from('global_products')
              .update(payload)
              .eq('id', itemId);

            if (updErr) {
              console.error(`DB Update error on ${itemId}:`, updErr.message);
              totalErrors++;
            }
          }));
          await new Promise(r => setTimeout(r, 150));
        }
      }

      // Pacing between round-robin AI calls
      await new Promise(r => setTimeout(r, 800));
    }

    lastId = pageLastId;
    if (isApply) {
      saveCheckpointAtomic(checkpointPath, {
        lastId,
        totalScanned,
        totalProcessed,
        totalCleanVerified,
        totalChanged,
        totalErrors,
        updatedAt: new Date().toISOString()
      });
      console.log(`💾 [Checkpoint saved] lastId: ${lastId} | AI: ${totalProcessed} | Clean: ${totalCleanVerified} | Changed: ${totalChanged}`);
    }

    console.log(`[Progress] Scanned: ${totalScanned} | AI Evaluated: ${totalProcessed} | Clean Verified: ${totalCleanVerified} | Normalized: ${totalChanged} | Errors: ${totalErrors}`);

    if (maxLimit > 0 && (totalProcessed - sessionProcessedStart) >= maxLimit) {
      break;
    }
  }

  logStream.end();

  console.log(`\n======================================================`);
  console.log(`📊 PHASE 2 SUMMARY (${isDryRun ? 'DRY RUN' : 'APPLIED'})`);
  console.log(`======================================================`);
  console.log(`Total active scanned:     ${totalScanned}`);
  console.log(`Clean verified (0 tokens):${totalCleanVerified}`);
  console.log(`AI evaluated candidates:  ${totalProcessed}`);
  console.log(`Normalized & improved:    ${totalChanged} (${Math.round((totalChanged / (totalProcessed || 1)) * 100)}%)`);
  console.log(`DB/AI Errors:             ${totalErrors}`);
  console.log(`Detailed audit log:       ${logPath}`);

  console.log(`\n📝 EXAMPLES OF NORMALIZED PRODUCTS (${samples.length}):\n`);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    console.log(`[${i + 1}] EAN: ${s.ean} - ${s.name}`);
    console.log(`   BEFORE DESC: "${s.oldDesc || 'null'}"`);
    console.log(`   AFTER  DESC: "${s.newDesc || 'null'}"`);
    console.log(`   BEFORE ING:  "${s.oldIng || 'null'}"`);
    console.log(`   AFTER  ING:  "${s.newIng || 'null'}"`);
    if (s.mfr) console.log(`   MANUFACTURER: "${s.mfr}"`);
    console.log('');
  }
}

main().catch(err => {
  console.error('Fatal error in Phase 2:', err);
  process.exit(1);
});
