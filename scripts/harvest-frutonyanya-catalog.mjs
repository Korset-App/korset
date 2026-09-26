import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function cleanText(str) {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getProductUrls() {
  const res = await fetch('http://frutonyanya.ru/sitemap-iblock-2.xml', { headers: { 'User-Agent': UA } });
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  // Product detail URLs have at least 2 parts after /products/
  return urls.filter(u => {
    const parts = u.replace('http://frutonyanya.ru/products/', '').split('/').filter(Boolean);
    return parts.length >= 2;
  });
}

function parseFnPage(html, url) {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const rawTitle = h1Match ? cleanText(h1Match[1]) : '';
  if (!rawTitle) return null;

  const title = rawTitle.replace(/«ФрутоНяня»\s*/i, '').trim();

  // Composition: <h2 class="info__title">Состав:</h2>\s*<p class="info__descr">...</p>
  let composition = null;
  const compMatch = html.match(/<h2 class="info__title"[^>]*>Состав:?<\/h2>\s*<p class="info__descr"[^>]*>([\s\S]*?)<\/p>/i) ||
                    html.match(/Состав:?<\/h[1234]>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
  if (compMatch) {
    const rawComp = cleanText(compMatch[1]).trim();
    if (rawComp.length > 3) {
      composition = rawComp;
    }
  }

  // KBJU
  let protein = null;
  let fat = null;
  let carbs = null;
  let calories = null;

  const rows = [...html.matchAll(/<div[^>]*class="[^"]*info__tr[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)];
  for (const r of rows) {
    const text = cleanText(r[1]);
    const lower = text.toLowerCase();
    const numMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)/);
    if (!numMatch) continue;
    const num = parseFloat(numMatch[1].replace(',', '.'));
    if (isNaN(num)) continue;

    if (lower.includes('белк')) {
      if (num >= 0 && num <= 100) protein = num;
    } else if (lower.includes('жир')) {
      if (num >= 0 && num <= 100) fat = num;
    } else if (lower.includes('углевод')) {
      if (num >= 0 && num <= 100) carbs = num;
    } else if (lower.includes('энерг') || lower.includes('ккал')) {
      if (num >= 5 && num <= 950) calories = Math.round(num);
    }
  }

  if (!calories && (protein !== null || fat !== null || carbs !== null)) {
    calories = Math.round(4 * (protein || 0) + 9 * (fat || 0) + 4 * (carbs || 0));
  }

  return {
    source_url: url,
    brand: 'ФрутоНяня',
    product_name: title,
    title: `ФрутоНяня ${title}`,
    composition,
    protein,
    fat,
    carbs,
    calories
  };
}

async function main() {
  console.log('--- Starting FrutoNyanya Official Harvester ---');
  const urls = await getProductUrls();
  console.log(`Found ${urls.length} product URLs`);

  const products = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      const html = await res.text();
      const p = parseFnPage(html, url);
      if (p && (p.calories || p.protein || p.carbs || p.composition)) {
        products.push(p);
        console.log(`[${i+1}/${urls.length}] ${p.product_name} => P:${p.protein} F:${p.fat} C:${p.carbs} Cal:${p.calories} | Comp: ${p.composition ? p.composition.slice(0, 40) + '...' : 'none'}`);
      }
      await new Promise(r => setTimeout(r, 120));
    } catch (e) {
      console.error(`Error fetching ${url}:`, e.message);
    }
  }

  console.log(`\nTotal parsed FrutoNyanya products: ${products.length}`);
  const outPath = 'data/frutonyanya_official_catalog.json';
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
  console.log(`Saved to ${outPath}`);
}

main().catch(console.error);
