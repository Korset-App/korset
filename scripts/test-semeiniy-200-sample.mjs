import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { classifyBarcode } = require('./validate-ean.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URLS_PATH = path.join(__dirname, '..', 'data', 'semeiniy_product_urls.json');
const allUrls = JSON.parse(fs.readFileSync(URLS_PATH, 'utf8'));

// Build diverse category pools
const categoryKeywords = {
  dairy: ['moloko', 'syr', 'tvorog', 'kefir', 'maslo-slivochnoe', 'yogurt', 'smetana'],
  sweets: ['shokolad', 'konfety', 'pechene', 'vafli', 'tort', 'pirozhnoe'],
  beverages: ['sok', 'voda', 'napitok', 'limonad', 'kvas', 'mors'],
  grocery: ['krupa', 'makarony', 'muka', 'maslo-podsolnechnoe', 'sakhar', 'sol', 'khlopya'],
  meat_deli: ['kolbasa', 'sosiski', 'sardelki', 'pashtet', 'myaso'],
  tea_coffee: ['chay', 'kofe', 'kakao'],
  baby_food: ['pyure', 'kasha', 'smes', 'detskoe-pitanie'],
  household: ['poroshok', 'mylo', 'shampun', 'zubnaya-pasta', 'salfetki']
};

const selectedUrls = [];
const seen = new Set();

for (const [catName, keywords] of Object.entries(categoryKeywords)) {
  const matches = allUrls.filter(u => {
    if (seen.has(u)) return false;
    const lower = u.toLowerCase();
    return keywords.some(k => lower.includes(k));
  });

  // Pick 25 items evenly distributed across the matches
  const count = Math.min(25, matches.length);
  const step = Math.max(1, Math.floor(matches.length / count));
  for (let i = 0; i < count; i++) {
    const u = matches[i * step];
    if (u && !seen.has(u)) {
      selectedUrls.push({ url: u, targetCategory: catName });
      seen.add(u);
    }
  }
}

console.log(`Selected ${selectedUrls.length} diverse URLs across 8 distinct categories.`);

const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 12000;

async function fetchWithRetry(url, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9,kz;q=0.8,en;q=0.7'
        }
      });
      clearTimeout(timer);
      if (res.ok) return await res.text();
    } catch (e) {
      if (i === attempts) return null;
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
  return null;
}

