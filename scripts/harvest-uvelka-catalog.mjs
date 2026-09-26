import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const CATS = [
  'https://uvelka.ru/products/gerkules-bogatyrskiy/',
  'https://uvelka.ru/products/krupy-v-paketikakh-dlya-varki/',
  'https://uvelka.ru/products/muka/',
  'https://uvelka.ru/products/khlopya-dlya-zavtraka/',
  'https://uvelka.ru/products/krupy-v-myagkoy-upakovke/',
  'https://uvelka.ru/products/sukhie-smesi-dlya-prigotovleniya-garnirov/',
  'https://uvelka.ru/products/ovsyanye-kashi-bez-varki/',
  'https://uvelka.ru/products/krupy-v-paketikakh-dlya-varkiferm/',
  'https://uvelka.ru/products/sukhie-smesi-dlya-prigotovleniya-supov/',
  'https://uvelka.ru/products/kashi-vegan/',
  'https://uvelka.ru/products/kollektsiya-vkusov/',
  'https://uvelka.ru/products/pasta-v-paketikakh-dlya-varki/'
];

function cleanText(str) {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchPage(url) {
  return await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Cookie': 'beget=begetok'
    }
  });
}

function parseProductPage(html, url) {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? cleanText(h1Match[1]) : '';
  if (!title) return null;

  const subtitleMatch = html.match(/<div class="product__subtitle">([\s\S]*?)<\/div>/i);
  const subtitle = subtitleMatch ? cleanText(subtitleMatch[1]) : '';

  // Nutriments from Пищевая ценность block
  let protein = null;
  let fat = null;
  let carbs = null;
  let calories = null;

  const nutrBlockIdx = html.indexOf('Пищевая ценность');
  const nutrBlock = nutrBlockIdx !== -1 ? html.slice(nutrBlockIdx, nutrBlockIdx + 500) : html;

  const protMatch = nutrBlock.match(/(?:Белки|белки)[^0-9]*([0-9]+(?:[.,][0-9]+)?)\s*г/i);
  if (protMatch) protein = parseFloat(protMatch[1].replace(',', '.'));

  const fatMatch = nutrBlock.match(/(?:Жиры|жиры)[^0-9]*([0-9]+(?:[.,][0-9]+)?)\s*г/i);
  if (fatMatch) fat = parseFloat(fatMatch[1].replace(',', '.'));

  const carbMatch = nutrBlock.match(/(?:Углеводы|углеводы)[^0-9]*([0-9]+(?:[.,][0-9]+)?)\s*г/i);
  if (carbMatch) carbs = parseFloat(carbMatch[1].replace(',', '.'));

  const calMatch = nutrBlock.match(/([0-9]{2,3})\s*ккал/i) || nutrBlock.match(/\/\s*([0-9]{2,3})\s*ккал/i);
  if (calMatch) calories = parseInt(calMatch[1], 10);

  if (!calories && protein !== null && fat !== null && carbs !== null) {
    calories = Math.round(4 * protein + 9 * fat + 4 * carbs);
  }

  // Composition / description
  let composition = subtitle;
  const compMatch = html.match(/Состав\s*[:\s]*([\s\S]*?)(?=<\/p>|<div|$)/i);
  if (compMatch) {
    composition = cleanText(compMatch[1]);
  }

  return {
    source_url: url,
    brand: 'Увелка',
    title,
    subtitle,
    composition,
    protein,
    fat,
    carbs,
    calories
  };
}

async function main() {
  console.log('--- Starting Uvelka Official Catalog Harvester ---');
  const productUrls = new Set();

  for (const catUrl of CATS) {
    try {
      console.log(`Fetching category: ${catUrl}`);
      const res = await fetchPage(catUrl);
      if (!res.ok) continue;
      const html = await res.text();
      const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
      const catPath = new URL(catUrl).pathname;
      for (const l of links) {
        if (l.startsWith(catPath) && l !== catPath && !l.includes('#')) {
          const full = new URL(l, 'https://uvelka.ru').href;
          productUrls.add(full);
        }
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error(`Error fetching category ${catUrl}:`, e.message);
    }
  }

  console.log(`Found ${productUrls.size} unique product pages on Uvelka.`);

  const products = [];
  let count = 0;
  for (const pUrl of productUrls) {
    count++;
    try {
      const res = await fetchPage(pUrl);
      if (!res.ok) continue;
      const html = await res.text();
      const p = parseProductPage(html, pUrl);
      if (p && (p.calories || p.protein || p.fat || p.carbs)) {
        products.push(p);
      }
      if (count % 15 === 0 || count === productUrls.size) {
        console.log(`[${count}/${productUrls.size}] Harvested ${products.length} products with valid KBJU`);
      }
      await new Promise(r => setTimeout(r, 350));
    } catch (e) {
      console.error(`Error fetching ${pUrl}:`, e.message);
    }
  }

  console.log(`\nTotal Uvelka products harvested with KBJU: ${products.length}`);
  const outPath = 'data/uvelka_official_catalog.json';
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
  console.log(`Saved to ${outPath}`);
}

main().catch(console.error);
