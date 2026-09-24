import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, '..', '..', '..', 'data', 'v3_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const CONSUMER_NAME = 'arbuz-kz.web.mobile';
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj';
const API_BASE = 'https://arbuz.kz/api/v1';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function stripHtml(html) {
  if (!html) return null;
  return html
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<\/p>/gi, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&quot;/g, '"')
    .replace(/,(\s*,)+/g, ',')
    .replace(/^\s*,\s*/, '')
    .trim() || null;
}

function parseNutrition(n) {
  if (!n || typeof n !== 'object') return {};
  const kcal = n.kcal ? parseFloat(String(n.kcal).replace(',', '.')) : null;
  const protein = n.protein ? parseFloat(String(n.protein).replace(',', '.')) : null;
  const fat = n.fats ? parseFloat(String(n.fats).replace(',', '.')) : null;
  const carbs = n.carbs ? parseFloat(String(n.carbs).replace(',', '.')) : null;

  const res = {};
  if (kcal != null && !isNaN(kcal)) res.energy_kcal = kcal;
  if (protein != null && !isNaN(protein)) res.protein_100g = protein;
  if (fat != null && !isNaN(fat)) res.fat_100g = fat;
  if (carbs != null && !isNaN(carbs)) res.carbohydrates_100g = carbs;
  return res;
}

function httpReq(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(API_BASE + path, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers
      },
      timeout: 15000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getArbuzToken() {
  const res = await httpReq('POST', '/auth/token', {}, { consumer: CONSUMER_NAME, key: CONSUMER_KEY });
  if (res.status !== 200 || !res.body?.data?.token) {
    throw new Error(`Arbuz auth failed: status ${res.status}`);
  }
  return res.body.data.token;
}

const SEARCH_TERMS = [
  // Dairy & eggs
  'молоко', 'кефир', 'творог', 'сметана', 'сыр', 'масло сливочное', 'йогурт', 'ряженка', 'сливки', 'яйца', 'айран',
  // Bakery & Bread
  'хлеб', 'батон', 'булочки', 'лаваш', 'сухари', 'баранки', 'лепешка',
  // Sweets & Confectionery
  'шоколад', 'конфеты', 'печенье', 'вафли', 'пряники', 'зефир', 'мармелад', 'халва', 'пастила', 'торт', 'пирожное',
  // Meat & Deli & Fish
  'колбаса', 'сосиски', 'сардельки', 'мясо', 'фарш', 'курица', 'индейка', 'рыба', 'сельдь', 'тунец', 'икра',
  // Beverages, Tea, Coffee
  'напитки', 'сок', 'вода', 'чай', 'кофе', 'морс', 'компот', 'лимонад',
  // Snacks
  'чипсы', 'сухарики', 'орехи', 'семечки', 'сухофрукты', 'батончик',
  // Grocery & Grains & Sauces
  'макароны', 'рис', 'гречка', 'овсянка', 'мука', 'сахар', 'соль', 'масло подсолнечное', 'масло оливковое',
  'кетчуп', 'майонез', 'соус', 'горчица', 'аджика', 'томатная паста', 'приправы', 'специи',
  // Frozen & Ready meals
  'пельмени', 'вареники', 'мороженое', 'заморозка', 'наггетсы',
  // Baby food & Healthy
  'детское питание', 'пюре', 'каша детская', 'смесь',
  // Canned goods
  'консервы', 'горошек', 'кукуруза', 'фасоль', 'оливки', 'шпроты'
];

export async function collectArbuzCatalog() {
  console.log('=== [Arbuz Collector] Starting Arbuz.kz Ingestion ===');
  const outFile = path.join(CACHE_DIR, 'arbuz_products.json');
  let collected = {};
  if (fs.existsSync(outFile)) {
    try { collected = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch {}
  }

  const collectedMap = new Map(Object.entries(collected));
  console.log(`Initial items in Arbuz cache: ${collectedMap.size}`);

  let token = await getArbuzToken();
  console.log('Arbuz API token obtained successfully.');

  let termIndex = 0;
  for (const term of SEARCH_TERMS) {
    termIndex++;
    process.stdout.write(`[Arbuz ${termIndex}/${SEARCH_TERMS.length}] Querying "${term}"... `);

    try {
      const qs = `/shop/search/products?where[name][c]=${encodeURIComponent(term)}&limit=100`;
      let res = await httpReq('GET', qs, { 'Authorization': `Bearer ${token}` });

      if (res.status === 401) {
        token = await getArbuzToken();
        res = await httpReq('GET', qs, { 'Authorization': `Bearer ${token}` });
      }

      if (res.status === 200 && res.body?.data) {
        const items = Array.isArray(res.body.data) ? res.body.data : (res.body.data.items || []);
        let newCount = 0;
        for (const it of items) {
          if (!it.id || !it.name) continue;
          const id = String(it.id);

          const composition = stripHtml(it.ingredients);
          const nutrition = parseNutrition(it.nutrition);
          const storage = stripHtml(it.storageConditions);
          const info = stripHtml(it.information);
          const img = it.image ? it.image.replace(/w=%w&h=%h/, 'w=600&h=600') : null;

          collectedMap.set(id, {
            id,
            name: it.name,
            brand: it.brandName || null,
            catalog_name: it.catalogName || null,
            barcode: it.barcode || null,
            price: it.priceActual || null,
            ingredients_raw: composition,
            nutriments_json: nutrition,
            storage_conditions: storage,
            description: info,
            image_url: img,
            country: it.producerCountry || null,
            producer: it.producerName || null,
            source: 'arbuz'
          });
          newCount++;
        }
        console.log(`got ${items.length} items (${newCount} new/updated). Total in cache: ${collectedMap.size}`);
      } else {
        console.log(`status ${res.status}`);
      }
      await sleep(350);
    } catch (err) {
      console.log(`Error: ${err.message}`);
      await sleep(1500);
    }

    if (termIndex % 10 === 0 || termIndex === SEARCH_TERMS.length) {
      fs.writeFileSync(outFile, JSON.stringify(Object.fromEntries(collectedMap), null, 2), 'utf8');
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(Object.fromEntries(collectedMap), null, 2), 'utf8');
  console.log(`=== [Arbuz Collector] Complete! Total items: ${collectedMap.size} saved to ${outFile} ===\n`);
  return collectedMap;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  collectArbuzCatalog().catch(console.error);
}
