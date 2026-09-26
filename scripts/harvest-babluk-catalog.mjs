import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function cleanText(str) {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getProductLinks() {
  const sections = [
    'https://babluk.ru/products/section.php?SECTION_ID=1696',
    'https://babluk.ru/products/section.php?SECTION_ID=1708',
    'https://babluk.ru/products/section.php?SECTION_ID=2681',
    'https://babluk.ru/products/section.php?SECTION_ID=2682',
    'https://babluk.ru/products/section.php?SECTION_ID=1716',
    'https://babluk.ru/products/section.php?SECTION_ID=1717'
  ];

  const allProductLinks = new Set();

  for (const s of sections) {
    try {
      const res = await fetch(s, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      const html = await res.text();
      const links = [...html.matchAll(/href="(\/products\/[^\"]+)"/g)].map(m => m[1]);
      for (const l of links) {
        if (!l.includes('section.php') && l.split('/').filter(Boolean).length >= 4) {
          allProductLinks.add(`https://babluk.ru${l}`);
        }
      }
    } catch (e) {
      console.error(`Error loading section ${s}:`, e.message);
    }
  }

  return [...allProductLinks];
}

function parseBablukPage(html, url) {
  // Title
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => cleanText(m[1]));
  const title = h1Matches.find(h => !h.includes('Обратная связь') && !h.includes('Авторизация')) || '';
  if (!title) return null;

  // Composition: search for "Состав:</span>\s*<span>...</span>"
  let composition = null;
  const compMatch = html.match(/>Состав:\s*<\/span>\s*<span>([^<]+)<\/span>/i) ||
                    html.match(/Состав:\s*<\/span>\s*<span>([^<]+)<\/span>/i);
  if (compMatch) {
    let cleanComp = cleanText(compMatch[1]).trim();
    if (cleanComp.length > 3) {
      composition = cleanComp;
    }
  }

  // KBJU Table
  let protein = null;
  let fat = null;
  let carbs = null;
  let calories = null;

  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (tableMatch) {
    const tableHtml = tableMatch[0];
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (const r of rows) {
      const cells = [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => cleanText(m[1]));
      if (cells.length >= 2) {
        const key = cells[0].toLowerCase();
        const valStr = cells[1].replace(',', '.');
        const num = parseFloat(valStr);

        if (key.includes('белк')) {
          if (!isNaN(num) && num >= 0 && num <= 100) protein = num;
        } else if (key.includes('жир')) {
          if (!isNaN(num) && num >= 0 && num <= 100) fat = num;
        } else if (key.includes('углевод')) {
          if (!isNaN(num) && num >= 0 && num <= 100) carbs = num;
        } else if (key.includes('энерг') || key.includes('ккал')) {
          // May be format "140/560" or "20/75" (kcal/kJ)
          const calMatch = valStr.match(/(\d+(?:\.\d+)?)\s*(?:\/|\s*ккал)/) || valStr.match(/^(\d+(?:\.\d+)?)/);
          if (calMatch) {
            const calNum = parseFloat(calMatch[1]);
            if (!isNaN(calNum) && calNum >= 5 && calNum <= 950) calories = Math.round(calNum);
          }
        }
      }
    }
  }

  if (!calories && (protein !== null || fat !== null || carbs !== null)) {
    calories = Math.round(4 * (protein || 0) + 9 * (fat || 0) + 4 * (carbs || 0));
  }

  return {
    source_url: url,
    brand: 'Бабушкино Лукошко',
    title: `Бабушкино Лукошко ${title}`,
    product_name: title,
    composition,
    protein,
    fat,
    carbs,
    calories
  };
}

async function main() {
  console.log('--- Starting Babushkino Lukoshko Official Harvester ---');
  const urls = await getProductLinks();
  console.log(`Found ${urls.length} product URLs`);

  const products = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      const html = await res.text();
      const p = parseBablukPage(html, url);
      if (p && (p.calories || p.protein || p.composition)) {
        products.push(p);
        console.log(`[${i+1}/${urls.length}] ${p.product_name} => P:${p.protein} F:${p.fat} C:${p.carbs} Cal:${p.calories} | Comp: ${p.composition ? p.composition.slice(0, 40) + '...' : 'none'}`);
      }
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.error(`Error fetching ${url}:`, e.message);
    }
  }

  console.log(`\nTotal parsed products: ${products.length}`);
  const outPath = 'data/babluk_official_catalog.json';
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
  console.log(`Saved to ${outPath}`);
}

main().catch(console.error);
