import fs from 'fs';

async function testModernSitemapRange() {
  const allUrls = JSON.parse(fs.readFileSync('data/semeiniy_product_urls.json', 'utf8'));
  
  // Pick 50 items around Makfa and Goodwill (indices 43000 to 46000)
  const sample = [];
  for (let i = 43000; i < 46000; i += 60) {
    sample.push(allUrls[i]);
  }

  console.log(`Testing ${sample.length} real products from the active catalog range (around index 43k-46k)...`);

  let withPhoto = 0;
  let empty = 0;
  let outOfStock = 0;

  for (const u of sample) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const isOos = html.includes('Нет в наличии');
      if (isOos) outOfStock++;

      const m = html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->([\s\S]*?)<!--\/\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->/i);
      if (m && !m[1].includes('empty_photo.svg')) {
        withPhoto++;
      } else {
        empty++;
      }
    } catch {}
  }

  console.log(`\nResults for active grocery range:`);
  console.log(`Total tested: ${sample.length}`);
  console.log(`With REAL PHOTOS: ${withPhoto} (${((withPhoto / sample.length) * 100).toFixed(1)}%)`);
  console.log(`With empty_photo.svg: ${empty} (${((empty / sample.length) * 100).toFixed(1)}%)`);
  console.log(`Out of stock items: ${outOfStock} (out of ${sample.length})`);
}

testModernSitemapRange().catch(console.error);
