import fs from 'fs';
import readline from 'readline';

async function auditRawProducts() {
  const rl = readline.createInterface({
    input: fs.createReadStream('data/semeiniy_raw_products.jsonl'),
    crlfDelay: Infinity
  });

  let total = 0;
  let withAnyPhoto = 0;
  let withOwnPhoto = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    const p = JSON.parse(line);
    if (p.image_url) {
      withAnyPhoto++;
      // extract product ID from source_url or image_url
      // in Webasyst, image path is /products/XX/YY/{id}/images/...
      const imgMatch = p.image_url.match(/\/products\/\d+\/\d+\/(\d+)\/images\//);
      const imgProdId = imgMatch ? imgMatch[1] : null;
      // In the scraped item, was there an ID?
      // Let's check if the image was repeated across many products (like 7606 muesli bar)
      // Muesli bar was /products/27/78/67827/ or similar
    }
  }

  console.log(`Total in raw products: ${total}`);
  console.log(`With any photo: ${withAnyPhoto}`);
}

auditRawProducts().catch(console.error);
