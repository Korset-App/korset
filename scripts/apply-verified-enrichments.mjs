import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const TEMP_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.tmp.jsonl');

const SOURCES = [
  { name: 'Kazakhstan Manufacturers (Rakhat, Bayan Sulu)', file: 'data/kz_manufacturers_matches.jsonl', key: 'masterEan' },
  { name: 'Sultan & Savushkin Official', file: 'data/sultan_savushkin_matches.jsonl', key: 'masterEan' },
  { name: 'Uvelka Official', file: 'data/uvelka_matches.jsonl', key: 'masterEan' },
  { name: 'Babushkino Lukoshko Official', file: 'data/babluk_matches.jsonl', key: 'masterEan' },
  { name: 'FrutoNyanya Official', file: 'data/frutonyanya_matches.jsonl', key: 'masterEan' },
  { name: 'Makfa Official', file: 'data/makfa_matches.jsonl', key: 'masterEan' },
  { name: 'Agusha Official', file: 'data/agusha_matches.jsonl', key: 'masterEan' },
  { name: 'Korzina v Dom Zero-Mixup Verified', file: 'data/korzina_matches.jsonl', key: 'masterEan' },
  { name: 'Open Food Facts Barcodes', file: 'data/off_enrichment_log.jsonl', key: 'ean' }
];

async function main() {
  console.log('=== Applying All Verified Zero-Mixup Enrichments to Master Catalog V4 ===');

  // Load all match maps
  const matchMaps = [];
  for (const src of SOURCES) {
    const fullPath = path.join(__dirname, '..', src.file);
    const map = new Map();
    if (fs.existsSync(fullPath)) {
      const rl = readline.createInterface({ input: fs.createReadStream(fullPath), crlfDelay: Infinity });
      for await (const line of rl) {
        if (!line.trim()) continue;
        const m = JSON.parse(line);
        const barcode = m[src.key] || m.masterEan || m.ean;
        if (barcode) {
          map.set(barcode, m);
        }
      }
    }
    console.log(`Loaded ${map.size} matches from [${src.name}].`);
    matchMaps.push({ name: src.name, map });
  }

  const masterRl = readline.createInterface({ input: fs.createReadStream(MASTER_PATH), crlfDelay: Infinity });
  const out = fs.createWriteStream(TEMP_PATH, { flags: 'w' });

  let total = 0;
  let withPhoto = 0;
  let kbjuEnriched = 0;
  let ingEnriched = 0;
  const enrichedBySource = {};

  for await (const line of masterRl) {
    if (!line.trim()) continue;
    total++;
    const p = JSON.parse(line);
    const hasPhoto = (p.image_url && p.image_url.length > 5) || (p.images && p.images.length > 0);
    if (hasPhoto) withPhoto++;

    const hasKbju = p.nutriments_json && typeof p.nutriments_json === 'object' && Object.keys(p.nutriments_json).length >= 3;
    const hasIng = p.ingredients_raw && p.ingredients_raw.trim().length > 5;

    // Check sources in strict priority order
    for (const { name, map } of matchMaps) {
      const m = map.get(p.ean);
      if (m) {
        const nutriments = m.nutriments || m.nutriments_json;
        const composition = m.composition || m.ingredients_raw;

        let applied = false;
        if (!hasKbju && nutriments && Object.keys(nutriments).length >= 3) {
          // Physical feasibility sanity check: P + F + C <= 105
          const prot = nutriments.protein_100g || nutriments.proteins || 0;
          const fat = nutriments.fat_100g || nutriments.fat || 0;
          const carb = nutriments.carbohydrates_100g || nutriments.carbs || 0;
          if (prot + fat + carb <= 105) {
            p.nutriments_json = {
              energy_kcal: nutriments.energy_kcal != null ? nutriments.energy_kcal : nutriments.calories,
              protein_100g: prot,
              fat_100g: fat,
              carbohydrates_100g: carb
            };
            kbjuEnriched++;
            applied = true;
          }
        }

        if (!hasIng && composition && composition.trim().length > 5) {
          p.ingredients_raw = composition.trim();
          ingEnriched++;
          applied = true;
        }

        if (applied) {
          enrichedBySource[name] = (enrichedBySource[name] || 0) + 1;
          break; // Higher priority source applied, don't check lower priority sources
        }
      }
    }

    out.write(JSON.stringify(p) + '\n');
  }

  out.end();
  await new Promise(r => out.on('finish', r));

  console.log('\n--- Verification of Invariants ---');
  console.log(`Total records: ${total} (expected 58643)`);
  console.log(`Studio photos: ${withPhoto} (expected 23112)`);
  console.log(`KBJU newly enriched: ${kbjuEnriched}`);
  console.log(`Ingredients newly enriched: ${ingEnriched}`);
  console.log('Enrichments by source:', enrichedBySource);

  if (total === 58643 && withPhoto === 23112) {
    fs.renameSync(TEMP_PATH, MASTER_PATH);
    console.log('SUCCESS: Invariants verified 100%! Master catalog safely updated.');
  } else {
    console.error('FATAL ERROR: Invariant violated! Temp file discarded. Master untouched.');
    fs.unlinkSync(TEMP_PATH);
  }
}

main().catch(console.error);
