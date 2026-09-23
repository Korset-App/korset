import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCategories() {
  const res = await fetch('https://kdvonline.kz/', {
    headers: { 'User-Agent': UA }
  });
  const html = await res.text();
  const links = [...html.matchAll(/href="(\/category\/[a-z0-9_\-]+(?:\/[a-z0-9_\-]+)?)"/g)]
    .map(m => m[1])
    .filter((v, i, a) => a.indexOf(v) === i);
  return links;
}

async function getProductsFromSearchPage(query, page = 1) {
  const encQuery = encodeURIComponent(query);
  const url = `https://kdvonline.kz/search?q=${encQuery}&page=${page}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const links = [...html.matchAll(/href="(\/product\/[a-z0-9_\-]+)"/g)]
    .map(m => m[1])
    .filter((v, i, a) => a.indexOf(v) === i);
  return links;
}

function extractProductData(html, url) {
  const name = (html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || '').trim();

  const barcodeMatch = html.match(/[Шш]трихкод[^<]*<[^>]+>([0-9]{8,14})/);
  const barcode = barcodeMatch ? barcodeMatch[1] : null;

  // Find structured data (JSON-LD)
  const jldMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  let ean = null;
  let description = null;
  let image = null;
  let brand = null;
  for (const m of jldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj.gtin13 || obj.gtin14 || obj.gtin8) {
        ean = obj.gtin13 || obj.gtin14 || obj.gtin8;
      }
      if (obj.description) description = obj.description;
      if (obj.image) image = Array.isArray(obj.image) ? obj.image[0] : obj.image;
      if (obj.brand?.name) brand = obj.brand.name;
    } catch {}
  }
  ean = ean || barcode;

  // Extract composition from text
  const compMatch = html.match(/Состав[:\s]*<\/[^>]+>([\s\S]*?)<\/p>|Состав[:\s]*([\s\S]*?)<\/(p|div|span|td)/i);
  const ingredients = compMatch ? (compMatch[1] || compMatch[2] || '').replace(/<[^>]+>/g, '').trim() : null;

  // Extract nutrition
  const calMatch = html.match(/[Кк]алорийность[^<]*[\s:]+([0-9,\.]+)/);
  const protMatch = html.match(/[Бб]елк[иов]+[^<]*[\s:]+([0-9,\.]+)/);
  const fatMatch = html.match(/[Жж]ир[ыа]?[^<]*[\s:]+([0-9,\.]+)/);
  const carbMatch = html.match(/[Уу]глевод[ыа]?[^<]*[\s:]+([0-9,\.]+)/);

  const calories = calMatch ? parseFloat(calMatch[1].replace(',', '.')) : null;
  const protein = protMatch ? parseFloat(protMatch[1].replace(',', '.')) : null;
  const fat = fatMatch ? parseFloat(fatMatch[1].replace(',', '.')) : null;
  const carbs = carbMatch ? parseFloat(carbMatch[1].replace(',', '.')) : null;

  return { name, ean, ingredients, description, image, brand, calories, protein, fat, carbs, url };
}

async function crawlKdv() {
  const queries = [
    'яшкино', 'o\'zera', 'бонди', 'kiri', 'кириешки', 'снеки', 'вафли', 'печенье',
    'чай', 'кофе', 'сахар', 'мука', 'крупы', 'макароны', 'консервы', 'соус',
    'шоколад', 'конфеты', 'зефир', 'карамель', 'пастила', 'мармелад'
  ];

  const allProductUrls = new Set();

  for (const q of queries) {
    for (let page = 1; page <= 5; page++) {
      const links = await getProductsFromSearchPage(q, page);
      links.forEach(l => allProductUrls.add(l));
      if (links.length < 5) break;
    }
    await sleep(200);
  }

  console.log(`Found ${allProductUrls.size} unique product URLs from KDV.`);

  const products = [];
  let count = 0;
  for (const slug of allProductUrls) {
    const url = 'https://kdvonline.kz' + slug;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      const html = await res.text();
      const product = extractProductData(html, url);
      if (product.name && product.ean) {
        products.push(product);
      }
      count++;
      if (count % 50 === 0) {
        console.log(`[${count}/${allProductUrls.size}] With EAN: ${products.length}`);
      }
    } catch {}
    await sleep(150);
  }

  console.log(`\nKDV crawl complete! Products with EAN: ${products.length}`);
  fs.writeFileSync('data/kdv_catalog.json', JSON.stringify(products, null, 2), 'utf8');
  console.log('Saved to data/kdv_catalog.json');
}

crawlKdv();
