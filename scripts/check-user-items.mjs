import fs from 'fs';

async function checkUserItems() {
  const urls = [
    'https://semeiniy.kz/chechevitsa-gudvill-700gr-m-u/',
    'https://semeiniy.kz/krupa-perlovaya-makfa-400gr-k-u/'
  ];

  // 1. Check if they were in the 200 test results
  const testResults = JSON.parse(fs.readFileSync('data/semeiniy_200_test_results.json', 'utf8'));
  for (const u of urls) {
    const foundInTest = testResults.find(r => r.url === u);
    console.log(`\n========================================`);
    console.log(`URL: ${u}`);
    console.log(`Was in 200-sample test? ${foundInTest ? 'YES' : 'NO'}`);
    if (foundInTest) {
      console.log(`  Test result data:`, {
        title: foundInTest.title,
        ean: foundInTest.ean,
        hasEmptySvg: foundInTest.hasEmptySvg,
        images: foundInTest.images
      });
    }

    // 2. Fetch live page HTML and inspect
    try {
      const res = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        }
      });
      const html = await res.text();
      console.log(`Live HTTP Status: ${res.status}, HTML length: ${html.length}`);

      // Check stock status on page
      console.log(`Contains 'Нет в наличии': ${html.includes('Нет в наличии')}`);

      // Check singular hero gallery template
      const singularMatch = html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->([\s\S]*?)<!--\/\s*app:\s*shop;\s*template:\s*html\/product\/images\s*-->/i);
      console.log(`Singular template found: ${!!singularMatch}`);

      if (singularMatch) {
        const gallery = singularMatch[1];
        console.log(`Gallery has empty_photo.svg: ${gallery.includes('empty_photo.svg')}`);

        // Extract all images
        const imgs = [...gallery.matchAll(/(?:\/wa-data\/public\/shop\/products\/[^\s"']+\.(?:700|970|original|[0-9]+)\.[a-z0-9]+)/gi)]
          .map(m => m[0].startsWith('http') ? m[0] : 'https://semeiniy.kz' + m[0]);
        console.log(`Images found in hero gallery (${[...new Set(imgs)].length}):`, [...new Set(imgs)]);
        console.log(`Gallery HTML snippet:`, gallery.slice(0, 350));
      } else {
        console.log('NO SINGULAR TEMPLATE MATCH!');
      }
    } catch (e) {
      console.error('Fetch error:', e.message);
    }
  }
}

checkUserItems().catch(console.error);
