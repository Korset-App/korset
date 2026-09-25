import fs from 'fs';

async function inspectTheMissing6() {
  const allUrls = JSON.parse(fs.readFileSync('data/semeiniy_product_urls.json', 'utf8'));
  
  // Pick the same 50 items
  const sample = [];
  for (let i = 43000; i < 46000; i += 60) {
    sample.push(allUrls[i]);
  }

  const missingUrls = [];

  for (const u of sample) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const m = html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->([\s\S]*?)<!--\/\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->/i);
      if (!m || m[1].includes('empty_photo.svg')) {
        missingUrls.push({ url: u, html });
      }
    } catch {}
  }

  console.log(`Found ${missingUrls.length} items that returned empty_photo in this range.\n`);

  for (let i = 0; i < missingUrls.length; i++) {
    const { url, html } = missingUrls[i];
    console.log(`==================================================`);
    console.log(`[MISSING ITEM #${i + 1}] ${url}`);
    
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    console.log(`Title: ${titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown'}`);

    // Check og:image
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    console.log(`og:image meta tag:`, ogImage ? ogImage[1] : 'NONE');

    // Check schema.org ImageObject
    const schemaImage = html.match(/itemprop=["']image["'][^>]*content=["']([^"']+)["']/i) || html.match(/itemprop=["']image["'][^>]*src=["']([^"']+)["']/i);
    console.log(`schema.org image:`, schemaImage ? schemaImage[1] : 'NONE');

    // Check all img tags on page containing shop/products
    const allProductImgs = [...html.matchAll(/<img[^>]+>/gi)]
      .map(m => m[0])
      .filter(tag => tag.includes('shop/products') || tag.includes('wa-data'));
    console.log(`All img tags on page with shop/products (${allProductImgs.length}):`);
    allProductImgs.slice(0, 5).forEach(t => console.log('   IMG:', t));

    // Check if there is any image URL in javascript (e.g. var product = { ... images: [...] })
    const scriptImages = [...html.matchAll(/(?:\/wa-data\/public\/shop\/products\/[^\s"'<>]+\.(?:jpg|png|webp))/gi)].map(m => m[0]);
    console.log(`Any image URLs anywhere in HTML source (${[...new Set(scriptImages)].length}):`, [...new Set(scriptImages)].slice(0, 5));

    // Print the hero gallery snippet
    const m = html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->([\s\S]*?)<!--\/\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->/i);
    if (m) {
      console.log(`Hero gallery snippet:`, m[1]);
    } else {
      console.log(`No hero gallery template match at all!`);
    }
  }
}

inspectTheMissing6().catch(console.error);
