import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const RAKHAT_PATH = path.join(__dirname, '..', 'data', 'rakhat_official_catalog.json');
const BAYAN_PATH = path.join(__dirname, '..', 'data', 'bayansulu_official_catalog.json');
const OUT_LOG = path.join(__dirname, '..', 'data', 'kz_manufacturers_matches.jsonl');

function cleanWords(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[0-9]+([\,\.][0-9]+)?(гр|г|мл|л|кг|шт|%)/gi, ' ')
    .replace(/[^a-zа-я]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['рахат', 'rakhat', 'баян', 'сулу', 'bayan', 'sulu', 'для', 'без', 'под', 'вес', 'м/у', 'к/у', 'шоубокс', 'пэт', 'ст/б', 'ж/б'].includes(w));
}

function extractKeyFlavorTokens(name) {
  const words = cleanWords(name);
  const stopWords = new Set(['шоколад', 'конфеты', 'печенье', 'вафли', 'мармелад', 'карамель', 'набор', 'плитка', 'батончик', 'драже', 'молочный', 'темный', 'горький', 'белый', 'пористый', 'десертные', 'вкус', 'вкуса', 'вкусы']);
  return words.filter(w => !stopWords.has(w));
}

async function match() {
  console.log('--- Matching Official Kazakh Manufacturers (Rakhat & Bayan Sulu) ---');

  const rakhatItems = fs.existsSync(RAKHAT_PATH) ? JSON.parse(fs.readFileSync(RAKHAT_PATH, 'utf8')) : [];
  const bayanItems = fs.existsSync(BAYAN_PATH) ? JSON.parse(fs.readFileSync(BAYAN_PATH, 'utf8')) : [];

  console.log(`Loaded ${rakhatItems.length} Rakhat items and ${bayanItems.length} Bayan Sulu items.`);

  const validRakhat = rakhatItems.filter(r => r.nutriments && (r.nutriments.energy_kcal || r.nutriments.protein_100g));
  const validBayan = bayanItems.filter(b => b.nutriments && (b.nutriments.energy_kcal || b.nutriments.protein_100g));

  const masterRl = readline.createInterface({
    input: fs.createReadStream(MASTER_PATH),
    crlfDelay: Infinity
  });

  const matches = [];

  for await (const line of masterRl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    const hasPhoto = p.image_url && !p.image_url.includes('empty_photo') && !p.image_url.includes('no-photo');
    const isFood = (p.category !== 'personal_care' && p.category !== 'household');
    const needsKbju = !p.nutriments_json || Object.keys(p.nutriments_json).length === 0;

    if (!hasPhoto || !isFood || !needsKbju) continue;

    const isRakhat = /рахат|rakhat/i.test(p.name) || /рахат|rakhat/i.test(p.brand || '');
    const isBayan = /баян\s*сулу|bayan\s*sulu/i.test(p.name) || /баян\s*сулу|bayan\s*sulu/i.test(p.brand || '');

    if (isRakhat) {
      const pFlavor = extractKeyFlavorTokens(p.name);
      let best = null;
      let bestScore = 0;

      for (const r of validRakhat) {
        const rTitleClean = r.title.toLowerCase();
        // If master has flavor tokens, they must be found in candidate title
        if (pFlavor.length > 0) {
          const matchAll = pFlavor.every(pf => rTitleClean.includes(pf));
          if (!matchAll) continue;
        }

        const mW = cleanWords(p.name);
        const rW = cleanWords(r.title);
        let inter = 0;
        for (const w of mW) if (rW.includes(w)) inter++;
        const score = inter / Math.max(1, new Set([...mW, ...rW]).size);

        if (score > bestScore) {
          bestScore = score;
          best = r;
        }
      }

      if (best && bestScore >= 0.4) {
        matches.push({
          masterId: p.id,
          masterEan: p.ean,
          masterName: p.name,
          brand: 'Рахат',
          manufacturerTitle: best.title,
          url: best.url,
          score: bestScore.toFixed(2),
          nutriments: best.nutriments,
          composition: best.composition
        });
      }
    } else if (isBayan) {
      const pFlavor = extractKeyFlavorTokens(p.name);
      let best = null;
      let bestScore = 0;

      for (const b of validBayan) {
        const slug = b.url.split('/').filter(Boolean).pop().toLowerCase();
        const bText = (b.title + ' ' + slug + ' ' + (b.description || '')).toLowerCase();

        if (pFlavor.length > 0) {
          const matchAll = pFlavor.every(pf => bText.includes(pf));
          if (!matchAll) continue;
        }

        const mW = cleanWords(p.name);
        const bW = cleanWords(b.title + ' ' + slug);
        let inter = 0;
        for (const w of mW) if (bW.includes(w)) inter++;
        const score = inter / Math.max(1, new Set([...mW, ...bW]).size);

        if (score > bestScore) {
          bestScore = score;
          best = b;
        }
      }

      if (best && bestScore >= 0.35) {
        matches.push({
          masterId: p.id,
          masterEan: p.ean,
          masterName: p.name,
          brand: 'Баян Сулу',
          manufacturerTitle: best.title,
          url: best.url,
          score: bestScore.toFixed(2),
          nutriments: best.nutriments,
          composition: null
        });
      }
    }
  }

  console.log(`Found ${matches.length} strict, verified matches from official manufacturer catalogs!`);
  fs.writeFileSync(OUT_LOG, matches.map(m => JSON.stringify(m)).join('\n') + '\n');
  console.log(`Saved matches to ${OUT_LOG}`);
  console.log('Sample matches:', JSON.stringify(matches.slice(0, 10), null, 2));
}

match().catch(console.error);
