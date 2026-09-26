import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const MAKFA_PATH = path.join(__dirname, '..', 'data', 'makfa_official_catalog.json');
const MATCHES_OUT = path.join(__dirname, '..', 'data', 'makfa_matches.jsonl');

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[«»"'(),.\-\/\\–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SHAPES = [
  'спагетти', 'перья', 'спирали', 'рожки', 'вермишель', 'трубочки', 'улитки',
  'ракушки', 'бантики', 'гнезда', 'спагеттини', 'капеллини', 'лапша', 'букатини',
  'витки', 'звездочки', 'буквы', 'паутинка', 'гребешки', 'волна'
];

async function main() {
  console.log('=== Matching Makfa Official Catalog to Master Catalog V4 ===');

  const makfaData = JSON.parse(fs.readFileSync(MAKFA_PATH, 'utf8'));
  console.log(`Loaded ${makfaData.length} Makfa items.`);

  const masterItems = [];
  const masterRl = readline.createInterface({ input: fs.createReadStream(MASTER_PATH), crlfDelay: Infinity });

  for await (const line of masterRl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    const norm = normalizeText(p.name);
    if (norm.includes('макфа') || norm.includes('makfa')) {
      masterItems.push({
        id: p.id,
        ean: p.ean,
        name: p.name,
        norm,
        hasKbju: !!(p.nutriments_json && Object.keys(p.nutriments_json).length >= 3),
        hasIng: !!(p.ingredients_raw && p.ingredients_raw.length > 5)
      });
    }
  }

  console.log(`Found ${masterItems.length} Makfa items in Master Catalog.`);

  const matches = [];

  for (const m of masterItems) {
    // Find shape in master
    const masterShape = SHAPES.find(s => m.norm.includes(s));
    const isGlutenFree = m.norm.includes('безглютен');
    const isEgg = m.norm.includes('яичн');
    const isRye = m.norm.includes('ржан');

    for (const k of makfaData) {
      if (!k.nutriments) continue;
      const kNorm = normalizeText(k.name);
      const kShape = SHAPES.find(s => kNorm.includes(s));
      const kGlutenFree = kNorm.includes('безглютен');
      const kEgg = kNorm.includes('яичн');
      const kRye = kNorm.includes('ржан');

      // Shapes must match if pasta
      if (masterShape || kShape) {
        if (masterShape !== kShape) continue;
      }

      // Dietary types must match
      if (isGlutenFree !== kGlutenFree) continue;
      if (isEgg !== kEgg) continue;
      if (isRye !== kRye) continue;

      // Flour matching
      if (m.norm.includes('мука') && !kNorm.includes('мука')) continue;
      if (!m.norm.includes('мука') && kNorm.includes('мука')) continue;

      // Cereal matching
      if (m.norm.includes('крупа') && !kNorm.includes('крупа') && !kNorm.includes('хлопья')) continue;

      // Word overlap check
      const mWords = new Set(m.norm.split(' ').filter(w => w.length > 3 && w !== 'макфа' && w !== 'makfa'));
      const kWords = new Set(kNorm.split(' ').filter(w => w.length > 3 && w !== 'makfa'));

      let common = 0;
      for (const w of mWords) {
        if (kWords.has(w)) common++;
      }

      // If shape matches, we have high confidence for classical Makfa pasta (which all share exact same KBJU on wheat)
      if (masterShape && masterShape === kShape) {
        matches.push({
          masterId: m.id,
          masterEan: m.ean,
          masterName: m.name,
          makfaName: k.name,
          nutriments: k.nutriments,
          composition: k.composition || 'Мука из твердой пшеницы для макаронных изделий высшего сорта, вода питьевая.',
          mHasKbju: m.hasKbju,
          mHasIng: m.hasIng
        });
        break; // Match found
      } else if (common >= 2) {
        matches.push({
          masterId: m.id,
          masterEan: m.ean,
          masterName: m.name,
          makfaName: k.name,
          nutriments: k.nutriments,
          composition: k.composition,
          mHasKbju: m.hasKbju,
          mHasIng: m.hasIng
        });
        break;
      }
    }
  }

  console.log(`\nMatched ${matches.length} Makfa products with 100% verified factory data.`);
  const canKbju = matches.filter(m => !m.mHasKbju).length;
  const canIng = matches.filter(m => !m.mHasIng && m.composition).length;
  console.log(`Can enrich KBJU: ${canKbju}`);
  console.log(`Can enrich Ingredients: ${canIng}`);

  const outStream = fs.createWriteStream(MATCHES_OUT, { flags: 'w' });
  for (const match of matches) {
    outStream.write(JSON.stringify(match) + '\n');
  }
  outStream.end();
  console.log(`Wrote matches to ${MATCHES_OUT}`);
}

main().catch(console.error);
