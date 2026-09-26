import fs from 'fs';
import readline from 'readline';
import {
  cleanTokens,
  extractNormalizedWeight,
  extractFatPercent,
  InvertedIndex
} from './utils/retail-tokenizer.mjs';

async function testPhase2Index() {
  console.log('Loading Korzina v Dom full catalog (9,297 items)...');
  const korzinaData = JSON.parse(fs.readFileSync('data/korzinavdom_catalog_full.json', 'utf8'));
  const index = new InvertedIndex();

  for (const k of korzinaData) {
    const cleanT = cleanTokens(k.productName);
    if (cleanT.length === 0) continue;
    index.addDonor({
      source: 'korzinavdom',
      id: k.quantumNumber,
      name: k.productName,
      brand: k.brand,
      weight: extractNormalizedWeight(k.productName),
      fatPercent: extractFatPercent(k.productName),
      cleanTokens: cleanT,
      ingredients: k.composition,
      storage: k.storageConditions,
      shelfLife: k.shelfLife
    });
  }
  console.log(`Indexed ${korzinaData.length} items from Korzina into InvertedIndex.`);

  // Test search against Master Catalog (first 1,000 items)
  const rl = readline.createInterface({ input: fs.createReadStream('data/korset_master_catalog_v4_final.jsonl') });
  let count = 0;
  let candidatesFound = 0;

  console.log('\nSearching top candidates for first 1,000 Master items...');
  for await (const line of rl) {
    if (!line.trim()) continue;
    count++;
    if (count > 1000) break;

    const m = JSON.parse(line);
    const missingIng = !m.ingredients_raw || m.ingredients_raw.length < 5;
    if (!missingIng) continue;

    const masterTokens = cleanTokens(m.name);
    if (masterTokens.length < 2) continue;

    const masterWeight = extractNormalizedWeight(m.name);
    const masterFat = extractFatPercent(m.name);

    const candidates = index.search(masterTokens, masterWeight, masterFat, 1);
    if (candidates.length > 0 && candidates[0].score >= 0.70) {
      candidatesFound++;
      if (candidatesFound <= 10) {
        console.log(`[Candidate #${candidatesFound}] score: ${candidates[0].score.toFixed(3)} | jaccard: ${candidates[0].jaccard.toFixed(3)}`);
        console.log(`  Master: "${m.name}"`);
        console.log(`  Donor:  "${candidates[0].donor.name}"`);
        console.log(`  Donor Ingredients: ${(candidates[0].donor.ingredients || '').slice(0, 70)}...\n`);
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Master items scanned: ${count}`);
  console.log(`High-confidence candidates found: ${candidatesFound} (${(candidatesFound / count * 100).toFixed(1)}% of items)`);
}

testPhase2Index().catch(console.error);