function parseHeroGallery(html) {
  // Title
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null;

  // Product ID in Webasyst (e.g. data-product-id="117759" or id="product-form-117759")
  const idMatch = html.match(/data-product-id=["'](\d+)["']/i) || html.match(/id=["']product-form-(\d+)["']/i) || html.match(/s-product-(\d+)/i);
  const productId = idMatch ? idMatch[1] : null;

  // Barcodes in SKU
  const rawSkuStrings = [];
  const skusMatch = html.match(/skus:\s*(\{[\s\S]*?\}),\s*stock_unit_id/i) || html.match(/skus:\s*(\{[\s\S]*?\})\s*,\s*services/i);
  if (skusMatch) {
    try {
      const skusObj = JSON.parse(skusMatch[1]);
      for (const k of Object.keys(skusObj)) {
        if (skusObj[k].sku) rawSkuStrings.push(skusObj[k].sku);
      }
    } catch {}
  }
  const htmlSkuMatch = html.match(/class=["'][^"']*js-product-sku[^"']*["'][^>]*>([^<]+)</i);
  if (htmlSkuMatch) rawSkuStrings.push(htmlSkuMatch[1].trim());

  const allEans = [];
  for (const raw of rawSkuStrings) {
    for (const p of raw.split(/[;,/]/)) {
      const clean = p.replace(/\D/g, '');
      if (clean) allEans.push(clean);
    }
  }
  const validEans = [];
  for (const b of [...new Set(allEans)]) {
    const c = classifyBarcode(b);
    if (c.valid && c.checksumOk && (b.length === 13 || b.length === 12 || b.length === 8)) {
      validEans.push(b.length === 12 && c.ean13 ? c.ean13 : b);
    }
  }

  // Singular hero gallery template
  const galleryTemplateMatch = html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->([\s\S]*?)<!--\/\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->/i);
  let uniqueImages = [];
  let hasEmptySvg = false;

  if (galleryTemplateMatch) {
    const galleryHtml = galleryTemplateMatch[1];
    if (galleryHtml.includes('empty_photo.svg')) {
      hasEmptySvg = true;
    } else {
      const imgMatches = [...galleryHtml.matchAll(/(?:\/wa-data\/public\/shop\/products\/[^\s"']+\.700\.[a-z0-9]+)/gi)]
        .map(m => m[0].startsWith('http') ? m[0] : 'https://semeiniy.kz' + m[0]);
      uniqueImages = [...new Set(imgMatches)];
    }
  }

  // Check if photos contain the product's own internal ID
  let ownIdMatch = true;
  if (productId && uniqueImages.length > 0) {
    for (const img of uniqueImages) {
      if (!img.includes(`/${productId}/`)) {
        ownIdMatch = false;
      }
    }
  }

  return {
    title,
    productId,
    ean: validEans[0] || null,
    alternate_eans: validEans.length > 1 ? validEans.slice(1) : [],
    image_url: uniqueImages[0] || null,
    images: uniqueImages,
    hasEmptySvg,
    ownIdMatch,
    hasGalleryTemplate: !!galleryTemplateMatch
  };
}

async function run() {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < selectedUrls.length) {
      const item = selectedUrls[index++];
      const html = await fetchWithRetry(item.url);
      if (!html) {
        results.push({ url: item.url, category: item.targetCategory, error: 'fetch_failed' });
        continue;
      }
      const parsed = parseHeroGallery(html);
      results.push({
        url: item.url,
        category: item.targetCategory,
        ...parsed
      });
      process.stdout.write(`\rProgress: ${results.length}/${selectedUrls.length}...`);
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  console.log('\n\n========================================');
  console.log('200-ITEM CONTROLLER SPOT-CHECK RESULTS');
  console.log('========================================');

  const total = results.length;
  const withPhotos = results.filter(r => r.images && r.images.length > 0);
  const multiPhotos = results.filter(r => r.images && r.images.length > 1);
  const emptySvgs = results.filter(r => r.hasEmptySvg);
  const idMismatches = withPhotos.filter(r => r.ownIdMatch === false);
  const withEans = results.filter(r => r.ean);

  console.log(`Total URLs Processed: ${total}`);
  console.log(`Products with Valid EAN: ${withEans.length} (${((withEans.length / total) * 100).toFixed(1)}%)`);
  console.log(`Products with Real Studio Photos: ${withPhotos.length} (${((withPhotos.length / total) * 100).toFixed(1)}%)`);
  console.log(`Products with Multiple Angles (Front + Back/Sides): ${multiPhotos.length} (${((multiPhotos.length / withPhotos.length) * 100).toFixed(1)}% of photo items)`);
  console.log(`Products correctly identified with empty_photo.svg: ${emptySvgs.length}`);
  console.log(`Product ID Path Mismatches (Cross-Product Leakage): ${idMismatches.length} (MUST BE 0!)`);

  // Category breakdown
  console.log('\nCategory Breakdown:');
  const byCat = {};
  for (const r of results) {
    if (!byCat[r.category]) byCat[r.category] = { total: 0, photos: 0, multi: 0, empty: 0 };
    byCat[r.category].total++;
    if (r.images && r.images.length > 0) byCat[r.category].photos++;
    if (r.images && r.images.length > 1) byCat[r.category].multi++;
    if (r.hasEmptySvg) byCat[r.category].empty++;
  }
  for (const [c, s] of Object.entries(byCat)) {
    console.log(` - ${c.padEnd(12)}: ${s.photos}/${s.total} with photos (${s.multi} multi-angle, ${s.empty} empty)`);
  }

  // Print 15 sample products with photos across categories
  console.log('\nSample Products with Multi-Angle Photos:');
  const samples = withPhotos.slice(0, 15);
  samples.forEach((s, idx) => {
    console.log(`\n[${idx + 1}] ${s.title}`);
    console.log(`    Category: ${s.category} | EAN: ${s.ean} | Alt EANs: ${JSON.stringify(s.alternate_eans)}`);
    console.log(`    URL: ${s.url}`);
    console.log(`    Photos (${s.images.length}):`);
    s.images.forEach((img, i) => console.log(`      (${i + 1}) ${img}`));
  });

  fs.writeFileSync(path.join(__dirname, '..', 'data', 'semeiniy_200_test_results.json'), JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to data/semeiniy_200_test_results.json`);
}

run().catch(console.error);
