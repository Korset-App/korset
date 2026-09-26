import fs from 'fs';
import readline from 'readline';

const MASTER_PATH = 'data/korset_master_catalog_v4_final.jsonl';
const SULTAN_PATH = 'data/sultan_official_catalog.json';
const SAVUSHKIN_PATH = 'data/savushkin_official_catalog.json';
const UVELKA_PATH = 'data/uvelka_official_catalog.json';

const sultanItems = fs.existsSync(SULTAN_PATH) ? JSON.parse(fs.readFileSync(SULTAN_PATH, 'utf8')) : [];
const savushkinItems = fs.existsSync(SAVUSHKIN_PATH) ? JSON.parse(fs.readFileSync(SAVUSHKIN_PATH, 'utf8')) : [];
const uvelkaItems = fs.existsSync(UVELKA_PATH) ? JSON.parse(fs.readFileSync(UVELKA_PATH, 'utf8')) : [];

console.log(`Loaded ${sultanItems.length} Sultan, ${savushkinItems.length} Savushkin, ${uvelkaItems.length} Uvelka items.`);

// Check homoglyphs in Sultan
for (const s of sultanItems.slice(0, 10)) {
  const firstChar = s.title.charCodeAt(0);
  const isLatin = (firstChar >= 65 && firstChar <= 90) || (firstChar >= 97 && firstChar <= 122);
  console.log(`Sultan item: "${s.title}" -> First char code: ${firstChar} (isLatin: ${isLatin})`);
}

const masterRl = readline.createInterface({
  input: fs.createReadStream(MASTER_PATH),
  crlfDelay: Infinity
});

const sultanMaster = [];
const savushkinMaster = [];
const uvelkaMaster = [];

for await (const line of masterRl) {
  if (!line.trim()) continue;
  const p = JSON.parse(line);
  const name = (p.name || '').toLowerCase();
  const brand = (p.brand || '').toLowerCase();
  const hasPhoto = p.image_url && !p.image_url.includes('empty_photo') && !p.image_url.includes('no-photo');
  const needsKbju = !p.nutriments_json || Object.keys(p.nutriments_json).length === 0;

  if (name.includes('султан') || brand.includes('султан') || name.includes('sultan')) {
    sultanMaster.push({ p, hasPhoto, needsKbju });
  }
  if (name.includes('савушкин') || brand.includes('савушкин') || name.includes('теос') || name.includes('teos') || name.includes('брест-литовск')) {
    savushkinMaster.push({ p, hasPhoto, needsKbju });
  }
  if (name.includes('увелк') || brand.includes('увелк') || name.includes('uvelka')) {
    uvelkaMaster.push({ p, hasPhoto, needsKbju });
  }
}

console.log('\n--- Master Catalog Items Count ---');
console.log(`Sultan in Master: ${sultanMaster.length} (Needing KBJU: ${sultanMaster.filter(x => x.needsKbju).length})`);
console.log(`Savushkin/Teos in Master: ${savushkinMaster.length} (Needing KBJU: ${savushkinMaster.filter(x => x.needsKbju).length})`);
console.log(`Uvelka in Master: ${uvelkaMaster.length} (Needing KBJU: ${uvelkaMaster.filter(x => x.needsKbju).length})`);

console.log('\n--- SULTAN ITEMS IN MASTER NEEDING KBJU (All of them) ---');
sultanMaster.filter(x => x.needsKbju).forEach((item, i) => {
  console.log(`${i+1}. [${item.p.ean}] "${item.p.name}" (brand: ${item.p.brand})`);
});
