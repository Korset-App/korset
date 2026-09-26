import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.join(__dirname, '..', 'data', 'bayansulu_official_catalog.json');
const SITEMAP_URL = 'https://bayansulu.kz/wp-sitemap-posts-product-1.xml';

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
    .replace(/&#8211;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBayanPage(url, html) {
  if (!html) return null;

  // Title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (!titleMatch) return null;
  const title = cleanText(titleMatch[1]);
  if (!title || title.length < 2) return null;

  // Description tab
  const tabMatch = html.match(/<div class="[^"]*woocommerce-Tabs-panel[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const content = tabMatch ? tabMatch[1] : html;

  let protein = null;
  let fat = null;
  let carbs = null;
  let calories = null;
  let shelfLife = null;

  // Parse HTML Table
  const tableMatch = content.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    const tableHtml = tableMatch[1];
    const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    if (rows.length >= 2) {
      const headers = (rows[0].match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || []).map(th => cleanText(th).toLowerCase());
      const cells = (rows[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(td => cleanText(td));

      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        const valStr = cells[i] || '';
        const numMatch = valStr.match(/([0-9]+([\,\.][0-9]+)?)/);
        const num = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;

        if (h.includes('белк') || h.includes('ақуыз')) protein = num;
        if (h.includes('жир') || h.includes('май')) fat = num;
        if (h.includes('углев') || h.includes('көмірсу')) carbs = num;
        if (h.includes('энерг') || h.includes('ценност') || h.includes('құндылық')) {
          const calMatch = valStr.match(/([0-9]+)[\s]*(ккал|калор)/i) || valStr.match(/([0-9]+)/);
          if (calMatch) calories = parseInt(calMatch[1], 10);
        }
        if (h.includes('срок') || h.includes('сақтау')) {
          shelfLife = valStr;
        }
      }
    }
  }

  // Fallback text regex if table didn't yield values
  const cleanBody = cleanText(content);
  if (protein === null) {
    const protMatch = cleanBody.match(/белки[\s\:]*([0-9]+([\,\.][0-9]+)?)/i);
    if (protMatch) protein = parseFloat(protMatch[1].replace(',', '.'));
  }
  if (fat === null) {
    const fatMatch = cleanBody.match(/жиры[\s\:]*([0-9]+([\,\.][0-9]+)?)/i);
    if (fatMatch) fat = parseFloat(fatMatch[1].replace(',', '.'));
  }
  if (carbs === null) {
    const carbMatch = cleanBody.match(/углеводы[\s\:]*([0-9]+([\,\.][0-9]+)?)/i);
    if (carbMatch) carbs = parseFloat(carbMatch[1].replace(',', '.'));
  }
  if (calories === null) {
    const calMatch = cleanBody.match(/([0-9]+([\,\.][0-9]+)?)[\s]*(ккал|калор)/i);
    if (calMatch) calories = parseInt(calMatch[1], 10);
  }

  // Parse description text
  let desc = null;
  const pMatch = content.match(/<p>([\s\S]*?)<\/p>/i);
  if (pMatch) desc = cleanText(pMatch[1]);

  return {
    url,
    title,
    description: desc,
    nutriments: {
      energy_kcal: calories,
      protein_100g: protein,
      fat_100g: fat,
      carbohydrates_100g: carbs
    },
    shelf_life: shelfLife
  };
}

async function main() {
  console.log('--- Harvesting Bayan Sulu Official Catalog ---');

  const sitemapXml = await fetchHtml(SITEMAP_URL);
  if (!sitemapXml) {
    console.error('Failed to fetch Bayan Sulu sitemap');
    return;
  }

  const locs = sitemapXml.match(/<loc>([^<]+)<\/loc>/g) || [];
  const productUrls = locs.map(l => l.replace(/<\/?loc>/g, '').trim());
  console.log(`Found ${productUrls.length} Bayan Sulu products in sitemap.`);

  const results = [];
  const CONCURRENCY = 6;

  for (let i = 0; i < productUrls.length; i += CONCURRENCY) {
    const batch = productUrls.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (u) => {
      // Try RU url first
      const ruUrl = u.replace('https://bayansulu.kz/product/', 'https://bayansulu.kz/ru/product/');
      let html = await fetchHtml(ruUrl);
      if (!html) html = await fetchHtml(u);

      if (html) {
        const item = parseBayanPage(u, html);
        if (item && item.title) {
          results.push(item);
        }
      }
    }));

    if (i % 60 === 0 || i + CONCURRENCY >= productUrls.length) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      console.log(`Progress: ${results.length}/${productUrls.length} items scraped.`);
    }

    await new Promise(r => setTimeout(r, 150));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nBayan Sulu Harvest complete! Total items: ${results.length}`);
  const withKbju = results.filter(r => r.nutriments && (r.nutriments.energy_kcal || r.nutriments.protein_100g)).length;
  const fullKbju = results.filter(r => r.nutriments && r.nutriments.energy_kcal && r.nutriments.protein_100g && r.nutriments.fat_100g && r.nutriments.carbohydrates_100g).length;
  console.log(`With Any KBJU: ${withKbju}, With FULL KBJU (P+F+C+Cal): ${fullKbju}`);
}

main().catch(console.error);
