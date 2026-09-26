import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import {
  normalizeBrand,
  extractNormalizedWeight,
  areWeightsCompatible,
  cleanTokens,
  calculateTokenOverlap
} from './utils/product-matcher.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const keyMatch = envLocal.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
const apiKey = keyMatch ? keyMatch[1] : null;

if (!apiKey) {
  console.error('GEMINI_API_KEY is missing from .env.local');
  process.exit(1);
}

const dsKey = envLocal.match(/OPENAI_API_KEY=["']?([^"'\r\n]+)/)?.[1];

const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const ARBUZ_PATH = path.join(__dirname, '..', 'data', 'arbuz_full_catalog.jsonl');
const KORZINA_PATH = path.join(__dirname, '..', 'data', 'korzinavdom_catalog.json');
const EVENTS_PATH = path.join(__dirname, '..', 'data', 'enrichment_matches.jsonl');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.backup.jsonl');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// LLM Guardrail: Batch verification via DeepSeek V3 / Chat
async function verifyBatch(pairs, retries = 3) {
  const prompt = `You are a strict FMCG grocery product auditor in Kazakhstan.
Verify whether the Master product and the Donor product refer to the EXACT SAME physical retail item.

Rules:
1. Brand must match (e.g. Rakhat == Рахат, Lactel == Лактель).
2. Flavor, recipe, sub-variety must match 100%. (e.g. Strawberry != Peach; Dark Chocolate != Milk Chocolate; Sparkling != Still; 2.5% fat != 3.2% fat).
3. Weight / Package volume must match. (e.g. 100g != 200g; 1L != 0.5L).
4. If identical in brand, exact flavor, and package size -> isMatch: true. Otherwise -> isMatch: false.

Pairs to audit:
${JSON.stringify(pairs, null, 2)}

Respond with a JSON object:
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
      if (dsKey) {
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
      }
    } catch (e) {
      if (attempt === retries) {
        console.warn('  LLM batch verification failed after retries:', e.message);
        return pairs.map(p => ({ pairId: p.pairId, isMatch: false, rationale: 'LLM error' }));
      }
      await sleep(1000 * attempt);
    }
  }
  return pairs.map(p => ({ pairId: p.pairId, isMatch: false, rationale: 'LLM timeout' }));
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

function parseKorzinaPackaging(options) {
  if (!Array.isArray(options)) return null;
  const opt = options.find(o => o.optionName?.toLowerCase().includes('упаковк'));
  return opt?.valueVariant || null;
}

function parseKorzinaManufacturer(options) {
  if (!Array.isArray(options)) return null;
  const opt = options.find(o => o.optionName?.toLowerCase().includes('производител'));
  return opt?.valueVariant || null;
}

async function loadDonors() {
  console.log('Loading donor catalogs...');
  const brandIndex = new Map(); // normalizedBrand -> Array<donorProduct>

  function indexDonor(donor) {
    const normBrand = normalizeBrand(donor.brand);
    if (!normBrand) return;
    if (!brandIndex.has(normBrand)) brandIndex.set(normBrand, []);
    brandIndex.get(normBrand).push(donor);
  }

  // 1. Load Arbuz
  if (fs.existsSync(ARBUZ_PATH)) {
    const lines = fs.readFileSync(ARBUZ_PATH, 'utf8').split('\n');
    let arbuzCount = 0;
    for (const l of lines) {
      if (!l.trim()) continue;
      try {
        const item = JSON.parse(l);
        const weightObj = extractNormalizedWeight(item.name) ||
          (item.weight ? extractNormalizedWeight(`${item.weight} ${item.measure || 'г'}`) : null);

        indexDonor({
          source: 'arbuz',
          id: item.id,
          name: item.name,
          brand: item.brand,
          weight: weightObj,
          ingredients_raw: item.ingredients_raw,
          storage_conditions: item.storage_conditions,
          shelf_life: null,
          nutriments_json: item.nutriments_json,
          producer_country: item.producer_country,
          manufacturer: null,
          packaging_type: null,
          halal_status: item.halal_status,
          halal_source: item.halal_source,
          cleanTokens: cleanTokens(item.name, item.brand)
        });
        arbuzCount++;
      } catch {}
    }
    console.log(`Loaded ${arbuzCount} items from Arbuz.`);
  }

  // 2. Load Korzina v Dom
  if (fs.existsSync(KORZINA_PATH)) {
    const korzinaData = JSON.parse(fs.readFileSync(KORZINA_PATH, 'utf8'));
    let korzinaCount = 0;
    for (const item of korzinaData) {
      const weightObj = extractNormalizedWeight(item.productName);
      const nutriments = parseKorzinaNutrition(item.options);
      const packaging = parseKorzinaPackaging(item.options);
      const manufacturer = parseKorzinaManufacturer(item.options);

      indexDonor({
        source: 'korzinavdom',
        id: item.quantumNumber,
        name: item.productName,
        brand: item.brand,
        weight: weightObj,
        ingredients_raw: item.composition,
        storage_conditions: item.storageConditions,
        shelf_life: item.shelfLife,
        nutriments_json: nutriments,
        producer_country: item.country,
        manufacturer,
        packaging_type: packaging,
        halal_status: null,
        halal_source: null,
        cleanTokens: cleanTokens(item.productName, item.brand)
      });
      korzinaCount++;
    }
    console.log(`Loaded ${korzinaCount} items from Korzina v Dom.`);
  }

  console.log(`Indexed across ${brandIndex.size} distinct normalized brands.`);
  return brandIndex;
}

export async function runMerger({ dryRun = false, limit = 0 } = {}) {
  console.log(`=== Starting AI Text Consensus Merger (DryRun: ${dryRun}, Limit: ${limit || 'ALL'}) ===`);

  const brandIndex = await loadDonors();

  // Create backup if modifying
  if (!dryRun && !fs.existsSync(BACKUP_PATH)) {
    console.log(`Creating safety backup: ${BACKUP_PATH}`);
    fs.copyFileSync(MASTER_PATH, BACKUP_PATH);
  }

  const eventsStream = fs.createWriteStream(EVENTS_PATH, { flags: 'a' });

  // Read master catalog line by line
  const fileStream = fs.createReadStream(MASTER_PATH, 'utf8');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const tempOutPath = MASTER_PATH + '.tmp';
  const outStream = dryRun ? null : fs.createWriteStream(tempOutPath, 'utf8');

  let totalProcessed = 0;
  let candidatesFound = 0;
  let matchesVerified = 0;
  let enrichedIngredients = 0;
  let enrichedNutrition = 0;
  let enrichedStorage = 0;
  let enrichedHalal = 0;

  const BATCH_SIZE = 15;
  let pendingBatch = []; // Array<{ pairId, masterItem, donorItem, masterObj }>

  async function processPendingBatch() {
    if (pendingBatch.length === 0) return;

    const pairsForLLM = pendingBatch.map(p => ({
      pairId: p.pairId,
      master: {
        name: p.masterItem.name,
        brand: p.masterItem.brand || '',
        weight: p.masterItem.weight?.raw || ''
      },
      donor: {
        name: p.donorItem.name,
        brand: p.donorItem.brand || '',
        weight: p.donorItem.weight?.raw || ''
      }
    }));

    console.log(`[LLM Batch] Auditing ${pendingBatch.length} pairs (total candidates: ${candidatesFound})...`);
    const results = await verifyBatch(pairsForLLM);
    const resultMap = new Map(results.map(r => [r.pairId, r]));
    let batchApproved = 0;

    for (const item of pendingBatch) {
      const audit = resultMap.get(item.pairId);
      const isMatch = audit?.isMatch === true;

      console.log(`  [Pair #${item.pairId}] ${isMatch ? '✓ MATCH' : '✗ REJECT'}: "${item.masterItem.name}" VS "${item.donorItem.name}" -> ${audit?.rationale || 'no reason'}`);

      if (isMatch) {
        batchApproved++;
        matchesVerified++;
        const m = item.masterObj;
        const d = item.donorItem;

        let changed = false;

        // 1. Ingredients
        if ((!m.ingredients_raw || m.ingredients_raw.length < 5) && d.ingredients_raw) {
          m.ingredients_raw = d.ingredients_raw;
          enrichedIngredients++;
          changed = true;
        }

        // 2. Nutrition
        if ((!m.nutriments_json || m.nutriments_json.energy_kcal == null) && d.nutriments_json) {
          m.nutriments_json = d.nutriments_json;
          enrichedNutrition++;
          changed = true;
        }

        // 3. Storage
        if (!m.storage_conditions && d.storage_conditions) {
          m.storage_conditions = d.storage_conditions;
          enrichedStorage++;
          changed = true;
        }

        // 4. Shelf Life
        if (!m.shelf_life && d.shelf_life) {
          m.shelf_life = d.shelf_life;
          changed = true;
        }

        // 5. Country
        if (!m.country_of_origin && d.producer_country) {
          m.country_of_origin = d.producer_country;
          changed = true;
        }

        // 6. Packaging Type
        if (!m.packaging_type && d.packaging_type) {
          m.packaging_type = d.packaging_type;
          changed = true;
        }

        // 7. Manufacturer
        if (!m.manufacturer && d.manufacturer) {
          m.manufacturer = d.manufacturer;
          changed = true;
        }

        // 8. Halal
        if (!m.halal_status && d.halal_status === 'yes') {
          m.halal_status = 'yes';
          m.halal_source = d.halal_source || d.source;
          enrichedHalal++;
          changed = true;
        }

        eventsStream.write(JSON.stringify({
          ean: m.ean,
          master_name: m.name,
          donor_name: d.name,
          donor_source: d.source,
          rationale: audit.rationale,
          enriched_fields: {
            ingredients: !!d.ingredients_raw,
            nutrition: !!d.nutriments_json,
            storage: !!d.storage_conditions,
            halal: d.halal_status === 'yes'
          },
          matched_at: new Date().toISOString()
        }) + '\n');
      }

      if (!dryRun) {
        outStream.write(JSON.stringify(item.masterObj) + '\n');
      }
    }

    console.log(`[LLM Result] Approved ${batchApproved} / ${pendingBatch.length} matches (total verified: ${matchesVerified})`);
    pendingBatch = [];
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    totalProcessed++;

    if (limit > 0 && totalProcessed > limit) break;

    let masterObj;
    try {
      masterObj = JSON.parse(line);
    } catch {
      if (!dryRun) outStream.write(line + '\n');
      continue;
    }

    // Check what is missing
    const missingIng = !masterObj.ingredients_raw || masterObj.ingredients_raw.length < 5;
    const missingNutr = !masterObj.nutriments_json || masterObj.nutriments_json.energy_kcal == null;
    const missingStorage = !masterObj.storage_conditions;
    const missingHalal = !masterObj.halal_status;

    // If nothing important is missing, pass through
    if (!missingIng && !missingNutr && !missingStorage && !missingHalal) {
      if (!dryRun) outStream.write(JSON.stringify(masterObj) + '\n');
      continue;
    }

    // Skip non-food categories from food donor matching
    if (masterObj.category === 'personal_care' || masterObj.category === 'household') {
      if (!dryRun) outStream.write(JSON.stringify(masterObj) + '\n');
      continue;
    }

    // Determine normalized brand (fast token check)
    let normBrand = normalizeBrand(masterObj.brand);
    if (!normBrand || !brandIndex.has(normBrand)) {
      const cleanName = (masterObj.name || '').toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, ' ');
      const words = cleanName.split(/\s+/).filter(w => w.length > 2);
      for (let i = 0; i < words.length; i++) {
        if (brandIndex.has(words[i])) { normBrand = words[i]; break; }
        if (i < words.length - 1) {
          const bigram = words[i] + ' ' + words[i + 1];
          if (brandIndex.has(bigram)) { normBrand = bigram; break; }
        }
      }
    }
    const donorCandidates = normBrand ? brandIndex.get(normBrand) : null;

    if (!donorCandidates || donorCandidates.length === 0) {
      if (!dryRun) outStream.write(JSON.stringify(masterObj) + '\n');
      continue;
    }

    const masterWeight = extractNormalizedWeight(masterObj.name);
    const masterTokens = cleanTokens(masterObj.name, masterObj.brand);

    // Pre-filter candidates by weight & token overlap
    const validCandidates = [];
    for (const donor of donorCandidates) {
      if (!areWeightsCompatible(masterWeight, donor.weight)) continue;

      const overlap = calculateTokenOverlap(masterTokens, donor.cleanTokens);
      if (overlap >= 0.35) {
        validCandidates.push({ donor, overlap });
      }
    }

    if (validCandidates.length === 0) {
      if (!dryRun) outStream.write(JSON.stringify(masterObj) + '\n');
      continue;
    }

    // Pick candidate with highest token overlap
    validCandidates.sort((a, b) => b.overlap - a.overlap);
    const bestMatch = validCandidates[0].donor;
    candidatesFound++;

    pendingBatch.push({
      pairId: candidatesFound,
      masterItem: { name: masterObj.name, brand: masterObj.brand, weight: masterWeight },
      donorItem: bestMatch,
      masterObj
    });

    if (pendingBatch.length >= BATCH_SIZE) {
      await processPendingBatch();
      if (candidatesFound % 50 === 0) {
        console.log(`Processed ${totalProcessed} master items | ${candidatesFound} candidates audited | ${matchesVerified} verified matches`);
      }
    }
  }

  // Flush remaining batch
  if (pendingBatch.length > 0) {
    await processPendingBatch();
  }

  eventsStream.end();
  if (!dryRun) {
    outStream.end();
    // Swap tmp file to master file
    await sleep(500);
    fs.renameSync(tempOutPath, MASTER_PATH);
    console.log(`Updated master catalog: ${MASTER_PATH}`);
  }

  console.log(`\n=== Consensus Merger Summary ===`);
  console.log(`Total Master Items Processed: ${totalProcessed}`);
  console.log(`Candidate Pairs Audited by LLM: ${candidatesFound}`);
  console.log(`Verified Exact Matches: ${matchesVerified}`);
  console.log(`Enriched Ingredients: ${enrichedIngredients}`);
  console.log(`Enriched Nutrition (KBJU): ${enrichedNutrition}`);
  console.log(`Enriched Storage Conditions: ${enrichedStorage}`);
  console.log(`Enriched Halal Status: ${enrichedHalal}`);
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('ai-text-consensus-merger.mjs')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

  runMerger({ dryRun, limit }).catch(console.error);
}
