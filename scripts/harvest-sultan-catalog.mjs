import fs from 'fs';
import path from 'path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const SEED_URLS = [
  'https://sultanmarketing.kz/products/makarony/',
  'https://sultanmarketing.kz/products/makarony/dlinorez/',
  'https://sultanmarketing.kz/products/makarony/korotkorez/',
  'https://sultanmarketing.kz/products/makarony/figurnye/',
  'https://sultanmarketing.kz/products/makarony/yajchnye/',
  'https://sultanmarketing.kz/products/muka/',
  'https://sultanmarketing.kz/products/krupy/',
  'https://sultanmarketing.kz/products/konditerskie-izdeliya/',
  'https://sultanmarketing.kz/products/konditerskie-izdeliya/pechene/',
  'https://sultanmarketing.kz/products/konditerskie-izdeliya/vafli/',
  'https://sultanmarketing.kz/products/konditerskie-izdeliya/rulety/',
  'https://sultanmarketing.kz/products/konditerskie-izdeliya/shokolad/'
];

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&#171;/g, '«')
    .replace(/&#187;/g, '»')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseModals(html, pageUrl) {
  const products = [];
  const modalMatches = [...html.matchAll(/<div class="modal fade modal-product"[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g)];

  for (const m of modalMatches) {
    const modalId = m[1];
    const modalHtml = m[2];

    // Title
    const titleMatch = modalHtml.match(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/i);
    const title = titleMatch ? cleanText(titleMatch[1]) : '';
    if (!title) continue;

    // Parse table rows
    const rows = [...modalHtml.matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi)];
    const tableProps = {};
    for (const r of rows) {
      const key = cleanText(r[1]).toLowerCase().replace(/[:\s]+$/, '');
      const val = cleanText(r[2]);
      if (key && val) {
        tableProps[key] = val;
      }
    }

    // Weight
    let weight = tableProps['вес'] || '';
    if (!weight) {
      const wm = modalHtml.match(/([0-9.,]+\s*(?:гр|г|кг|мл|л)\.?)/i);
      if (wm) weight = wm[1];
    }

    // Manufacturer
    let manufacturer = tableProps['производитель'] || 'АО «СУЛТАН ЭММК»';

    // Storage conditions
    let storage_conditions = tableProps['условия хранения'] || '';

    // Shelf life
    let shelf_life = tableProps['срок годности'] || '';

    // Composition
    let composition = tableProps['состав'] || '';
    if (!composition) {
      for (const [k, v] of Object.entries(tableProps)) {
        if (k.includes('состав')) {
          composition = v;
          break;
        }
      }
    }

    // Nutriments
    let protein = null;
    let fat = null;
    let carbs = null;
    let calories = null;

    for (const [k, v] of Object.entries(tableProps)) {
      if (k.includes('белк')) {
        const num = parseFloat(v.replace(',', '.'));
        if (!isNaN(num) && num >= 0 && num <= 100) protein = num;
      } else if (k.includes('жир')) {
        const num = parseFloat(v.replace(',', '.'));
        if (!isNaN(num) && num >= 0 && num <= 100) fat = num;
      } else if (k.includes('углевод')) {
        const num = parseFloat(v.replace(',', '.'));
        if (!isNaN(num) && num >= 0 && num <= 100) carbs = num;
      } else if (k.includes('энерг') || k.includes('ккал')) {
        const numMatch = v.match(/\/\s*([0-9]+(?:\.[0-9]+)?)/) || v.match(/([0-9]+(?:\.[0-9]+)?)\s*ккал/) || v.match(/([0-9]{2,3})/);
        if (numMatch) {
          const num = parseFloat(numMatch[1].replace(',', '.'));
          if (!isNaN(num) && num >= 10 && num <= 950) calories = Math.round(num);
        }
      }
    }

    // Fallback energy calculation if missing
    if (!calories && protein !== null && fat !== null && carbs !== null) {
      calories = Math.round(4 * protein + 9 * fat + 4 * carbs);
    }

    // Image
    const imgMatch = modalHtml.match(/<img[^>]+src="([^">]+\.(?:png|jpe?g|webp))"/i);
    const image_url = imgMatch ? imgMatch[1] : '';

    products.push({
      modalId,
      source_url: pageUrl,
      title,
      weight,
      manufacturer,
      storage_conditions,
      shelf_life,
      composition,
      calories,
      protein,
      fat,
      carbs,
      image_url
    });
  }

  return products;
}

async function main() {
  console.log('--- Starting Sultan Official Catalog Harvester ---');
  const visited = new Set();
  const queue = [...SEED_URLS];
  const allProducts = [];
  const seenTitles = new Set();

  while (queue.length > 0) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      console.log(`Fetching: ${url}`);
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) {
        console.log(`  Failed: ${res.status}`);
        continue;
      }
      const html = await res.text();

      // Discover pagination links
      const pageLinks = [...html.matchAll(/href="([^"]+\/page\/\d+\/)"/g)].map(m => m[1]);
      for (const pl of pageLinks) {
        if (!visited.has(pl) && !queue.includes(pl)) {
          queue.push(pl);
        }
      }

      // Discover subcategory links under /products/
      const subLinks = [...html.matchAll(/href="(https:\/\/sultanmarketing\.kz\/products\/[^"]+)"/g)].map(m => m[1]);
      for (const sl of subLinks) {
        const clean = sl.split('#')[0];
        if (!visited.has(clean) && !queue.includes(clean) && !clean.includes('wp-')) {
          queue.push(clean);
        }
      }

      // Parse modals
      const prods = parseModals(html, url);
      console.log(`  Parsed ${prods.length} products from page`);
      for (const p of prods) {
        const key = `${p.title}_${p.weight}`.toLowerCase();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          allProducts.push(p);
        }
      }

      // Rate limit delay
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error(`Error fetching ${url}:`, e.message);
    }
  }

  console.log(`Total Sultan products harvested: ${allProducts.length}`);
  const withKBJU = allProducts.filter(p => p.calories || p.protein || p.fat || p.carbs);
  const withComp = allProducts.filter(p => p.composition && p.composition.length > 3);
  console.log(`With KBJU: ${withKBJU.length}`);
  console.log(`With Composition: ${withComp.length}`);

  const outPath = 'data/sultan_official_catalog.json';
  fs.writeFileSync(outPath, JSON.stringify(allProducts, null, 2));
  console.log(`Saved to ${outPath}`);
}

main().catch(console.error);
