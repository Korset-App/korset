import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'makfa_official_catalog.json');

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
  console.log('=== Harvesting Makfa Official Catalog ===');
  
  const sitemapXml = await fetchPage('https://www.makfa.ru/sitemap-iblock-8.xml');
  const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  console.log(`Found ${urls.length} section URLs in sitemap.`);

  const catalog = [];
  const seenTitles = new Set();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] Fetching ${url}...`);
    try {
      const html = await fetchPage(url);
      
      // Each product modal card contains 'dc-header'
      const cardChunks = html.split('<div class="dc-header">');
      // The first chunk is preamble before the first card
      for (let c = 1; c < cardChunks.length; c++) {
        const chunk = cardChunks[c];
        const titleEnd = chunk.indexOf('</div>');
        if (titleEnd === -1) continue;
        const rawTitle = cleanHtml(chunk.slice(0, titleEnd));
        if (!rawTitle || seenTitles.has(rawTitle)) continue;

        // Extract KBJU
        let energy_kcal = null;
        let protein_100g = null;
        let fat_100g = null;
        let carbohydrates_100g = null;
        let composition = null;

        // Find KBJU section
        const kbjuIdx = chunk.indexOf('КБЖУ');
        if (kbjuIdx !== -1) {
          const kbjuSnippet = chunk.slice(kbjuIdx, kbjuIdx + 600);
          const calMatch = kbjuSnippet.match(/(\d+(?:[.,]\d+)?)\s*ккал/i);
          const protMatch = kbjuSnippet.match(/белки[^\d]*(\d+(?:[.,]\d+)?)\s*г/i);
          const fatMatch = kbjuSnippet.match(/жиры[^\d]*(\d+(?:[.,]\d+)?)\s*г/i);
          const carbMatch = kbjuSnippet.match(/углеводы[^\d]*(\d+(?:[.,]\d+)?)\s*г/i);

          if (calMatch) energy_kcal = parseFloat(calMatch[1].replace(',', '.'));
          if (protMatch) protein_100g = parseFloat(protMatch[1].replace(',', '.'));
          if (fatMatch) fat_100g = parseFloat(fatMatch[1].replace(',', '.'));
          if (carbMatch) carbohydrates_100g = parseFloat(carbMatch[1].replace(',', '.'));
        }

        // Find Composition / Состав section
        const compIdx = chunk.indexOf('Состав');
        if (compIdx !== -1) {
          const compSnippet = chunk.slice(compIdx, compIdx + 600);
          const previewIdx = compSnippet.indexOf('dc-details-preview');
          if (previewIdx !== -1) {
            const compText = compSnippet.slice(previewIdx + 20, previewIdx + 300);
            const endDiv = compText.indexOf('</div>');
            if (endDiv !== -1) {
              composition = cleanHtml(compText.slice(0, endDiv));
            }
          }
        }

        // If no explicit composition block, check formula
        if (!composition) {
          const formIdx = chunk.indexOf('Формула продукта');
          if (formIdx !== -1) {
            const formSnippet = chunk.slice(formIdx, formIdx + 400);
            const previewIdx = formSnippet.indexOf('dc-details-preview');
            if (previewIdx !== -1) {
              const formText = formSnippet.slice(previewIdx + 20, previewIdx + 250);
              const endDiv = formText.indexOf('</div>');
              if (endDiv !== -1) {
                composition = cleanHtml(formText.slice(0, endDiv));
              }
            }
          }
        }

        // Determine category / brand
        let fullTitle = rawTitle;
        if (!fullTitle.toLowerCase().includes('макфа') && !fullTitle.toLowerCase().includes('makfa')) {
          fullTitle = 'Makfa ' + rawTitle;
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
        seenTitles.add(rawTitle);
      }
    } catch (err) {
      console.error(`Error fetching ${url}:`, err.message);
    }
  }

  console.log(`\nHarvested ${catalog.length} unique Makfa items.`);
  const withKbju = catalog.filter(c => c.nutriments).length;
  console.log(`Items with verified KBJU: ${withKbju}`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Saved Makfa catalog to ${OUTPUT_PATH}`);
}

main().catch(console.error);
