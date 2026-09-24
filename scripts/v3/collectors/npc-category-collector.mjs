import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env.local') });

const NPC_API_KEY = process.env.NPC_API_KEY;
const CACHE_DIR = path.join(__dirname, '..', '..', '..', 'data', 'v3_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function isValidEanChecksum(barcode) {
  if (!/^\d{8}$|^\d{12,14}$/.test(barcode)) return false;
  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  const len = digits.length;
  for (let i = len - 1; i >= 0; i--) {
    const weight = (len - 1 - i) % 2 === 0 ? 3 : 1;
    sum += digits[i] * weight;
  }
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

function isScaleBarcode(barcode) {
  return /^2[0-9]/.test(barcode);
}

function httpPostNpc(body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'nationalcatalog.kz',
      port: 443,
      path: '/gw/search/api/v1/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-API-KEY': NPC_API_KEY,
      },
      timeout: 10000,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on('error', () => resolve({ status: 500, body: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 408, body: null }); });
    req.write(data);
    req.end();
  });
}

const NPC_QUERIES = [
  // Dairy & Cheese
  'молоко', 'кефир', 'творог', 'сметана', 'сыр', 'масло сливочное', 'йогурт', 'ряженка', 'сливки', 'айран', 'кумыс', 'шубат', 'брынза', 'сулугуни',
  'foodmaster', 'фудмастер', 'родина', 'деп', 'эмиль', 'адал', 'амиран', 'простоквашино', 'президент',
  // Bakery & Confectionery
  'хлеб', 'батон', 'булочки', 'лаваш', 'сухари', 'лепешка', 'круассан', 'торт', 'пирожное',
  'шоколад', 'конфеты', 'печенье', 'вафли', 'пряники', 'зефир', 'мармелад', 'халва', 'карамель', 'пастила',
  'рахат', 'баян сулу', 'аксай нан', 'цесна', 'alpen gold', 'milka', 'snickers', 'twix', 'kinder', 'ferrero',
  // Meat & Deli & Fish
  'колбаса', 'сосиски', 'сардельки', 'мясо', 'фарш', 'курица', 'рыба', 'тунец', 'сельдь', 'семга', 'форель', 'крабовые палочки',
  'бижан', 'первомайские деликатесы', 'беккер', 'рубиком', 'курочка ряба', 'алатау кус', 'жаркент', 'эткон',
  // Beverages, Tea & Coffee
  'напитки', 'сок', 'вода', 'чай', 'кофе', 'лимонад', 'морс', 'компот', 'квас', 'минеральная вода',
  'tassay', 'сарыагаш', 'dada', 'gracio', 'пиала', 'рахат чай', 'шах', 'tess', 'greenfield', 'curtis', 'jacobs', 'nescafe', 'maccoffee',
  // Snacks, Nuts & Dried Fruits
  'чипсы', 'сухарики', 'орехи', 'семечки', 'сухофрукты', 'арахис', 'фисташки', 'миндаль', 'кешью', 'изюм', 'курага',
  'lays', 'хрустим', 'cheetos', 'doritos', 'яшкино',
  // Grocery, Pasta, Flour & Grains
  'макароны', 'рис', 'гречка', 'мука', 'сахар', 'соль', 'масло подсолнечное', 'овсянка', 'перловка', 'пшено', 'горох', 'фасоль',
  'султан', 'корона', 'макфа', 'барилла', 'мистраль', 'увелка', 'алтайская сказка', 'шедевр', 'золотая семечка',
  // Sauces, Spices & Canned
  'кетчуп', 'майонез', 'соус', 'горчица', 'аджика', 'томатная паста', 'приправы', 'специи', 'уксус', 'соевый соус',
  'махеевъ', 'слобода', 'calve', 'heinz', 'магги', 'gallina blanca', 'кублей', 'тушенка', 'шпроты', 'сардина', 'сайра', 'горошек', 'кукуруза', 'бондюэль', 'дядя ваня',
  // Frozen & Ready
  'пельмени', 'вареники', 'мороженое', 'тесто слоеное', 'пицца замороженная', 'наггетсы', 'котлеты',
  // Baby Food & Healthy
  'детское питание', 'пюре детское', 'каша детская', 'смесь детская', 'фрутоняня', 'агуша', 'тема', 'gerber', 'hipp', 'nestle'
];

export async function collectNpcCategories() {
  console.log('=== [NPC Category Collector] Starting National Catalog Category Harvesting ===');
  const outFile = path.join(CACHE_DIR, 'npc_category_products.json');
  let existing = {};
  if (fs.existsSync(outFile)) {
    try { existing = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch {}
  }

  const collectedMap = new Map(Object.entries(existing));
  console.log(`Initial items in NPC category cache: ${collectedMap.size}`);

  let queryIndex = 0;
  for (const query of NPC_QUERIES) {
    queryIndex++;
    process.stdout.write(`[NPC Category ${queryIndex}/${NPC_QUERIES.length}] Query "${query}"... `);
    let termAdded = 0;

    for (let page = 0; page < 6; page++) {
      const res = await httpPostNpc({ query, page, size: 50 });
      if (res.status !== 200 || !res.body?.items || res.body.items.length === 0) {
        break;
      }

      for (const item of res.body.items) {
        const rawGtin = String(item.gtin || '').trim();
        if (!rawGtin || isScaleBarcode(rawGtin) || !isValidEanChecksum(rawGtin)) continue;

        const brandAttr = (item.attributes || []).find(a => a.code === 'brand')?.valueRu || '';
        const producerAttr = (item.attributes || []).find(a => a.code === 'a4282e5d')?.valueRu || '';
        const producerBin = (item.attributes || []).find(a => a.code === 'producer_identifier')?.valueRu || '';
        const country = (item.attributes || []).find(a => a.code === 'country')?.valueRu || '';
        const tnvedObj = (item.attributes || []).find(a => a.code === 'tnved');

        if (!collectedMap.has(rawGtin)) {
          collectedMap.set(rawGtin, {
            ean: rawGtin,
            npc_id: item.id,
            name_ru: item.nameRu || item.shortNameRu || '',
            name_kk: item.nameKk || item.shortNameKk || '',
            brand: brandAttr || item.brand || '',
            producer: producerAttr,
            producer_bin: producerBin,
            country,
            tnved_code: tnvedObj?.value || '',
            tnved_name: tnvedObj?.valueRu || '',
            source: 'npc_category'
          });
          termAdded++;
        }
      }
      await sleep(100);
    }

    console.log(`added ${termAdded}. Total unique GTINs: ${collectedMap.size}`);
    if (queryIndex % 5 === 0) {
      fs.writeFileSync(outFile, JSON.stringify(Object.fromEntries(collectedMap), null, 2), 'utf8');
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(Object.fromEntries(collectedMap), null, 2), 'utf8');
  console.log(`=== [NPC Category Collector] Complete! Total unique GTINs: ${collectedMap.size} saved to ${outFile} ===\n`);
  return collectedMap;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  collectNpcCategories().catch(console.error);
}
