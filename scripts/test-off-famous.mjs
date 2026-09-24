import fs from 'fs';
import readline from 'readline';

async function testOff() {
  const rl = readline.createInterface({
    input: fs.createReadStream('data/korset_master_catalog_v4_final.jsonl'),
    crlfDelay: Infinity
  });

  let tested = 0;
  let found = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    // test items that are famous brands: Coca-Cola, Lay's, Snickers, Danone, Nestle, etc.
    const isFamous = /coca-cola|pepsi|lay'?s|snickers|bounty|kitkat|danone|jacobs|nescafe|kinder/i.test(p.name);
    if (isFamous) {
      tested++;
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${p.ean}.json`, {
          headers: { 'User-Agent': 'KorsetCatalogEngine - Version 2.0 (info@korset.kz)' }
        });
        if (res.ok) {
          const j = await res.json();
          if (j.status === 1) {
            found++;
            console.log(`FOUND in OFF: [${p.ean}] ${p.name} -> Nutriscore: ${j.product?.nutriscore_grade}, Brand: ${j.product?.brands}`);
          } else {
            console.log(`Not in OFF (status ${j.status}): [${p.ean}] ${p.name}`);
          }
        } else {
          console.log(`HTTP ${res.status}: [${p.ean}] ${p.name}`);
        }
      } catch (e) {
        console.log(`Error: ${e.message}`);
      }
      if (tested >= 10) break;
    }
  }
  console.log(`Tested ${tested}, Found ${found}`);
}

testOff();
