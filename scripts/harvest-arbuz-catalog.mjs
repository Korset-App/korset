import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONSUMER_NAME = 'arbuz-kz.web.mobile';
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj';
const API = 'https://arbuz.kz/api/v1';
const OUT_PATH = path.join(__dirname, '..', 'data', 'arbuz_full_catalog.jsonl');
const CHECKPOINT_PATH = path.join(__dirname, '..', 'data', 'arbuz_harvest_checkpoint.json');

const FOOD_CATEGORIES = [
  { id: 225164, name: 'Овощи, фрукты, зелень' },
  { id: 225161, name: 'Молоко, сыр и яйца' },
  { id: 225606, name: 'Импортные товары' },
  { id: 225167, name: 'Колбасы и деликатесы' },
  { id: 225162, name: 'Мясо и птица' },
  { id: 225752, name: 'Рыба и морепродукты' },
  { id: 225183, name: 'Замороженные продукты' },
  { id: 14, name: 'Вода и напитки' },
  { id: 225602, name: 'Орехи, сухофрукты и снеки' },
  { id: 224645, name: 'Здоровое питание' },
  { id: 225165, name: 'Хлеб и выпечка' },
  { id: 225253, name: 'Готовая еда' },
  { id: 226099, name: 'Кофе, чай, какао' },
  { id: 225166, name: 'Кондитерские изделия' },
  { id: 225169, name: 'Бакалея' },
  { id: 19, name: 'Для детей и их родителей' }
];

let _token = null;
let _tokenExpires = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    .replace(/&deg;/g, '°')
    .replace(/&plusmn;/g, '±')
    .replace(/&mdash;/g, '—')
    .replace(/,(\s*,)+/g, ',')
    .replace(/^\s*,\s*/, '')
    .trim() || null;
}

function parseNutrition(n) {
  if (!n || typeof n !== 'object') return null;
  const parseNum = (val) => {
    if (!val) return null;
    const clean = String(val).replace(',', '.').replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };
  const kcal = parseNum(n.kcal);
  const protein = parseNum(n.protein);
  const fats = parseNum(n.fats);
  const carbs = parseNum(n.carbs);

  if (kcal === null && protein === null && fats === null && carbs === null) return null;
  return {
    energy_kcal: kcal,
    protein_100g: protein,
    fat_100g: fats,
    carbohydrates_100g: carbs
  };
}

async function getToken() {
  if (_token && Date.now() < _tokenExpires) return _token;
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ consumer: CONSUMER_NAME, key: CONSUMER_KEY });
    const req = https.request(API + '/auth/token', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          _token = j.data.token;
          _tokenExpires = Date.now() + 10 * 60 * 1000;
          resolve(_token);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Auth timeout')); });
    req.write(postData);
    req.end();
  });
}

async function fetchPage(catId, page, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = await getToken();
      const res = await new Promise((resolve, reject) => {
        const req = https.get(`${API}/shop/catalog/${catId}?page=${page}`, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
          },
          timeout: 15000
        }, r => {
          let d = '';
          r.on('data', chunk => d += chunk);
          r.on('end', () => {
            if (r.statusCode === 200) {
              try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
            } else if (r.statusCode === 401) {
              _token = null;
              reject(new Error('Unauthorized'));
            } else {
              reject(new Error(`HTTP ${r.statusCode}`));
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      });
      return res.data?.products || null;
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(1000 * attempt);
    }
  }
  return null;
}

async function main() {
  console.log('=== Starting Full Arbuz.kz Catalog Harvest ===');

  const existingIds = new Set();
  if (fs.existsSync(OUT_PATH)) {
    const lines = fs.readFileSync(OUT_PATH, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.id) existingIds.add(String(obj.id));
      } catch {}
    }
    console.log(`Loaded ${existingIds.size} already harvested products from ${OUT_PATH}`);
  }

  const outStream = fs.createWriteStream(OUT_PATH, { flags: 'a' });
  let totalSaved = existingIds.size;
  let newAdded = 0;

  for (const cat of FOOD_CATEGORIES) {
    console.log(`\nFetching Category #${cat.id}: ${cat.name}...`);
    let firstPageData;
    try {
      firstPageData = await fetchPage(cat.id, 1);
    } catch (e) {
      console.error(`  Failed to fetch page 1 for category ${cat.name}:`, e.message);
      continue;
    }

    if (!firstPageData || !firstPageData.page) {
      console.log(`  No products in category ${cat.name}`);
      continue;
    }

    const lastPage = firstPageData.page.last || 1;
    const catTotal = firstPageData.count || 0;
    console.log(`  Total items: ${catTotal}, Pages: ${lastPage}`);

    for (let p = 1; p <= lastPage; p++) {
      let pageData = (p === 1) ? firstPageData : null;
      if (!pageData) {
        try {
          pageData = await fetchPage(cat.id, p);
        } catch (e) {
          console.error(`  Error on page ${p}:`, e.message);
          continue;
        }
      }

      const products = pageData?.data || [];
      for (const prod of products) {
        const prodId = String(prod.id);
        if (existingIds.has(prodId)) continue;

        const isHalal = Array.isArray(prod.characteristics) &&
          prod.characteristics.some(c => c.name && c.name.toLowerCase().includes('халал'));

        const cleanedIngredients = stripHtml(prod.ingredients);
        const cleanedStorage = stripHtml(prod.storageConditions);
        const nutriments = parseNutrition(prod.nutrition);

        const record = {
          id: prodId,
          catalog_id: prod.catalogId,
          catalog_name: prod.catalogName,
          name: prod.name,
          brand: prod.brandName || null,
          producer_country: prod.producerCountry || null,
          ingredients_raw: cleanedIngredients,
          storage_conditions: cleanedStorage,
          nutriments_json: nutriments,
          halal_status: isHalal ? 'yes' : null,
          halal_source: isHalal ? 'arbuz_characteristic' : null,
          characteristics: prod.characteristics || [],
          weight: prod.weight || null,
          measure: prod.measure || null,
          price_kzt: prod.priceActual || null,
          description: stripHtml(prod.description) || null,
          uri: prod.uri || null,
          image: prod.image || null,
          harvested_at: new Date().toISOString()
        };

        outStream.write(JSON.stringify(record) + '\n');
        existingIds.add(prodId);
        newAdded++;
        totalSaved++;
      }

      if (p % 10 === 0 || p === lastPage) {
        console.log(`  Page ${p}/${lastPage} done. Total unique saved: ${totalSaved} (+${newAdded} new)`);
        fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
          lastCategory: cat.id,
          lastPage: p,
          totalSaved,
          updatedAt: new Date().toISOString()
        }, null, 2));
      }

      await sleep(150); // Safe pacing: ~6 requests per second
    }
  }

  outStream.end();
  console.log(`\n=== Arbuz Harvest Finished! ===`);
  console.log(`Total harvested products: ${totalSaved} (Newly added: ${newAdded})`);
}

main().catch(err => {
  console.error('Fatal error during harvest:', err);
  process.exit(1);
});
