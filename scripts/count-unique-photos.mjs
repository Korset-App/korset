import fs from 'fs';
import readline from 'readline';

async function countUniquePhotos() {
  const rl = readline.createInterface({
    input: fs.createReadStream('data/semeiniy_raw_products.jsonl'),
    crlfDelay: Infinity
  });

  const photoCounts = new Map();
  let total = 0;
  let hasPhoto = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    const p = JSON.parse(line);
    if (p.image_url) {
      hasPhoto++;
      photoCounts.set(p.image_url, (photoCounts.get(p.image_url) || 0) + 1);
    }
  }

  console.log(`Total products: ${total}`);
  console.log(`Total with image_url: ${hasPhoto}`);
  console.log(`Unique image URLs: ${photoCounts.size}`);

  // Sort by frequency
  const sorted = [...photoCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nTop 10 most duplicated images (carousel duplicates):');
  sorted.slice(0, 10).forEach(([url, count], i) => {
    console.log(` [${i + 1}] Used on ${count} products: ${url}`);
  });

  // Count images used on only 1 or 2 products (genuine unique product packshots)
  const genuineUnique = sorted.filter(([url, count]) => count <= 3);
  console.log(`\nDistinct genuine packshots (used on <= 3 variants/SKUs): ${genuineUnique.length}`);
}

countUniquePhotos().catch(console.error);
