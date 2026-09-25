import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const CATEGORIES = [
  '/catalog/vafli-19',
  '/catalog/pechenye-3',
  '/catalog/kreker-20',
  '/catalog/sukhie-zavtraki-53',
  '/catalog/kruassany-36',
  '/catalog/tarallini-42',
  '/catalog/pryaniki-27',
  '/catalog/biskvity-rulety-keksy-18',
  '/catalog/konfety-1',
  '/catalog/karamel-24',
  '/catalog/drazhe-22',
  '/catalog/shokolad-6',
  '/catalog/shokoladnaya-i-arakhisovaya-pasta-32',
  '/catalog/batonchiki-4',
  '/catalog/zefir-marmelad-25',
  '/catalog/khalva-kozinaki-77',
  '/catalog/soki-i-nektary-34',
  '/catalog/chay-30',
  '/catalog/sneki-43',
  '/catalog/chipsy-44',
  '/catalog/semechki-i-sukhariki-45'
];

async function fetchCategory(cat) {
  const prods = new Set();
  try {
    const res = await fetch(`https://kdvonline.kz${cat}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return prods;
    const html = await res.text();
    const links = [...html.matchAll(/href="(\/product\/[0-9a-z_\-]+)"/gi)].map(m => m[1]);
    links.forEach(l => prods.add(l));
  } catch {}
  return prods;
}

async function fetchProduct(url) {
  try {
    const res = await fetch(`https://kdvonline.kz${url}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const html = await res.text();

    const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim();
    if (!title) return null;

    // Barcode
    const bcMatch = html.match(/[Шш]трихкод[^<]*<[^>]+>([0-9]{8,14})/);
    const barcode = bcMatch ? bcMatch[1] : null;

    // Composition
    const compMatch = html.match(/Состав[:\s]*<\/[^>]+>([\s\S]*?)<\/p>|Состав[:\s]*([\s\S]*?)<\/(p|div|span|td)/i);
    const comp = compMatch ? (compMatch[1] || compMatch[2] || '').replace(/<[^>]+>/g, '').trim() : null;

    // Nutrition
    const calMatch = html.match(/[Кк]алорийность[^<]*[\s:]+([0-9,\.]+)/);
    const protMatch = html.match(/[Бб]елк[иов]+[^<]*[\s:]+([0-9,\.]+)/);
    const fatMatch = html.match(/[Жж]ир[ыа]?[^<]*[\s:]+([0-9,\.]+)/);
    const carbMatch = html.match(/[Уу]глевод[ыа]?[^<]*[\s:]+([0-9,\.]+)/);

    const calories = calMatch ? parseFloat(calMatch[1].replace(',', '.')) : null;
    const protein = protMatch ? parseFloat(protMatch[1].replace(',', '.')) : null;
    const fat = fatMatch ? parseFloat(fatMatch[1].replace(',', '.')) : null;
    const carbs = carbMatch ? parseFloat(carbMatch[1].replace(',', '.')) : null;

    // Image from JSON-LD or HTML
    const imgMatches = [...html.matchAll(/(https:\/\/api\.kdvonline\.kz\/thumbnail\/740x740\/[^"'\s]+)/gi)].map(m => m[1]);
    const image = imgMatches.length > 0 ? imgMatches[0] : null;

    // Brand
    const brandMatch = html.match(/«([^»]+)»/);
    const brand = brandMatch ? brandMatch[1] : null;

    return {
      title,
      barcode,
      brand,
      composition: comp,
      calories,
      protein,
      fat,
      carbs,
      image,
      url: `https://kdvonline.kz${url}`
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log('Discovering KDV product URLs...');
  const allUrls = new Set();
  for (const cat of CATEGORIES) {
    const urls = await fetchCategory(cat);
    urls.forEach(u => allUrls.add(u));
    console.log(`Category ${cat}: ${urls.size} links found (total ${allUrls.size})`);
  }

  console.log(`Total KDV products to crawl: ${allUrls.size}`);
  const list = Array.from(allUrls);
  const products = [];
  const CONCURRENCY = 8;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const chunk = list.slice(i, i + CONCURRENCY);
    const res = await Promise.all(chunk.map(fetchProduct));
    products.push(...res.filter(Boolean));
    if ((i + CONCURRENCY) % 40 === 0 || i + CONCURRENCY >= list.length) {
      console.log(`Fetched ${products.length} / ${list.length} products...`);
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'kdv_catalog.json');
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Saved ${products.length} KDV products to ${outPath}`);
}

main().catch(console.error);
