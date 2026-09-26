import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import {
  cleanTokens,
  extractNormalizedWeight,
  extractFatPercent,
  areWeightsCompatible,
  InvertedIndex
} from './utils/retail-tokenizer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.backup.jsonl');
const ARBUZ_PATH = path.join(__dirname, '..', 'data', 'arbuz_enriched_catalog.jsonl');
const KORZINA_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog_full.json');
const MATCHES_LOG_PATH = path.join(__dirname, '..', 'data', 'enrichment_matches.jsonl');

// Load API Keys
let dsKey = null;
if (fs.existsSync(path.join(__dirname, '..', '.env.local'))) {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  dsKey = env.match(/OPENAI_API_KEY=["']?([^"'\r\n]+)/)?.[1] ||
          env.match(/DEEPSEEK_API_KEY=["']?([^"'\r\n]+)/)?.[1];
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function verifyWithDeepSeek(pairs, retries = 3) {
  if (!dsKey) return pairs.map(p => ({ pairId: p.pairId, isMatch: false, rationale: 'No API key' }));

  const prompt = `You are a strict FMCG grocery product auditor in Kazakhstan.
Verify whether the Master product and the Donor product refer to the EXACT SAME physical retail item sold on shelf.

Rules:
1. Brand must match (e.g. Rakhat == Рахат, Hochland == Хохланд, Lactel == Лактель, Зенченко == Зенченко и К).
2. Flavor, recipe, sub-variety must match 100%. (e.g. Strawberry != Peach; Dark != Milk; Still != Sparkling; 2.5% fat != 3.2% fat).
3. Weight / Package volume must match within reasonable pack tolerance (e.g. 100g != 200g; 1L != 0.5L).
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
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content);
        if (Array.isArray(parsed?.results)) return parsed.results;
        if (Array.isArray(parsed)) return parsed;
      } else if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * attempt);
        continue;
      }
    } catch (e) {
      if (attempt === retries) {
        return pairs.map(p => ({ pairId: p.pairId, isMatch: false, rationale: 'DeepSeek error: ' + e.message }));
      }
      await sleep(1000 * attempt);
    }
  }
  return pairs.map(p => ({ pairId: p.pairId, isMatch: false, rationale: 'Timeout' }));
}

function parseKorzinaNutrition(options) {
  if (!Array.isArray(options)) return null;
  let kcal = null, protein = null, fats = null, carbs = null;

  for (const opt of options) {
    const name = opt.optionName?.toLowerCase() || '';
    const val = opt.valueFloat;
    if (val == null) continue;

    if (name.includes('энергетическая ценность') || name.includes('ккал')) kcal = val;
    else if (name.includes('белки')) protein = val;
    else if (name.includes('жиры')) fats = val;
    else if (name.includes('углеводы')) carbs = val;
  }

  if (kcal == null && protein == null && fats == null && carbs == null) return null;
  return {
    energy_kcal: kcal,
    protein_100g: protein,
    fat_100g: fats,
    carbohydrates_100g: carbs
  };
}

export async function runCatalogMerger({ dryRun = false, phase1Only = false, limit = 0 } = {}) {
  console.log(`\n======================================================`);
  console.log(`=== STARTING CATALOG V4 ENRICHMENT PIPELINE ===`);
  console.log(`=== Mode: ${dryRun ? 'DRY-RUN (No writes)' : 'LIVE EXECUTION'} | Phase1Only: ${phase1Only} | Limit: ${limit || 'ALL'} ===`);
  console.log(`======================================================\n`);

  // 1. Create safety backup if live run
  if (!dryRun && !fs.existsSync(BACKUP_PATH)) {
    console.log(`[Backup] Creating initial safety backup: ${BACKUP_PATH}`);
    fs.copyFileSync(MASTER_PATH, BACKUP_PATH);
  }

  // 2. Load Master Catalog in memory
  console.log('Loading Master Catalog into memory...');
  const masterRecords = [];
  const rlMaster = readline.createInterface({ input: fs.createReadStream(MASTER_PATH) });
  for await (const line of rlMaster) {
    if (line.trim()) {
      masterRecords.push(JSON.parse(line));
      if (limit > 0 && masterRecords.length >= limit) break;
    }
  }
  console.log(`Loaded ${masterRecords.length} master products.`);

  // 3. Load Arbuz Enriched Catalog (9,302 EANs)
  console.log('\n--- Step 1: Loading Arbuz Enriched Catalog ---');
  const arbuzEanMap = new Map();
  if (fs.existsSync(ARBUZ_PATH)) {
    const rlArbuz = readline.createInterface({ input: fs.createReadStream(ARBUZ_PATH) });
    for await (const line of rlArbuz) {
      if (!line.trim()) continue;
      try {
        const p = JSON.parse(line);
        if (p.ean && /^\d{8,14}$/.test(p.ean)) {
          arbuzEanMap.set(p.ean, p);
        }
      } catch {}
    }
  }
  console.log(`Loaded ${arbuzEanMap.size} exact EAN products from Arbuz.`);

  // 4. PHASE 1: Exact EAN Matching
  console.log('\n--- Step 2: Executing PHASE 1 (100% Exact EAN Match) ---');
  let phase1Matches = 0;
  let p1NewIngredients = 0;
  let p1NewNutrition = 0;
  let p1NewShelfLife = 0;
  let p1NewStorage = 0;
  let p1NewCountry = 0;
  let p1NewHalal = 0;

  const masterToFuzzy = [];
  const matchedArbuzEans = new Set();

  for (const m of masterRecords) {
    const arbuzDonor = arbuzEanMap.get(m.ean);

    if (arbuzDonor) {
      phase1Matches++;
      matchedArbuzEans.add(arbuzDonor.ean);

      // Ingredients
      const hasIng = Boolean(m.ingredients_raw && m.ingredients_raw.trim().length > 3);
      if (!hasIng && arbuzDonor.ingredients_raw) {
        m.ingredients_raw = arbuzDonor.ingredients_raw;
        p1NewIngredients++;
      }

      // Nutrition
      const hasNutr = Boolean(m.nutriments_json && Object.keys(m.nutriments_json).length > 0 &&
        (m.nutriments_json.energy_kcal || m.nutriments_json.protein_100g || m.nutriments_json.fat_100g));
      const donorNutr = arbuzDonor.nutriments_json;
      if (!hasNutr && donorNutr && (donorNutr.energy_kcal || donorNutr.protein_100g || donorNutr.fat_100g)) {
        m.nutriments_json = donorNutr;
        p1NewNutrition++;
      }

      // Shelf life
      const hasShelf = Boolean(m.shelf_life && String(m.shelf_life).trim().length > 0);
      if (!hasShelf && arbuzDonor.shelf_life_days) {
        m.shelf_life = `${arbuzDonor.shelf_life_days} дней`;
        p1NewShelfLife++;
      }

      // Storage
      const hasStorage = Boolean(m.storage_conditions && m.storage_conditions.trim().length > 3);
      if (!hasStorage && arbuzDonor.storage_conditions) {
        m.storage_conditions = arbuzDonor.storage_conditions;
        p1NewStorage++;
      }

      // Country
      const hasCountry = Boolean(m.country_of_origin && m.country_of_origin.trim().length > 0);
      if (!hasCountry && arbuzDonor.producer_country) {
        m.country_of_origin = arbuzDonor.producer_country;
        p1NewCountry++;
      }

      // Halal
      const hasHalal = Boolean(m.halal_status && m.halal_status !== 'unknown');
      if (!hasHalal && arbuzDonor.halal_status === 'yes') {
        m.halal_status = 'yes';
        m.halal_certifier = m.halal_certifier || 'arbuz_vetted';
        p1NewHalal++;
      }

      m.data_quality_score = Math.min(100, (m.data_quality_score || 50) + 15);
    }

    // Check if still needs Phase 2 fuzzy matching (strictly food items)
    const isFood = m.category !== 'personal_care' && m.category !== 'household';
    if (isFood) {
      const missingIng = !m.ingredients_raw || m.ingredients_raw.trim().length < 5;
      const missingNutr = !m.nutriments_json || (!m.nutriments_json.energy_kcal && !m.nutriments_json.protein_100g);
      if (missingIng || missingNutr) {
        masterToFuzzy.push(m);
      }
    }
  }

  console.log(`[Phase 1 Summary]`);
  console.log(`  Master Products scanned: ${masterRecords.length}`);
  console.log(`  Direct 100% EAN Matches: ${phase1Matches}`);
  console.log(`  New Ingredients: +${p1NewIngredients}`);
  console.log(`  New Nutrition (КБЖУ): +${p1NewNutrition}`);
  console.log(`  New Shelf Life: +${p1NewShelfLife}`);
  console.log(`  New Storage Conditions: +${p1NewStorage}`);
  console.log(`  New Country: +${p1NewCountry}`);
  console.log(`  New Halal Badges: +${p1NewHalal}`);

  // 5. PHASE 2: Inverted Index & DeepSeek V3 Consensus Verification
  let p2Candidates = 0;
  let p2Approved = 0;
  let p2NewIngredients = 0;
  let p2NewNutrition = 0;
  let p2NewShelfLife = 0;
  let p2NewStorage = 0;

  if (!phase1Only) {
    console.log('\n--- Step 3: Building Inverted Index for PHASE 2 ---');
    const index = new InvertedIndex();

    // Index Korzina v Dom full catalog (9,297 items)
    if (fs.existsSync(KORZINA_PATH)) {
      const korzinaData = JSON.parse(fs.readFileSync(KORZINA_PATH, 'utf8'));
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
          shelfLife: k.shelfLife,
          nutriments: parseKorzinaNutrition(k.options),
          country: k.country
        });
      }
      console.log(`Indexed ${korzinaData.length} items from Korzina v Dom.`);
    }

    // Index Arbuz items that were not matched in Phase 1
    let arbuzIndexed = 0;
    for (const [ean, a] of arbuzEanMap.entries()) {
      if (!matchedArbuzEans.has(ean)) {
        const cleanT = cleanTokens(a.name);
        if (cleanT.length === 0) continue;
        index.addDonor({
          source: 'arbuz',
          id: a.id,
          name: a.name,
          brand: a.brand,
          weight: extractNormalizedWeight(a.name),
          fatPercent: extractFatPercent(a.name),
          cleanTokens: cleanT,
          ingredients: a.ingredients_raw,
          storage: a.storage_conditions,
          shelfLife: a.shelf_life_days ? `${a.shelf_life_days} дней` : null,
          nutriments: a.nutriments_json,
          country: a.producer_country
        });
        arbuzIndexed++;
      }
    }
    console.log(`Indexed ${arbuzIndexed} unmatched items from Arbuz.`);

    console.log(`Food products in Master needing Phase 2 enrichment: ${masterToFuzzy.length}`);

    const matchesLog = fs.createWriteStream(MATCHES_LOG_PATH, { flags: 'a' });
    const BATCH_SIZE = 20;
    let pendingBatch = [];

    async function processLlmBatch() {
      if (pendingBatch.length === 0) return;
      const pairsForLLM = pendingBatch.map(p => ({
        pairId: p.pairId,
        master: { name: p.master.name, brand: p.master.brand || '', weight: p.masterWeight?.raw || '' },
        donor: { name: p.candidate.donor.name, brand: p.candidate.donor.brand || '', weight: p.candidate.donor.weight?.raw || '' }
      }));

      const auditResults = await verifyWithDeepSeek(pairsForLLM);
      const resultMap = new Map(auditResults.map(r => [r.pairId, r]));

      for (const item of pendingBatch) {
        const audit = resultMap.get(item.pairId);
        const isMatch = audit?.isMatch === true;

        matchesLog.write(JSON.stringify({
          masterEan: item.master.ean,
          masterName: item.master.name,
          donorSource: item.candidate.donor.source,
          donorName: item.candidate.donor.name,
          isMatch,
          rationale: audit?.rationale || '',
          score: item.candidate.score,
          timestamp: new Date().toISOString()
        }) + '\n');

        if (isMatch) {
          p2Approved++;
          const m = item.master;
          const d = item.candidate.donor;

          if ((!m.ingredients_raw || m.ingredients_raw.length < 5) && d.ingredients) {
            m.ingredients_raw = d.ingredients;
            p2NewIngredients++;
          }
          if ((!m.nutriments_json || !m.nutriments_json.energy_kcal) && d.nutriments) {
            m.nutriments_json = d.nutriments;
            p2NewNutrition++;
          }
          if (!m.storage_conditions && d.storage) {
            m.storage_conditions = d.storage;
            p2NewStorage++;
          }
          if (!m.shelf_life && d.shelfLife) {
            m.shelf_life = d.shelfLife;
            p2NewShelfLife++;
          }
          if (!m.country_of_origin && d.country) m.country_of_origin = d.country;
          m.source_confidence = 0.95;
          m.data_quality_score = Math.min(100, (m.data_quality_score || 50) + 10);
        }
      }
      pendingBatch = [];
    }

    for (let i = 0; i < masterToFuzzy.length; i++) {
      const m = masterToFuzzy[i];
      const masterTokens = cleanTokens(m.name);
      if (masterTokens.length < 2) continue;

      const masterWeight = extractNormalizedWeight(m.name);
      const masterFat = extractFatPercent(m.name);

      const candidates = index.search(masterTokens, masterWeight, masterFat, 1);
      if (candidates.length > 0 && candidates[0].score >= 0.70) {
        p2Candidates++;
        pendingBatch.push({
          pairId: p2Candidates,
          master: m,
          masterWeight,
          candidate: candidates[0]
        });

        if (pendingBatch.length >= BATCH_SIZE) {
          await processLlmBatch();
          if (p2Candidates % 100 === 0) {
            console.log(`[Phase 2 Progress] ${p2Candidates} candidates audited | ${p2Approved} approved by DeepSeek V3`);
          }
        }
      }
    }

    if (pendingBatch.length > 0) {
      await processLlmBatch();
    }
    matchesLog.end();
  }

  // 6. ATOMIC WRITE
  if (!dryRun) {
    const tempOutPath = MASTER_PATH + '.tmp';
    console.log(`\nWriting updated catalog to ${tempOutPath}...`);
    const outStream = fs.createWriteStream(tempOutPath, 'utf8');
    for (const m of masterRecords) {
      outStream.write(JSON.stringify(m) + '\n');
    }
    outStream.end();

    await new Promise(r => setTimeout(r, 500));
    fs.copyFileSync(tempOutPath, MASTER_PATH);
    fs.unlinkSync(tempOutPath);
    console.log(`[Live Write] Master catalog successfully updated atomically!`);
  }

  console.log(`\n======================================================`);
  console.log(`=== CATALOG V4 ENRICHMENT COMPLETED! ===`);
  console.log(`======================================================`);
  console.log(`Total Master Items: ${masterRecords.length}`);
  console.log(`Phase 1 Exact EAN Matches: ${phase1Matches}`);
  console.log(`Phase 2 Candidates Audited: ${p2Candidates}`);
  console.log(`Phase 2 Approved by DeepSeek V3: ${p2Approved}`);
  console.log(`Total New Ingredients: +${p1NewIngredients + p2NewIngredients}`);
  console.log(`Total New Nutrition (КБЖУ): +${p1NewNutrition + p2NewNutrition}`);
  console.log(`Total New Shelf Life: +${p1NewShelfLife + p2NewShelfLife}`);
  console.log(`Total New Storage Conditions: +${p1NewStorage + p2NewStorage}`);
  console.log(`Total New Halal: +${p1NewHalal}`);
}

// CLI runner
const isMain = process.argv[1] && process.argv[1].endsWith('catalog-v4-master-merger.mjs');
if (isMain) {
  const dryRun = process.argv.includes('--dry-run');
  const phase1Only = process.argv.includes('--phase1-only');
  runCatalogMerger({ dryRun, phase1Only }).catch(console.error);
}
