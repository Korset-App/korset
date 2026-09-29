import fs from 'fs';
import path from 'path';
import https from 'https';
import zlib from 'zlib';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { OFF_ALLERGEN_MAP } from '../src/constants/allergens.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const S3_DUMP_URL = 'https://openfoodfacts-ds.s3.eu-west-3.amazonaws.com/en.openfoodfacts.org.products.csv.gz';
const OUTPUT_MATCHES_PATH = path.join(__dirname, '..', 'scratch', 'all-off-matches.jsonl');
const TARGETS_CACHE_PATH = path.join(__dirname, '..', 'scratch', 'all-58k-targets.json');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

function isValidKbju(cal, prot, fat, carb) {
  if (cal == null || prot == null || fat == null || carb == null) return false;
  const p = Number(prot);
  const f = Number(fat);
  const c = Number(carb);
  const k = Number(cal);

  if (isNaN(p) || isNaN(f) || isNaN(c) || isNaN(k)) return false;
  if (p < 0 || f < 0 || c < 0 || k < 0) return false;
  if (p > 100 || f > 100 || c > 100) return false;
  if (p + f + c > 105) return false;
  if (k > 950) return false;

  const calc = (p * 4) + (f * 9) + (c * 4);
  if (calc > 0 && Math.abs(k - calc) > Math.max(120, calc * 0.45)) {
    return false;
  }
  return true;
}

const EXTRA_ALLERGEN_MAP = {
  ...OFF_ALLERGEN_MAP,
  'en:soy': 'soy',
  'en:tree-nuts': 'tree_nuts',
  'en:molluscs-and-products-thereof': 'mollusks',
  'en:sulphites': 'sulfites',
  'en:sesame': 'sesame'
};

function parseAllergens(str) {
  if (!str) return [];
  const parts = str.split(',').map(s => s.trim().toLowerCase());
  const res = new Set();
  for (const p of parts) {
    const canonical = EXTRA_ALLERGEN_MAP[p] || EXTRA_ALLERGEN_MAP[`en:${p}`];
    if (canonical) res.add(canonical);
  }
  return Array.from(res);
}

async function loadAllTargets() {
  if (fs.existsSync(TARGETS_CACHE_PATH)) {
    console.log(`Loading all targets from cache: ${TARGETS_CACHE_PATH}...`);
    const cached = JSON.parse(fs.readFileSync(TARGETS_CACHE_PATH, 'utf8'));
    const targets = new Map();
    for (const [k, v] of Object.entries(cached)) {
      targets.set(k, v);
    }
    console.log(`Loaded ${targets.size} barcode lookup keys from cache.`);
    return targets;
  }

  console.log('Fetching ALL 58,000+ catalog products from Supabase via primary key cursor...');
  let lastId = '00000000-0000-0000-0000-000000000000';
  const limit = 1000;
  const targets = new Map();
  let totalRows = 0;

  while (true) {
    const { data, error } = await sb.from('global_products')
      .select('id, ean, name, brand, category, image_url, is_active, nutriments_json, ingredients_raw, nutriscore, nova_group, country_of_origin, specs_json')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching targets:', error);
      break;
    }
    if (!data || data.length === 0) break;

    totalRows += data.length;
    for (const p of data) {
      lastId = p.id;
      const ean = String(p.ean).replace(/\D/g, '');
      if (ean.length < 8) continue;

      const n = p.nutriments_json;
      const cal = n?.energy_kcal ?? n?.calories ?? n?.['energy-kcal_100g'];
      const prot = n?.protein_100g ?? n?.proteins;
      const fat = n?.fat_100g ?? n?.fats;
      const carb = n?.carbohydrates_100g ?? n?.carbohydrates;
      const hasKbju = isValidKbju(cal, prot, fat, carb);

      const isFood = !['household', 'personal_care'].includes(p.category);
      const hasImage = !!(p.image_url && p.image_url.trim().length > 0);

      const targetObj = {
        id: p.id,
        db_ean: p.ean,
        ean,
        name: p.name,
        brand: p.brand,
        category: p.category,
        isFood,
        isActive: !!p.is_active,
        hasImage,
        hasKbju,
        hasIngredients: !!(p.ingredients_raw && p.ingredients_raw.trim().length > 0),
        hasNutriscore: !!p.nutriscore,
        hasNova: !!p.nova_group,
        hasOrigin: !!p.country_of_origin,
        specs_json: p.specs_json || {}
      };

      targets.set(ean, targetObj);
      if (ean.length === 12) {
        targets.set('0' + ean, targetObj);
      } else if (ean.length === 13 && ean.startsWith('0')) {
        targets.set(ean.slice(1), targetObj);
      }
    }

    if (totalRows % 10000 === 0 || data.length < limit) {
      console.log(`[Target Loader] Processed ${totalRows} database rows | ${targets.size} lookup keys`);
    }

    if (data.length < limit) break;
  }

  console.log(`\nCaching ${targets.size} targets to ${TARGETS_CACHE_PATH}...`);
  const cacheObj = {};
  for (const [k, v] of targets.entries()) {
    cacheObj[k] = v;
  }
  fs.writeFileSync(TARGETS_CACHE_PATH, JSON.stringify(cacheObj), 'utf8');

  console.log(`Total database products loaded: ${totalRows} (${targets.size} lookup keys).`);
  return targets;
}

