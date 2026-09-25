import fs from 'fs';

async function checkSitemapDistribution() {
  const allUrls = JSON.parse(fs.readFileSync('data/semeiniy_product_urls.json', 'utf8'));
  const testResults = JSON.parse(fs.readFileSync('data/semeiniy_200_test_results.json', 'utf8'));

  const urlIndices = new Map();
  allUrls.forEach((u, i) => urlIndices.set(u, i));

  const withPhotoIndices = [];
  const emptyIndices = [];

  for (const r of testResults) {
    const idx = urlIndices.get(r.url);
    if (r.images && r.images.length > 0) withPhotoIndices.push(idx);
    if (r.hasEmptySvg) emptyIndices.push(idx);
  }

  const avgPhotoIdx = withPhotoIndices.reduce((a, b) => a + b, 0) / withPhotoIndices.length;
  const avgEmptyIdx = emptyIndices.reduce((a, b) => a + b, 0) / emptyIndices.length;

  console.log(`With photo: count=${withPhotoIndices.length}, avg index in sitemap=${Math.round(avgPhotoIdx)}`);
  console.log(`Empty photo: count=${emptyIndices.length}, avg index in sitemap=${Math.round(avgEmptyIdx)}`);

  // Let's also check the two user URLs index in sitemap
  const u1 = 'https://semeiniy.kz/chechevitsa-gudvill-700gr-m-u/';
  const u2 = 'https://semeiniy.kz/krupa-perlovaya-makfa-400gr-k-u/';
  console.log(`User URL 1 index in sitemap: ${urlIndices.get(u1)}`);
  console.log(`User URL 2 index in sitemap: ${urlIndices.get(u2)}`);
}

checkSitemapDistribution().catch(console.error);
