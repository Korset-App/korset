import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const TEMP_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.tmp.jsonl');
const LOG_PATH = path.join(__dirname, '..', 'data', 'off_enrichment_log.jsonl');

async function applyMatches() {
  if (!fs.existsSync(LOG_PATH)) {
    console.log('No matches log found:', LOG_PATH);
    return;
  }

  // Load matches by EAN and ID
  const matchesByEan = new Map();
  const logRl = readline.createInterface({
    input: fs.createReadStream(LOG_PATH),
    crlfDelay: Infinity
  });

  for await (const line of logRl) {
    if (!line.trim()) continue;
    const m = JSON.parse(line);
    if (m.ean && m.nutriments_json) {
      matchesByEan.set(m.ean, m);
    }
  }

  console.log(`Loaded ${matchesByEan.size} verified OFF matches.`);
  if (matchesByEan.size === 0) return;

  const masterRl = readline.createInterface({
    input: fs.createReadStream(MASTER_PATH),
    crlfDelay: Infinity
  });

  const outStream = fs.createWriteStream(TEMP_PATH, { flags: 'w' });

  let total = 0;
  let enrichedKbju = 0;
  let enrichedIng = 0;

  for await (const line of masterRl) {
    if (!line.trim()) continue;
    total++;
    const p = JSON.parse(line);
    const m = matchesByEan.get(p.ean);

    if (m) {
      // Check if p lacks KBJU
      const pHasKbju = p.nutriments_json && typeof p.nutriments_json === 'object' && Object.keys(p.nutriments_json).length > 0;
      if (!pHasKbju && m.nutriments_json && Object.keys(m.nutriments_json).length > 0) {
        p.nutriments_json = m.nutriments_json;
        enrichedKbju++;
      }

      // Check if p lacks ingredients and m has them
      const pHasIng = p.ingredients_raw && p.ingredients_raw.trim().length > 3;
      if (!pHasIng && m.ingredients_raw && m.ingredients_raw.trim().length > 5) {
        p.ingredients_raw = m.ingredients_raw;
        enrichedIng++;
      }

      if (m.nutriscore && !p.nutriscore) {
        p.nutriscore = m.nutriscore;
      }
    }

    outStream.write(JSON.stringify(p) + '\n');
  }

  outStream.end();
  await new Promise(r => outStream.on('finish', r));

  console.log(`Master records processed: ${total}`);
  console.log(`Enriched KBJU: ${enrichedKbju}`);
  console.log(`Enriched Ingredients: ${enrichedIng}`);

  // Invariant verification: must have exactly 58643 lines
  if (total === 58643) {
    fs.renameSync(TEMP_PATH, MASTER_PATH);
    console.log('Successfully updated master catalog!');
  } else {
    console.error(`FATAL: Invariant violated! Expected 58643 lines, got ${total}. Master catalog NOT modified.`);
    fs.unlinkSync(TEMP_PATH);
  }
}

applyMatches().catch(console.error);
