import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'sady_official_catalog.json');

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
  console.log('=== Harvesting Sady Pridonia Official Catalog ===');

  const categoryUrls = [
    'https://sadypridonia.ru/catalog/soki-i-nektary/',
    'https://sadypridonia.ru/catalog/ovoshchnye-soki/',
    'https://sadypridonia.ru/catalog/morsy-napitki/'
  ];

  const productUrls = new Set();

  for (const catUrl of categoryUrls) {
    try {
      const html = await fetchPage(catUrl);
      const matches = [...html.matchAll(/href=["'](\/catalog\/[a-z0-9\-]+\/[a-z0-9\-]+\/)["']/g)].map(m => m[1]);
      for (const m of matches) {
        productUrls.add('https://sadypridonia.ru' + m);
      }
    } catch (e) {
      console.error('Error fetching cat:', catUrl, e.message);
    }
  }

  console.log(`Found ${productUrls.size} unique product detail URLs.`);

  const catalog = [];

  for (const url of productUrls) {
    try {
      const html = await fetchPage(url);
      
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const rawTitle = titleMatch ? cleanHtml(titleMatch[1]) : '';
      if (!rawTitle) continue;

      let fullTitle = rawTitle;
      if (!fullTitle.toLowerCase().includes('сады придонья')) {
        fullTitle = 'Сады Придонья ' + fullTitle;
      }

      // Extract KBJU
      let energy_kcal = null;
      let protein_100g = 0;
      let fat_100g = 0;
      let carbohydrates_100g = null;

      const calMatch = html.match(/(\d+(?:[.,]\d+)?)\s*ккал/i);
      if (calMatch) energy_kcal = parseFloat(calMatch[1].replace(',', '.'));

      const carbMatch = html.match(/Углеводы:\s*(\d+(?:[.,]\d+)?)\s*г/i);
      if (carbMatch) carbohydrates_100g = parseFloat(carbMatch[1].replace(',', '.'));

      const protMatch = html.match(/Белки:\s*(\d+(?:[.,]\d+)?)\s*г/i);
      if (protMatch) protein_100g = parseFloat(protMatch[1].replace(',', '.'));

      const fatMatch = html.match(/Жиры:\s*(\d+(?:[.,]\d+)?)\s*г/i);
      if (fatMatch) fat_100g = parseFloat(fatMatch[1].replace(',', '.'));

      // Extract Composition
      let composition = null;
      const compIdx = html.indexOf('Состав</div>');
      if (compIdx !== -1) {
        const compSnippet = html.slice(compIdx, compIdx + 600);
        const valMatch = compSnippet.match(/class="catalog-detail__prop-value">([\s\S]*?)<\/div>/i);
        if (valMatch) {
          composition = cleanHtml(valMatch[1]);
        }
      }

      catalog.push({
        name: fullTitle,
        originalTitle: rawTitle,
        url,
        nutriments: (energy_kcal != null && carbohydrates_100g != null) ? {
          energy_kcal,
          protein_100g,
          fat_100g,
          carbohydrates_100g
        } : null,
        composition
      });
    } catch (err) {
      console.error('Error fetching', url, err.message);
    }
  }

  console.log(`\nHarvested ${catalog.length} Sady Pridonia items.`);
  const withKbju = catalog.filter(c => c.nutriments).length;
  console.log(`Items with verified KBJU: ${withKbju}`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Saved catalog to ${OUTPUT_PATH}`);
}

main().catch(console.error);
