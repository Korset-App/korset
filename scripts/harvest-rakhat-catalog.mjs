import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.join(__dirname, '..', 'data', 'rakhat_official_catalog.json');
const SITEMAP_URL = 'https://rakhat.kz/sitemap.xml';

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}

function cleanText(str) {
  if (!str) return null;
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRakhatPage(url, html) {
  if (!html) return null;

  // Title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (!titleMatch) return null;
  const title = cleanText(titleMatch[1]);
  if (!title || title.length < 2) return null;

  // SKU / Article (e.g. №10057)
  const skuMatch = html.match(/№\s*([0-9]{4,6})/);
  const sku = skuMatch ? skuMatch[1] : null;

  // Strip scripts and styles for body extraction
  const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  const bodyText = cleanText(cleanHtml);

  // Parse Composition
  let composition = null;
  const compMatch = bodyText.match(/Состав[:\s]+([^.]+)/i) || bodyText.match(/Состав[:\s]+(.+?)(?=Хранить|Срок|Энергетическая|Пищевая|$)/i);
  if (compMatch && compMatch[1]) {
    composition = compMatch[1].trim();
    // remove trailing markers
    const stopWords = ['хранить при', 'срок годности', 'пищевая ценность', 'энергетическая'];
    for (const sw of stopWords) {
      const idx = composition.toLowerCase().indexOf(sw);
      if (idx !== -1) composition = composition.slice(0, idx).trim();
    }
    composition = composition.replace(/[\.\,\;]+$/, '').trim();
  }

  // Parse KBJU
  let protein = null;
  let fat = null;
  let carbs = null;
  let calories = null;

  const protMatch = bodyText.match(/Белк[а-я\s\:]+([0-9]+([\,\.][0-9]+)?)/i);
  if (protMatch) protein = parseFloat(protMatch[1].replace(',', '.'));

  const fatMatch = bodyText.match(/Жир[а-я\s\:]+([0-9]+([\,\.][0-9]+)?)/i);
  if (fatMatch) fat = parseFloat(fatMatch[1].replace(',', '.'));

  const carbMatch = bodyText.match(/Углев[а-я\s\:]+([0-9]+([\,\.][0-9]+)?)/i);
  if (carbMatch) carbs = parseFloat(carbMatch[1].replace(',', '.'));

  const calMatch = bodyText.match(/Калорийность[:\s]+([0-9]+)/i) ||
                   bodyText.match(/([0-9]+)[\s]*ккал/i);
  if (calMatch) calories = parseInt(calMatch[1], 10);

  // Shelf life
  let shelfLife = null;
  const shelfMatch = bodyText.match(/Срок годности[:\s]+([^.]+)/i);
  if (shelfMatch) shelfLife = shelfMatch[1].trim();

  // Storage conditions
  let storage = null;
  const storMatch = bodyText.match(/Хранить при температуре[:\s]+([^.]+)/i);
  if (storMatch) storage = ('Хранить при температуре ' + storMatch[1]).trim();

  return {
    url,
    sku,
    title,
    composition,
    nutriments: {
      energy_kcal: calories,
      protein_100g: protein,
      fat_100g: fat,
      carbohydrates_100g: carbs
    },
    shelf_life: shelfLife,
    storage_conditions: storage
  };
}

async function main() {
  console.log('--- Harvesting Rakhat Official Catalog ---');

  // Step 1: Read sitemap
  console.log('Fetching sitemap:', SITEMAP_URL);
  const sitemapXml = await fetchHtml(SITEMAP_URL);
  if (!sitemapXml) {
    console.error('Failed to fetch sitemap');
    return;
  }

  const locs = sitemapXml.match(/<loc>([^<]+)<\/loc>/g) || [];
  const productUrls = Array.from(new Set(
    locs.map(l => l.replace(/<\/?loc>/g, '').trim())
        .filter(u => u.includes('/products/') && !u.endsWith('/products/'))
  ));

  console.log(`Found ${productUrls.length} product URLs in Rakhat sitemap.`);

  // Load existing if any
  const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')) : [];
  const processedUrls = new Set(existing.map(e => e.url));
  console.log(`Already scraped: ${processedUrls.size}`);

  const toFetch = productUrls.filter(u => !processedUrls.has(u));
  console.log(`Remaining to fetch: ${toFetch.length}`);

  const results = [...existing];
  const CONCURRENCY = 6;

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (u) => {
      const html = await fetchHtml(u);
      if (html) {
        const item = parseRakhatPage(u, html);
        if (item && item.title) {
          results.push(item);
        }
      }
    }));

    if (i % 60 === 0 || i + CONCURRENCY >= toFetch.length) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      console.log(`Progress: ${results.length}/${productUrls.length} items scraped.`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nHarvest complete! Total items: ${results.length}`);
  const withKbju = results.filter(r => r.nutriments && (r.nutriments.energy_kcal || r.nutriments.protein_100g)).length;
  const withComp = results.filter(r => r.composition && r.composition.length > 5).length;
  console.log(`With KBJU: ${withKbju}, With Composition: ${withComp}`);
}

main().catch(console.error);
