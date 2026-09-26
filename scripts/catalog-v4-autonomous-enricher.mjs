/**
 * Autonomous Overnight AI Consensus Enricher for Körset Golden Master V4
 * Runs continuously, safely enriching products with AI verification.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import {
  cleanTokens,
  extractNormalizedWeight,
  extractFatPercent,
  areWeightsCompatible,
  normalizeKazakhChars
} from './utils/retail-tokenizer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.backup.jsonl');
const ARBUZ_PATH = path.join(__dirname, '..', 'data', 'arbuz_enriched_catalog.jsonl');
const KORZINA_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog_full.json');
const CLEAN_V2_PATH = path.join(__dirname, '..', 'data', 'clean_catalog_v2.jsonl');
const AGG_V3_PATH = path.join(__dirname, '..', 'data', 'v3_cache', 'aggregated_catalog_v3.json');
const GLOBAL_ARCHIVE_PATH = path.join(__dirname, '..', 'data', 'archive', 'global_products_2026-09-24.jsonl.gz');
const MATCHES_LOG_PATH = path.join(__dirname, '..', 'data', 'enrichment_matches.jsonl');

// Load API Keys
let dsKey = null;
if (fs.existsSync(path.join(__dirname, '..', '.env.local'))) {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  dsKey = env.match(/OPENAI_API_KEY=["']?([^"'\r\n]+)/)?.[1] ||
          env.match(/DEEPSEEK_API_KEY=["']?([^"'\r\n]+)/)?.[1];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function stemFMCG(token) {
  if (!token || token.length < 3) return token;
  let t = token.toLowerCase();
  if (t.startsWith('клубнич') || t.startsWith('клубник')) return 'клубник';
  if (t.startsWith('молоч') || t.startsWith('молок')) return 'молок';
  if (t.startsWith('сливоч') || t.startsWith('сливк')) return 'сливк';
  if (t.startsWith('шоколад')) return 'шоколад';
  if (t.startsWith('курин') || t.startsWith('куриц') || t.startsWith('цыплен')) return 'куриц';
  if (t.startsWith('говяж') || t.startsWith('говяд')) return 'говяд';
  if (t.startsWith('свинин') || t.startsWith('свиной') || t.startsWith('свин')) return 'свин';
  if (t.startsWith('вишнев') || t.startsWith('вишн')) return 'вишн';
  if (t.startsWith('яблоч') || t.startsWith('яблок')) return 'яблок';
  if (t.startsWith('апельсин')) return 'апельсин';
  if (t.startsWith('лимон')) return 'лимон';
  if (t.startsWith('банан')) return 'банан';
  if (t.startsWith('малин')) return 'малин';
  if (t.startsWith('персик')) return 'персик';
  if (t.startsWith('абрикос')) return 'абрикос';
  if (t.startsWith('чернич') || t.startsWith('черник')) return 'черник';
  if (t.startsWith('землянич') || t.startsWith('земляник')) return 'земляник';
  if (t.startsWith('сырн') || t.startsWith('сыр')) return 'сыр';
  if (t.startsWith('творог') || t.startsWith('творож')) return 'творог';
  if (t.startsWith('сметан')) return 'сметан';
  if (t.startsWith('кефир')) return 'кефир';
  if (t.startsWith('йогурт')) return 'йогурт';
  if (t.startsWith('чесноч') || t.startsWith('чеснок')) return 'чеснок';
  if (t.startsWith('томат')) return 'томат';
  if (t.startsWith('укроп')) return 'укроп';
  if (t.startsWith('гриб')) return 'гриб';
  if (t.startsWith('пастериз')) return 'пастериз';
  if (t.startsWith('стериз')) return 'стериз';
  if (t.startsWith('газир')) return 'газир';
  if (t.startsWith('негазир')) return 'негазир';
  if (t.startsWith('кофейн') || t.startsWith('кофе')) return 'кофе';
  if (t.startsWith('чайн') || t.startsWith('чай')) return 'чай';
  if (t.startsWith('гречнев') || t.startsWith('гречк')) return 'гречк';
  if (t.startsWith('овсян')) return 'овсян';
  if (t.startsWith('рисовый') || t.startsWith('рис')) return 'рис';
  if (t.startsWith('пшенич')) return 'пшенич';
  if (t.startsWith('макарон')) return 'макарон';
  
  t = t.replace(/(ованный|еванный|анный|енный|тый|вший|ющий|емый)$/, '');
  t = t.replace(/(ический|еский|овский|евский|ский|цкий)$/, '');
  t = t.replace(/(ичный|ечный|очный|ный|ной|ная|ное|ные|ных|ным|ными)$/, '');
  t = t.replace(/(овый|евый|авый|явый|овая|евая|овое|евое|овые|евые|овых|евых)$/, '');
  t = t.replace(/(ячий|ячья|ячье|ячьи|иный|иная|иное|иные)$/, '');
  t = t.replace(/(ами|ями|ов|ев|ей|ом|ем|ам|ям|ах|ях)$/, '');
  t = t.replace(/(а|е|и|й|о|у|ы|ь|ю|я)$/, '');
  return t;
}

const BRAND_ALIASES = [
  ['milka', 'милка'], ['alpen gold', 'альпен гольд'], ['rakhat', 'рахат'],
  ['bayan sulu', 'баян сулу'], ['nestle', 'нестле'], ['kitkat', 'киткат'],
  ['snickers', 'сникерс'], ['mars', 'марс'], ['twix', 'твикс'], ['bounty', 'баунти'],
  ['danone', 'данон'], ['activia', 'активия'], ['danissimo', 'даниссимо'],
  ['chudo', 'чудо'], ['prostokvashino', 'простоквашино'], ['hochland', 'хохланд'],
  ['president', 'президент'], ['ferrero', 'ферреро'], ['raffaello', 'раффаэлло'],
  ['kinder', 'киндер'], ['nutella', 'нутелла'], ['lays', 'лейс'],
  ['cheetos', 'читос'], ['doritos', 'доритос'], ['pringles', 'принглс'],
  ['orbit', 'орбит'], ['dirol', 'дирол'], ['lipton', 'липтон'],
  ['greenfield', 'гринфилд'], ['tess', 'тесс'], ['curtis', 'кертис'],
  ['nescafe', 'нескафе'], ['jacobs', 'якобс'], ['maccoffee', 'маккофе'],
  ['dada', 'дада'], ['gracio', 'грасио'], ['piko', 'пико'], ['asar', 'асар'],
  ['samal', 'самал'], ['tassay', 'тассай'], ['borjomi', 'боржоми'],
  ['bonaqua', 'бонаква'], ['pepsi', 'пепси'], ['coca-cola', 'кока-кола'],
  ['makfa', 'макфа'], ['barilla', 'барилла'], ['sheba', 'шеба'],
  ['whiskas', 'вискас'], ['felix', 'феликс'], ['purina', 'пурина'],
  ['colgate', 'колгейт'], ['nivea', 'нивея'], ['fairy', 'фейри'],
  ['tide', 'тайд'], ['ariel', 'ариэль'], ['persil', 'персил']
];

const aliasMap = new Map();
for (const [a, b] of BRAND_ALIASES) {
  aliasMap.set(a, b);
  aliasMap.set(b, a);
}

function normalizeBrand(brand) {
  if (!brand) return '';
  let b = brand.toLowerCase().trim()
    .replace(/[«»""''`(),.:;!/?\\#№*+%_–—-]/g, '')
    .replace(/^(тоо|ип|ао|пк)\s+/g, '')
    .trim();
  if (aliasMap.has(b)) return aliasMap.get(b);
  return b;
}

function areBrandsCompatible(b1, b2) {
  if (!b1 || !b2) return false;
  const n1 = normalizeBrand(b1);
  const n2 = normalizeBrand(b2);
  if (n1 === n2) return true;
  if (aliasMap.get(n1) === n2 || aliasMap.get(n2) === n1) return true;
  if (n1.length >= 4 && n2.includes(n1)) return true;
  if (n2.length >= 4 && n1.includes(n2)) return true;
  return false;
}

async function verifyWithDeepSeek(pairs, retries = 3) {
  if (!dsKey) return pairs.map(p => ({ pairId: p.pairId, isMatch: false, rationale: 'No API key' }));

  const prompt = `You are a strict FMCG grocery product auditor in Kazakhstan.
Verify whether the Master product and the Donor product refer to the EXACT SAME physical retail grocery item sold on shelf.

Rules:
1. Brand must match 100% (e.g. Rakhat == Рахат, Hochland == Хохланд, Lactel == Лактель, Heinz == Heinz).
2. Recipe, sub-type, flavor must match 100% (e.g. Strawberry != Raspberry; Dark != Milk; Still != Sparkling; 2.5% fat != 3.2% fat; Pickled != Fresh; With sugar != Sugar-free).
3. Pack size / volume must match within retail packaging redesign tolerance (e.g. 100g != 200g; 1L != 0.5L).
4. Ignore retail packaging abbreviations (e.g. м/у, к/у, пэт, т/п, д/п, ж/б).

Pairs to audit:
${JSON.stringify(pairs, null, 2)}

Respond with JSON:
{
  "results": [
    {
      "pairId": number,
      "isMatch": boolean,
      "rationale": "short explanation in Russian"
    }
  ]
}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + dsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.0,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(25000)
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content);
        if (Array.isArray(parsed?.results)) return parsed.results;
        if (Array.isArray(parsed)) return parsed;
      } else if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * attempt);
        continue;
      }
    } catch (e) {
      if (attempt === retries) {
        return pairs.map(p => ({ pairId: p.pairId, isMatch: false, rationale: 'DeepSeek error: ' + e.message }));
      }
      await sleep(1500 * attempt);
    }
  }
  return pairs.map(p => ({ pairId: p.pairId, isMatch: false, rationale: 'Timeout' }));
}

export async function runAutonomousEnrichment({ maxPairs = 500, batchSize = 15 } = {}) {
  console.log(`\n======================================================`);
  console.log(`=== AUTONOMOUS OVERNIGHT AI CONSENSUS ENRICHER ===`);
  console.log(`=== Target: Max ${maxPairs} AI verified pairs | Batch Size: ${batchSize} ===`);
  console.log(`======================================================\n`);

  // Load Master
  console.log('Loading Master Catalog...');
  const masterRecords = [];
  const rlMaster = readline.createInterface({ input: fs.createReadStream(MASTER_PATH) });
  for await (const line of rlMaster) {
    if (line.trim()) masterRecords.push(JSON.parse(line));
  }
  console.log(`Master loaded: ${masterRecords.length}`);

  // Build Donor Index (Arbuz + Korzina + Clean V2 + Agg V3)
  console.log('Building Rich Donor Index...');
  const donors = [];
  const brandIndex = new Map(); // normalizedBrand -> array of donor objects

  function indexDonor(source, id, name, brand, ean, ing, nutr, storage, shelf, country, halal) {
    if (!ing && !nutr) return;
    const nBrand = normalizeBrand(brand);
    if (!nBrand || nBrand.length < 2) return;

    const donor = {
      source,
      id,
      name,
      brand,
      nBrand,
      ean,
      stems: cleanTokens(name).map(stemFMCG),
      weight: extractNormalizedWeight(name),
      fatPercent: extractFatPercent(name),
      ingredients_raw: ing,
      nutriments_json: nutr,
      storage_conditions: storage,
      shelf_life: shelf,
      country_of_origin: country,
      halal_status: halal
    };
    donors.push(donor);

    if (!brandIndex.has(nBrand)) brandIndex.set(nBrand, []);
    brandIndex.get(nBrand).push(donor);

    const alias = aliasMap.get(nBrand);
    if (alias) {
      if (!brandIndex.has(alias)) brandIndex.set(alias, []);
      brandIndex.get(alias).push(donor);
    }
  }

  // Load Arbuz
  if (fs.existsSync(ARBUZ_PATH)) {
    const rl = readline.createInterface({ input: fs.createReadStream(ARBUZ_PATH) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      const a = JSON.parse(line);
      indexDonor('arbuz', a.id, a.name, a.brand, a.ean || a.barcode, a.ingredients_raw, a.nutriments_json, a.storage_conditions, a.shelf_life_days ? `${a.shelf_life_days} дней` : null, a.producer_country, a.halal_status);
    }
  }

  // Load Korzina
  if (fs.existsSync(KORZINA_PATH)) {
    const korzina = JSON.parse(fs.readFileSync(KORZINA_PATH, 'utf8'));
    for (const k of korzina) {
      let nutr = null;
      if (Array.isArray(k.options)) {
        let kcal = null, p = null, f = null, c = null;
        for (const opt of k.options) {
          const on = opt.optionName?.toLowerCase() || '';
          if (opt.valueFloat == null) continue;
          if (on.includes('энергетическая') || on.includes('ккал')) kcal = opt.valueFloat;
          else if (on.includes('белки')) p = opt.valueFloat;
          else if (on.includes('жиры')) f = opt.valueFloat;
          else if (on.includes('углеводы')) c = opt.valueFloat;
        }
        if (kcal != null || p != null || f != null || c != null) {
          nutr = { energy_kcal: kcal, protein_100g: p, fat_100g: f, carbohydrates_100g: c };
        }
      }
      indexDonor('korzina', k.id, k.name, k.brand, k.barcode, k.composition, nutr, k.storageConditions, k.shelfLife, null, null);
    }
  }

  // Load Clean V2
  if (fs.existsSync(CLEAN_V2_PATH)) {
    const rlV2 = readline.createInterface({ input: fs.createReadStream(CLEAN_V2_PATH) });
    for await (const line of rlV2) {
      if (!line.trim()) continue;
      const v = JSON.parse(line);
      indexDonor('clean_v2', v.id, v.name, v.brand, v.ean, v.ingredients_raw, v.nutriments_json, v.storage_conditions, v.shelf_life, v.country_of_origin, v.halal_status);
    }
  }

  // Load Aggregated V3
  if (fs.existsSync(AGG_V3_PATH)) {
    const v3 = JSON.parse(fs.readFileSync(AGG_V3_PATH, 'utf8'));
    for (const item of v3) {
      indexDonor('aggregated_v3', item.id, item.name, item.brand, item.ean, item.ingredients_raw, item.nutriments_json, item.storage_conditions, item.shelf_life, item.country_of_origin, item.halal_status);
    }
  }

  console.log(`Indexed ${donors.length} rich donors across ${brandIndex.size} brand buckets.`);

  // Find Candidates for Master Products
  console.log('Finding candidate pairs for AI verification...');
  const candidates = [];
  const alreadyMatchedLogs = new Set();
  if (fs.existsSync(MATCHES_LOG_PATH)) {
    const rlLog = readline.createInterface({ input: fs.createReadStream(MATCHES_LOG_PATH) });
    for await (const line of rlLog) {
      if (line.trim()) {
        try {
          const l = JSON.parse(line);
          if (l.masterEan && l.donorName) alreadyMatchedLogs.add(`${l.masterEan}_${l.donorName}`);
          if (l.masterEan && l.donorId) alreadyMatchedLogs.add(`${l.masterEan}_${l.donorId}`);
        } catch {}
      }
    }
  }

  for (const m of masterRecords) {
    const isFood = m.category !== 'personal_care' && m.category !== 'household';
    if (!isFood) continue;

    const missingIng = !m.ingredients_raw || m.ingredients_raw.length < 5;
    const missingNutr = !m.nutriments_json || (!m.nutriments_json.energy_kcal && !m.nutriments_json.protein_100g);
    if (!missingIng && !missingNutr) continue;

    const nBrand = normalizeBrand(m.brand);
    if (!nBrand) continue;

    const brandDonors = brandIndex.get(nBrand);
    if (!brandDonors || brandDonors.length === 0) continue;

    const masterWeight = extractNormalizedWeight(m.name);
    const masterFat = extractFatPercent(m.name);
    const masterStems = new Set(cleanTokens(m.name).map(stemFMCG));

    let bestDonor = null;
    let bestScore = 0;

    for (const d of brandDonors) {
      // Avoid comparing item with itself
      if (m.ean && d.ean && m.ean === d.ean) continue;
      if (alreadyMatchedLogs.has(`${m.ean}_${d.name}`) || (d.id && alreadyMatchedLogs.has(`${m.ean}_${d.id}`))) continue;

      // Strict weight compatibility
      if (!areWeightsCompatible(masterWeight, d.weight)) continue;

      // Strict fat % compatibility
      if (masterFat !== null && d.fatPercent !== null && Math.abs(masterFat - d.fatPercent) > 0.1) continue;

      // Overlap calculation
      let common = 0;
      for (const s of d.stems) {
        if (masterStems.has(s)) common++;
      }
      const union = masterStems.size + d.stems.length - common;
      const jaccard = union > 0 ? common / union : 0;

      if (common >= 2 && jaccard >= 0.35 && jaccard > bestScore) {
        bestScore = jaccard;
        bestDonor = d;
      }
    }

    if (bestDonor && bestScore >= 0.50) {
      candidates.push({
        pairId: 0,
        masterEan: m.ean,
        masterName: m.name,
        masterBrand: m.brand,
        donorSource: bestDonor.source,
        donorId: bestDonor.id,
        donorName: bestDonor.name,
        donorBrand: bestDonor.brand,
        score: bestScore,
        masterRef: m,
        donorRef: bestDonor
      });
    }
  }

  // Sort candidates by score descending to always audit the highest-confidence matches first
  candidates.sort((a, b) => b.score - a.score);
  const selectedCandidates = candidates.slice(0, maxPairs);
  selectedCandidates.forEach((c, idx) => { c.pairId = idx + 1; });

  console.log(`Found ${candidates.length} candidate pairs (score >= 0.50). Selected top ${selectedCandidates.length} for AI consensus.`);
  if (selectedCandidates.length === 0) {
    console.log('No new candidates to audit.');
    return;
  }

  // Execute AI Verification Batches
  let totalApproved = 0;
  let totalRejected = 0;
  const logStream = fs.createWriteStream(MATCHES_LOG_PATH, { flags: 'a' });

  for (let i = 0; i < selectedCandidates.length; i += batchSize) {
    const batch = selectedCandidates.slice(i, i + batchSize);
    const aiPairs = batch.map(c => ({
      pairId: c.pairId,
      masterProduct: `${c.masterName} (Brand: ${c.masterBrand || 'N/A'})`,
      donorProduct: `${c.donorName} (Brand: ${c.donorBrand || 'N/A'})`
    }));

    console.log(`[AI Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(selectedCandidates.length / batchSize)}] Auditing pairs ${batch[0].pairId}..${batch[batch.length - 1].pairId}...`);
    const results = await verifyWithDeepSeek(aiPairs);

    for (const res of results) {
      const candidate = batch.find(b => b.pairId === res.pairId);
      if (!candidate) continue;

      const logEntry = {
        timestamp: new Date().toISOString(),
        masterEan: candidate.masterEan,
        masterName: candidate.masterName,
        donorSource: candidate.donorSource,
        donorId: candidate.donorId,
        donorName: candidate.donorName,
        isMatch: res.isMatch,
        rationale: res.rationale
      };
      logStream.write(JSON.stringify(logEntry) + '\n');

      if (res.isMatch) {
        totalApproved++;
        const m = candidate.masterRef;
        const d = candidate.donorRef;

        if ((!m.ingredients_raw || m.ingredients_raw.length < 5) && d.ingredients_raw) {
          m.ingredients_raw = d.ingredients_raw;
        }
        if ((!m.nutriments_json || (!m.nutriments_json.energy_kcal && !m.nutriments_json.protein_100g)) && d.nutriments_json) {
          m.nutriments_json = d.nutriments_json;
        }
        if (!m.shelf_life && d.shelf_life) m.shelf_life = d.shelf_life;
        if (!m.storage_conditions && d.storage_conditions) m.storage_conditions = d.storage_conditions;
        if (!m.country_of_origin && d.country_of_origin) m.country_of_origin = d.country_of_origin;
        if (m.halal_status !== 'yes' && d.halal_status === 'yes') m.halal_status = 'yes';
        m.data_quality_score = Math.min(100, (m.data_quality_score || 50) + 15);
      } else {
        totalRejected++;
      }
    }

    console.log(`  -> Progress: Approved so far: ${totalApproved} | Rejected: ${totalRejected}`);

    // Periodic Checkpoint every 5 batches
    if ((Math.floor(i / batchSize) + 1) % 5 === 0 && totalApproved > 0) {
      console.log(`[Auto-Checkpoint] Saving intermediate progress (${totalApproved} approved)...`);
      if (masterRecords.length === 58643) {
        const tempPath = MASTER_PATH + '.tmp';
        const ws = fs.createWriteStream(tempPath, { encoding: 'utf8' });
        for (const record of masterRecords) {
          ws.write(JSON.stringify(record) + '\n');
        }
        await new Promise(r => ws.end(r));
        fs.renameSync(tempPath, MASTER_PATH);
        console.log(`[Auto-Checkpoint] Intermediate state saved successfully.`);
      }
    }

    await sleep(1500); // Polite pacing
  }

  logStream.end();

  // Final Master Catalog Checkpoint
  console.log(`\n[Final Checkpoint] Saving updated Master Catalog...`);
  if (masterRecords.length !== 58643) {
    throw new Error(`CRITICAL INVARIANT FAILED: Master count is ${masterRecords.length}`);
  }

  const tempPath = MASTER_PATH + '.tmp';
  const writeStream = fs.createWriteStream(tempPath, { encoding: 'utf8' });
  for (const record of masterRecords) {
    writeStream.write(JSON.stringify(record) + '\n');
  }
  await new Promise(r => writeStream.end(r));
  fs.renameSync(tempPath, MASTER_PATH);

  console.log(`[Checkpoint] SUCCESS! ${totalApproved} newly verified products safely merged into ${MASTER_PATH}`);
}

if (process.argv[1] && process.argv[1].endsWith('catalog-v4-autonomous-enricher.mjs')) {
  const max = parseInt(process.argv.find(a => a.startsWith('--max='))?.split('=')[1] || '200', 10);
  runAutonomousEnrichment({ maxPairs: max }).catch(err => {
    console.error('Enricher failed:', err);
    process.exit(1);
  });
}
