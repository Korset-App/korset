import fs from 'fs';
import readline from 'readline';

async function diagnoseNullPhotos() {
  const filePath = 'data/semeiniy_raw_products.jsonl';
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });

  const nullPhotoItems = [];
  let count = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    if (!p.image_url) {
      count++;
      // sample every 300th null item to get a uniform spread across all 35k
      if (count % 350 === 0) {
        nullPhotoItems.push({ name: p.name, ean: p.ean, url: p.source_url, category: p.category });
      }
      if (nullPhotoItems.length >= 50) break;
    }
  }

  console.log(`Diagnosing ${nullPhotoItems.length} sample items that ended up with null image_url...\n`);

  let genuinelyEmptySvg = 0;
  let hasRealPhotosInGallery = 0;
  let galleryTemplateMissing = 0;
  let droppedByProductIdFilter = 0;

  const failureExamples = [];

  for (let i = 0; i < nullPhotoItems.length; i++) {
    const item = nullPhotoItems[i];
    try {
      const res = await fetch(item.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const html = await res.text();

      // Check 1: Singular hero gallery template
      const galleryTemplateMatch = html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->([\s\S]*?)<!--\/\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->/i);
      if (!galleryTemplateMatch) {
        galleryTemplateMissing++;
        failureExamples.push({ reason: 'no_gallery_template', item, url: item.url });
        continue;
      }

      const galleryHtml = galleryTemplateMatch[1];

      // Check 2: empty_photo.svg
      const hasEmptySvg = galleryHtml.includes('empty_photo.svg');

      // Check 3: Raw image matches inside galleryHtml
      const allImgsInGallery = [...galleryHtml.matchAll(/(?:\/wa-data\/public\/shop\/products\/[^\s"']+\.(?:jpg|png|webp|jpeg))/gi)]
        .map(m => m[0].startsWith('http') ? m[0] : 'https://semeiniy.kz' + m[0]);
      const uniqueRaw = [...new Set(allImgsInGallery)];

      // Check 4: Product ID filter
      const idMatch = html.match(/data-product-id=["'](\d+)["']/i) || html.match(/id=["']product-form-(\d+)["']/i) || html.match(/s-product-(\d+)/i);
      const productId = idMatch ? idMatch[1] : null;

      let filtered = uniqueRaw;
      if (productId && filtered.length > 0) {
        filtered = filtered.filter(img => img.includes(`/${productId}/`));
      }

      if (uniqueRaw.length > 0 && filtered.length === 0) {
        droppedByProductIdFilter++;
        failureExamples.push({
          reason: 'dropped_by_product_id_filter',
          item,
          productId,
          uniqueRaw,
          url: item.url
        });
      } else if (hasEmptySvg && uniqueRaw.length === 0) {
        genuinelyEmptySvg++;
      } else if (uniqueRaw.length > 0) {
        hasRealPhotosInGallery++;
        failureExamples.push({
          reason: 'had_photos_why_null',
          item,
          hasEmptySvg,
          uniqueRaw,
          filtered,
          url: item.url
        });
      } else {
        genuinelyEmptySvg++;
      }
    } catch (e) {
      console.error(`Error fetching ${item.url}:`, e.message);
    }
    process.stdout.write(`\rTested: ${i + 1}/${nullPhotoItems.length}...`);
  }

  console.log('\n\n====================================================');
  console.log('DIAGNOSTIC RESULTS ON 50 "NULL PHOTO" ITEMS:');
  console.log('====================================================');
  console.log(`Genuinely empty_photo.svg on site: ${genuinelyEmptySvg} (${((genuinelyEmptySvg / nullPhotoItems.length) * 100).toFixed(1)}%)`);
  console.log(`Had real photos in gallery on site: ${hasRealPhotosInGallery}`);
  console.log(`Dropped by productId filter bug: ${droppedByProductIdFilter}`);
  console.log(`Gallery template comment was missing: ${galleryTemplateMissing}`);

  if (failureExamples.length > 0) {
    console.log('\n--- DETECTED BUGS / FAILURES: ---');
    failureExamples.forEach((f, idx) => {
      console.log(`\n[#${idx + 1}] Reason: ${f.reason}`);
      console.log(`    Name: ${f.item.name}`);
      console.log(`    URL: ${f.url}`);
      if (f.uniqueRaw) console.log(`    Raw Images in gallery:`, f.uniqueRaw);
      if (f.productId) console.log(`    Extracted productId: ${f.productId}`);
    });
  }
}

diagnoseNullPhotos().catch(console.error);
