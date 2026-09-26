import fs from 'fs';
import readline from 'readline';

const sampleEans = [
  '4606779203503',
  '4607022662320',
  '4607014821223',
  '4607004892691',
  '4870003753403',
  '4870144004020',
  '4870001421946',
  '4870001420758',
  '4810411012365',
  '4623722258427',
  '4620001505661',
  '4640011981545',
  '9002859125966',
  '4610085951713',
  '4870206556757',
  '4870203750561',
  '745314505598',
  '4810168000998',
  '4870242610123',
  '4870243590080',
  '764460224245',
  '4810168045906',
  '4870248140594',
  '4600494665554',
  '3800233070101',
  '745125940625',
  '4627129930153',
  '4870208390045',
  '4005292015226'
];

async function checkMasterMatches() {
  const eanSet = new Set(sampleEans);
  const found = new Map();

  const rl = readline.createInterface({ input: fs.createReadStream('data/korset_master_catalog_v4_final.jsonl') });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    if (eanSet.has(p.ean)) {
      found.set(p.ean, p);
    }
  }

  console.log(`Matched ${found.size} out of ${sampleEans.length} (${Math.round(found.size / sampleEans.length * 100)}%) directly by EAN!`);
  for (const [ean, p] of found.entries()) {
    console.log(`  MATCH: ${ean} -> "${p.name}" | photo: ${Boolean(p.image_url)} | has_ingredients: ${Boolean(p.ingredients_raw)}`);
  }
}

checkMasterMatches().catch(console.error);
