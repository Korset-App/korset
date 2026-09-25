import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'https://vkusmart.vmv.kz';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const ROOT_CATEGORIES = [
  '/catalog/bakaleya/',
  '/catalog/molochnaya-produktsiya-syr-yaytso/',
  '/catalog/myaso-ptitsa-kolbasa/',
  '/catalog/ryba-moreprodukty/',
  '/catalog/khleb-vypechka/',
  '/catalog/chay-kofe-kakao/',
  '/catalog/napitki_1/',
  '/catalog/konditerskie-izdeliya/',
  '/catalog/ovoshchi-frukty-zelen-griby/',
  '/catalog/zamorozhennye-produkty/',
  '/catalog/sobstvennoe-proizvodstvo/'
];

async function discoverSubcategories() {
  const subcats = new Set(ROOT_CATEGORIES);
  for (const cat of ROOT_CATEGORIES) {
    try {
      const res = await fetch(`${BASE}${cat}`, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      const html = await res.text();
      const links = [...html.matchAll(/href="(\/catalog\/[a-z0-9_\-]+\/)"/gi)].map(m => m[1]);
      links.forEach(l => {
        if (l !== '/catalog/' && !l.includes('podarochnye') && !l.includes('aktsii')) {
          subcats.add(l);
        }
      });
    } catch {}
  }
  return Array.from(subcats);
}

async function getProductLinksFromCat(catUrl, page = 1) {
  try {
    const url = `${BASE}${catUrl}?PAGEN_1=${page}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { links: [], hasNext: false };
    const html = await res.text();
    const itemLinks = [...html.matchAll(/href="(\/catalog\/[a-z0-9_\-]+\/\d+\/)"/gi)].map(m => m[1]);
    const hasNext = html.includes(`PAGEN_1=${page + 1}`);
    return { links: [...new Set(itemLinks)], hasNext };
  } catch {
    return { links: [], hasNext: false };
  }
}

async function main() {
  console.log('Discovering Vkusmart categories...');
  const subcats = await discoverSubcategories();
  console.log(`Discovered ${subcats.length} subcategories.`);

  const allProductUrls = new Set();
  for (const sc of subcats) {
    let page = 1;
    while (page <= 20) {
      const { links, hasNext } = await getProductLinksFromCat(sc, page);
      links.forEach(l => allProductUrls.add(l));
      if (!hasNext || links.length === 0) break;
      page++;
    }
    console.log(`Cat ${sc}: total so far ${allProductUrls.size}`);
  }

  console.log(`Total unique Vkusmart product URLs: ${allProductUrls.size}`);
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'vkusmart_urls.json'), JSON.stringify(Array.from(allProductUrls), null, 2));
}

main().catch(console.error);
