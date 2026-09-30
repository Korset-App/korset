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
const deepseekKey = (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || '').replace(/['"]/g, '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}
if (!deepseekKey) {
  console.error('Missing DeepSeek/OpenAI API key in .env.local');
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

Верни строго JSON массив объектов:
[
  {
    "id": "uuid товара",
    "description": "очищенное описание или null",
    "ingredients_raw": "очищенный состав или null",
    "manufacturer": "выделенный изготовитель или null"
  }
]`;

async function callDeepSeekWithRetry(batch, maxRetries = 3) {
  const userPayload = batch.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    ingredients_raw: item.ingredients_raw
  }));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + deepseekKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(userPayload, null, 2) }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 8192
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 402 || /insufficient balance/i.test(errText)) {
          const err = new Error(`BALANCE_DEPLETED: ${errText.slice(0, 150)}`);
          err.code = 'BALANCE_DEPLETED';
          throw err;
        }
        throw new Error(`DeepSeek HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty DeepSeek completion');

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (jsonErr) {
        // Try trimming markdown code blocks if any
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
        // Map keyed dictionary { "id": { ... } } or { "0": { ... } }
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
    } catch (err) {
      console.warn(`[DeepSeek attempt ${attempt}/${maxRetries} failed]: ${err.message}. Waiting ${attempt * 3}s...`);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, attempt * 3000));
    }
  }
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
  let totalChanged = 0;
  let totalErrors = 0;
  const samples = [];

  if (startAfterArg) {
    lastId = startAfterArg.split('=')[1];
    console.log(`Manual start-after ID: ${lastId}`);
  } else if (!fromStartArg && fs.existsSync(checkpointPath)) {
    try {
      const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
      if (cp.lastId) {
        lastId = cp.lastId;
        totalScanned = cp.totalScanned || 0;
        totalProcessed = cp.totalProcessed || 0;
        totalChanged = cp.totalChanged || 0;
        totalErrors = cp.totalErrors || 0;
        console.log(`Auto-resuming from checkpoint lastId: ${lastId} (processed: ${totalProcessed}, changed: ${totalChanged})`);
      }
    } catch {}
  }

  console.log(`\n======================================================`);
  console.log(`🧠 CATALOG PHASE 2 — DESCRIPTION & INGREDIENTS AI SEPARATION`);
  console.log(`Mode:  ${isDryRun ? '🧪 DRY RUN (no DB writes)' : '🚀 LIVE APPLY (writing to Supabase)'}`);
  if (maxLimit > 0) console.log(`Limit: Process next ${maxLimit} items only`);
  console.log(`Model: DeepSeek V3 (deepseek-chat)`);
  console.log(`======================================================\n`);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const logPath = path.join(__dirname, '..', 'scratch', `desc-ing-log-${dateStr}.jsonl`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });

  const sessionProcessedStart = totalProcessed;

  const FETCH_PAGE_SIZE = 100;
  const AI_BATCH_SIZE = 8;

  while (true) {
    const sessionProcessed = totalProcessed - sessionProcessedStart;
    if (maxLimit > 0 && sessionProcessed >= maxLimit) break;
    const fetchLimit = maxLimit > 0 ? Math.min(FETCH_PAGE_SIZE, maxLimit - sessionProcessed) : FETCH_PAGE_SIZE;
    if (fetchLimit <= 0) break;

    // Fetch active candidates
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, name, description, ingredients_raw, manufacturer, specs_json')
      .eq('is_active', true)
      .gt('id', lastId)
      .order('id')
      .limit(fetchLimit);

    if (error) {
      console.error(`DB Fetch error at lastId ${lastId}:`, error.message);
      totalErrors++;
      await new Promise(r => setTimeout(r, 4000));
      continue;
    }

    if (!data || data.length === 0) {
      break;
    }

    lastId = data[data.length - 1].id;
    totalScanned += data.length;

    // Filter candidates that need separation / inspection
    const candidates = [];
    for (const item of data) {
      const specs = item.specs_json || {};
      if (specs.desc_ing_normalized === true) continue;

      const d = item.description?.trim();
      const i = item.ingredients_raw?.trim();

      // Candidate if:
      // 1) Both fields exist
      // 2) Or description contains composition ("состав" / "құрамы") while ingredients_raw is null
      // 3) Or ingredients_raw contains marketing phrases
      const bothExist = Boolean(d && i);
      const descHasSostav = Boolean(d && /(?:состав|құрамы|құрамында|ингредиенты)/i.test(d));
      const ingHasMarketing = Boolean(i && /(?:идеально|прекрасн|отличн|попробуйте|уникальн|натуральн[а-я\s]+продукт|традиционн|мы сделали|способ применения|изготовитель|произведено)/i.test(i));

      if (bothExist || descHasSostav || ingHasMarketing) {
        candidates.push(item);
      }
    }

    if (candidates.length === 0) {
      continue;
    }

    // Process candidates in chunks of AI_BATCH_SIZE
    for (let b = 0; b < candidates.length; b += AI_BATCH_SIZE) {
      if (maxLimit > 0 && (totalProcessed - sessionProcessedStart) >= maxLimit) break;

      const chunk = candidates.slice(b, b + AI_BATCH_SIZE);
      let aiResults;

      try {
        aiResults = await callDeepSeekWithRetry(chunk);
      } catch (aiErr) {
        if (aiErr.code === 'BALANCE_DEPLETED' || aiErr.message?.includes('BALANCE_DEPLETED')) {
          console.error(`\n🛑 [STOP] DeepSeek API balance exhausted. Checkpoint preserved at lastId: ${lastId}.`);
          console.error(`Scanned: ${totalScanned} | Evaluated: ${totalProcessed} | Normalized: ${totalChanged}`);
          console.error(`To resume after topping up: node scripts/clean-desc-ingredients-ai.mjs --apply\n`);
          if (isApply) {
            fs.writeFileSync(checkpointPath, JSON.stringify({
              lastId,
              totalScanned,
              totalProcessed,
              totalChanged,
              totalErrors,
              updatedAt: new Date().toISOString()
            }, null, 2));
          }
          process.exit(0);
        }
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
        const newIng = cleaned.ingredients_raw ? cleaned.ingredients_raw.trim() : null;
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

      // Update checkpoint
      if (isApply) {
        const payloadStr = JSON.stringify({
          lastId,
          totalScanned,
          totalProcessed,
          totalChanged,
          totalErrors,
          updatedAt: new Date().toISOString()
        }, null, 2);
        console.log(`Writing to: "${checkpointPath}"`);
        fs.writeFileSync(checkpointPath, payloadStr, 'utf8');
        const readBack = fs.readFileSync(checkpointPath, 'utf8');
        console.log(`Readback verify (len=${readBack.length}):`, readBack.slice(0, 60));
        console.log(`💾 [Checkpoint saved] lastId: ${lastId} | Processed: ${totalProcessed} | Changed: ${totalChanged}`);
      }

      console.log(`[Progress] Scanned: ${totalScanned} | Evaluated: ${totalProcessed} | Normalized: ${totalChanged} | Errors: ${totalErrors}`);
    }

    if (maxLimit > 0 && (totalProcessed - sessionProcessedStart) >= maxLimit) {
      break;
    }
  }

  logStream.end();

  console.log(`\n======================================================`);
  console.log(`📊 PHASE 2 SUMMARY (${isDryRun ? 'DRY RUN' : 'APPLIED'})`);
  console.log(`======================================================`);
  console.log(`Total active scanned:     ${totalScanned}`);
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