async function streamFromS3(targets) {
  const outStream = fs.createWriteStream(OUTPUT_MATCHES_PATH, { encoding: 'utf8' });

  console.log(`\nConnecting direct HTTPS stream to Amazon S3: ${S3_DUMP_URL}`);
  console.log('Decompressing and matching on the fly (0 MB disk space used for dump)...');

  return new Promise((resolve, reject) => {
    https.get(S3_DUMP_URL, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download dump: HTTP ${res.statusCode}`));
      }

      const totalBytes = Number(res.headers['content-length'] || 0);
      let downloadedBytes = 0;
      let lastBytesLogged = Date.now();

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (Date.now() - lastBytesLogged > 10000) {
          const mb = (downloadedBytes / 1024 / 1024).toFixed(1);
          const totalMb = totalBytes ? (totalBytes / 1024 / 1024).toFixed(1) : '?';
          const pct = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : '?';
          console.log(`[S3 Wire Stream] ${mb} MB / ${totalMb} MB (${pct}%)`);
          lastBytesLogged = Date.now();
        }
      });

      const gunzip = zlib.createGunzip();
      const rl = readline.createInterface({
        input: res.pipe(gunzip),
        crlfDelay: Infinity
      });

      let totalLines = 0;
      let headerCols = null;
      let matchesCount = 0;
      let matchesArchivedFood = 0;
      let newImagesCount = 0;
      let newKbjuCount = 0;
      let newIngredientsCount = 0;
      let lastProgress = Date.now();

      rl.on('line', (line) => {
        totalLines++;
        if (!line) return;

        if (headerCols === null) {
          headerCols = line.split('\t');
          console.log(`Header parsed: ${headerCols.length} columns.`);
          return;
        }

        // Fast check on barcode in first column
        const tabIdx = line.indexOf('\t');
        if (tabIdx === -1) return;
        const rawCode = line.substring(0, tabIdx).trim();
        const cleanEan = rawCode.replace(/\D/g, '');
        if (cleanEan.length < 8) return;

        const target = targets.get(cleanEan);
        if (!target) return;

        const cols = line.split('\t');
        const getCol = (idx) => (cols[idx] ? cols[idx].trim() : '');

        const productName = getCol(10);
        const quantity = getCol(13);
        const packaging = getCol(14);
        const brands = getCol(18);
        const origins = getCol(24);
        const labelsTags = getCol(30);
        const countries = getCol(39);
        const ingredientsText = getCol(42);
        const allergensStr = getCol(45);
        const tracesStr = getCol(47);
        const nutriscoreRaw = getCol(58);
        const novaRaw = getCol(59);
        const imgFront = getCol(82) || getCol(83);
        const imgIngredients = getCol(84);
        const imgNutrition = getCol(86);
        const energyKj = getCol(88);
        let cal = getCol(89);
        const fat = getCol(92);
        const satFat = getCol(93);
        const carb = getCol(129);
        const sugars = getCol(130);
        const prot = getCol(150);
        const salt = getCol(154);

        let nutriments = null;
        const p = prot !== '' ? Number(prot) : null;
        const f = fat !== '' ? Number(fat) : null;
        const cb = carb !== '' ? Number(carb) : null;

        if (p != null && f != null && cb != null && !isNaN(p) && !isNaN(f) && !isNaN(cb)) {
          let c = cal !== '' ? Number(cal) : null;
          if ((c == null || isNaN(c) || c === 0) && energyKj !== '' && !isNaN(Number(energyKj)) && Number(energyKj) > 0) {
            c = Math.round(Number(energyKj) / 4.184);
          }
          if ((c == null || isNaN(c) || c === 0) && (p > 0 || f > 0 || cb > 0)) {
            c = Math.round((p * 4) + (f * 9) + (cb * 4));
          }

          if (c != null && isValidKbju(c, p, f, cb)) {
            nutriments = {
              energy_kcal: Math.round(c),
              protein_100g: Math.round(p * 10) / 10,
              fat_100g: Math.round(f * 10) / 10,
              carbohydrates_100g: Math.round(cb * 10) / 10
            };
            if (sugars !== '' && !isNaN(Number(sugars))) nutriments.sugars_100g = Math.round(Number(sugars) * 10) / 10;
            if (salt !== '' && !isNaN(Number(salt))) nutriments.salt_100g = Math.round(Number(salt) * 100) / 100;
            if (satFat !== '' && !isNaN(Number(satFat))) nutriments.saturated_fat_100g = Math.round(Number(satFat) * 10) / 10;
          }
        }

        const allergens = parseAllergens(allergensStr);
        const traces = parseAllergens(tracesStr);
        const nutriscore = ['a', 'b', 'c', 'd', 'e'].includes(nutriscoreRaw.toLowerCase()) ? nutriscoreRaw.toUpperCase() : null;
        const nova = [1, 2, 3, 4].includes(Number(novaRaw)) ? Number(novaRaw) : null;
        const isHalalTag = labelsTags.toLowerCase().includes('halal');

        const matchRecord = {
          product_id: target.id,
          ean: target.db_ean || cleanEan,
          dump_ean: cleanEan,
          target_name: target.name,
          target_brand: target.brand,
          target_category: target.category,
          target_is_food: target.isFood,
          target_is_active: target.isActive,
          target_has_image: target.hasImage,
          target_has_kbju: target.hasKbju,
          target_has_ingredients: target.hasIngredients,
          target_has_origin: target.hasOrigin,
          target_has_nutriscore: target.hasNutriscore,
          target_has_nova: target.hasNova,
          specs_json: target.specs_json,
          off_name: productName,
          off_brand: brands,
          quantity: quantity || null,
          packaging: packaging || null,
          origins: origins || null,
          countries: countries || null,
          is_halal_tag: isHalalTag,
          nutriments,
          ingredients_raw: ingredientsText || null,
          allergens,
          traces,
          nutriscore,
          nova_group: nova,
          image_url: imgFront || null,
          image_ingredients_url: imgIngredients || null,
          image_nutrition_url: imgNutrition || null
        };

        outStream.write(JSON.stringify(matchRecord) + '\n');
        matchesCount++;

        if (!target.isActive && target.isFood) matchesArchivedFood++;
        if (!target.hasImage && imgFront) newImagesCount++;
        if (!target.hasKbju && nutriments) newKbjuCount++;
        if (!target.hasIngredients && ingredientsText && ingredientsText.length > 10) newIngredientsCount++;

        if (Date.now() - lastProgress > 6000) {
          console.log(`[Progress] Lines: ${totalLines.toLocaleString()} | Matches: ${matchesCount} (Archived Food: ${matchesArchivedFood}) | NEW Images: ${newImagesCount} | NEW KBJU: ${newKbjuCount}`);
          lastProgress = Date.now();
        }
      });

      rl.on('close', () => {
        outStream.end();
        console.log('\n================ COMPLETE STREAM SCAN ================');
        console.log(`Total CSV lines scanned:        ${totalLines.toLocaleString()}`);
        console.log(`Total database matches:         ${matchesCount}`);
        console.log(`Archived food matches:          ${matchesArchivedFood}`);
        console.log(`Products gaining NEW image:     ${newImagesCount}`);
        console.log(`Products gaining NEW KBJU:      ${newKbjuCount}`);
        console.log(`Products gaining ingredients:   ${newIngredientsCount}`);
        console.log(`Matches saved to:               ${OUTPUT_MATCHES_PATH}`);
        console.log('======================================================\n');
        resolve({ matchesCount, matchesArchivedFood, newImagesCount, newKbjuCount });
      });

      rl.on('error', reject);
      gunzip.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const targets = await loadAllTargets();
  await streamFromS3(targets);
}

main().catch(console.error);
