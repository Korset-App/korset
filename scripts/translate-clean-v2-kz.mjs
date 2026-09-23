import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required env variables (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpPost(urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) },
      timeout: 30000,
    }, res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function translateBatch(items) {
  const lines = items.map((it, i) => `[${i + 1}] ${it.name}`).join('\n');

  const prompt = `Translate these grocery food/drink product names from Russian to natural Kazakh for store shelf tags. Rules:
- Keep international and local brand names UNCHANGED (e.g. Nutella, Coca-Cola, Lay's, Ritter Sport, Рахат, Баян Сулу, Кублей, RG Brands, Цесна, Султан, etc.)
- Keep weight, volume, and numeric specifications as-is (e.g. 500 г, 1 л, 350 мл, 2.5%, 15%, etc.)
- Keep well-established culinary loanwords natural and recognizable (e.g. майонез, кетчуп, кофе, какао, батончик, чипсы, йогурт, круассан, шоколад, соус, паста). Do NOT invent artificial or awkward calques.
- Use standard authentic Kazakh food terminology with proper Kazakh letters (ә, ө, ұ, ү, і, ғ, қ, ң, һ):
  * Молоко → сүт, сметана → қаймақ, творог → сүзбе, сыр → ірімшік, масло сливочное → сары май, кефир → айран
  * Хлеб → нан, вода → су, сок → шырын, чай → шай (қара шай, жасыл шай)
  * Мука → ұн (бидай ұны), крупа гречневая → қарақұмық, рис → күріш, макароны → макарон, соль → тұз, сахар → қант
  * Масло растительное / подсолнечное → күнбағыс майы, оливковое → зәйтүн майы
  * Печенье → печенье / піспенан, конфеты → кәмпит
- Keep it natural, concise, like an official supermarket price tag.
- Use Sentence case (capitalize first letter only). Do NOT use ALL CAPS.
- Reply ONLY with translated lines in the format "[number] Translated name", no other text.

${lines}`;

  const baseUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
  const fetchUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const model = baseUrl.includes('deepseek') ? 'deepseek-chat' : 'gpt-4o-mini';

  const headers = {
    'Authorization': 'Bearer ' + OPENAI_KEY,
    'Content-Type': 'application/json',
  };

  const r = await httpPost(fetchUrl, headers, {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2500,
  });

  if (r.status !== 200) {
    throw new Error(`OpenAI HTTP ${r.status}: ${r.body.substring(0, 200)}`);
  }

  const resp = JSON.parse(r.body);
  const text = resp.choices[0].message.content.trim();

  const results = [];
  const re = /^\[(\d+)\]\s*(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const idx = parseInt(m[1], 10) - 1;
    if (idx >= 0 && idx < items.length) {
      results.push({ id: items[idx].id, name_kz: m[2].trim() });
    }
  }
  return results;
}

async function run() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;
  const BATCH_SIZE = 30;

  console.log('=== KAZAKH TRANSLATION PIPELINE FOR CLEAN_PRODUCTS_V2 ===');
  console.log(`Limit: ${limit || 'unlimited'}, Batch size: ${BATCH_SIZE}`);

  let totalTranslated = 0;

  while (true) {
    if (limit > 0 && totalTranslated >= limit) {
      console.log(`Reached requested limit of ${limit}.`);
      break;
    }

    const fetchLimit = limit > 0 ? Math.min(BATCH_SIZE, limit - totalTranslated) : BATCH_SIZE;

    const { data: prods, error } = await supabase
      .from('clean_products_v2')
      .select('id, name')
      .is('name_kz', null)
      .limit(fetchLimit);

    if (error) {
      console.error('Supabase query error:', error.message);
      break;
    }

    if (!prods || prods.length === 0) {
      console.log('All products in clean_products_v2 have name_kz populated! Done.');
      break;
    }

    try {
      const translated = await translateBatch(prods);

      if (translated.length > 0) {
        await Promise.all(
          translated.map(t =>
            supabase
              .from('clean_products_v2')
              .update({ name_kz: t.name_kz })
              .eq('id', t.id)
          )
        );
      }

      totalTranslated += translated.length;
      console.log(`[PROGRESS] Translated + updated ${translated.length} items (Total: ${totalTranslated}).`);
      if (translated.length > 0) {
        console.log(`   Sample: "${prods[0].name}" → "${translated[0].name_kz}"`);
      }

      await sleep(400); // Polite rate limit
    } catch (e) {
      console.error('Translation error:', e.message);
      await sleep(3000);
    }
  }

  console.log(`\n=== COMPLETED: Translated ${totalTranslated} products to Kazakh! ===`);
}

run();
