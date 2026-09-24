import fs from 'fs';

async function checkKdvLinks() {
  const res = await fetch('https://kdvonline.kz/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();
  const re = /href="([^"]+)"/g;
  let match;
  const links = new Set();
  while ((match = re.exec(html)) !== null) {
    if (match[1].includes('product') || match[1].includes('catalog') || match[1].includes('category')) {
      links.add(match[1]);
    }
  }
  console.log('Product/catalog/category links:', Array.from(links).slice(0, 20));
}
checkKdvLinks();
