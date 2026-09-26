import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'agusha_official_catalog.json');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchPage(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function cleanHtml(str) {
  return (str || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;|&raquo;|&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('=== Harvesting Agusha (agulife.ru) Official Catalog ===');

  const sitemapXml = await fetchPage('https://agulife.ru/sitemapa/sitemap-iblock-18.xml');
  const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  console.log(`Found ${urls.length} product URLs in sitemap.`);

  const catalog = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] Fetching ${url}...`);
    try {
      const html = await fetchPage(url);

      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const rawTitle = titleMatch ? cleanHtml(titleMatch[1]) : '';
      if (!rawTitle) continue;

      let fullTitle = rawTitle;
      if (!fullTitle.toLowerCase().includes('агуша')) {
        fullTitle = 'Агуша ' + fullTitle;
      }

      // Extract KBJU
      let energy_kcal = null;
      let protein_100g = null;
      let fat_100g = null;
      let carbohydrates_100g = null;

      const calMatch = html.match(/class="[^"]*energy-value[^"]*"[^>]*>\s*(\d+(?:[.,]\d+)?)\s*ккал/i);
      if (calMatch) energy_kcal = parseFloat(calMatch[1].replace(',', '.'));

      // Nutrients: Белки, Жиры, Углеводы
      const nutrientBlocks = [...html.matchAll(/class="[^"]*nutrient-value[^"]*"[^>]*>\s*(\d+(?:[.,]\d+)?)[^<]*<\/span>\s*<span[^>]*class="[^"]*nutrient-label[^"]*"[^>]*>([^<]+)<\/span>/gi)];
      for (const nb of nutrientBlocks) {
        const val = parseFloat(nb[1].replace(',', '.'));
        const label = nb[2].toLowerCase();
        if (label.includes('белк')) protein_100g = val;
        if (label.includes('жир')) fat_100g = val;
        if (label.includes('углев')) carbohydrates_100g = val;
      }

      // Composition
      let composition = null;
      const compIdx = html.indexOf('Состав:');
      if (compIdx !== -1) {
        const compSnippet = html.slice(compIdx, compIdx + 800);
        const ulMatch = compSnippet.match(/<ul>([\s\S]*?)<\/ul>/i);
        if (ulMatch) {
          composition = cleanHtml(ulMatch[1]);
        }
      }

      const item = {
        name: fullTitle,
        originalTitle: rawTitle,
        url,
        nutriments: (energy_kcal != null && protein_100g != null) ? {
          energy_kcal,
          protein_100g,
          fat_100g: fat_100g || 0,
          carbohydrates_100g: carbohydrates_100g || 0
        } : null,
        composition
      };

      catalog.push(item);
    } catch (err) {
      console.error(`Error on ${url}:`, err.message);
    }
  }

  console.log(`\nHarvested ${catalog.length} Agusha items.`);
  const withKbju = catalog.filter(c => c.nutriments).length;
  console.log(`Items with verified KBJU: ${withKbju}`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Saved Agusha catalog to ${OUTPUT_PATH}`);
}

main().catch(console.error);
