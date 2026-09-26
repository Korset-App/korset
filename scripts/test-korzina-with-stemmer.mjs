import fs from 'fs';
import readline from 'readline';
import { stemRussian } from './utils/russian-stemmer.mjs';

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[«»"'(),.\-\/\\–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'для', 'под', 'над', 'при', 'без', 'или', 'вес', 'цена', 'шт', 'уп', 'пак',
  'гр', 'г', 'кг', 'мл', 'л', 'в/у', 'м/у', 'д/п', 'ст/б', 'ж/б', 'пэт', 'к/у'
]);

const FLAVORS = [
  'вишня', 'черешня', 'малина', 'клубника', 'земляника', 'смородина', 'черника',
  'брусника', 'клюква', 'персик', 'абрикос', 'яблоко', 'груша', 'слива', 'банан',
  'апельсин', 'лимон', 'лайм', 'грейпфрут', 'манго', 'ананас', 'кокос', 'ваниль',
  'шоколад', 'карамель', 'орех', 'фундук', 'миндаль', 'арахис', 'фисташк'
];

const MEAT_TYPES = [
  'говядин', 'свинин', 'куриц', 'курин', 'цыплен', 'индейк', 'баранин', 'конин', 'утк', 'кролик'
];

function extractFlavors(str) {
  const norm = normalizeText(str);
  return new Set(FLAVORS.filter(f => norm.includes(f.slice(0, 4))));
}

function extractMeat(str) {
  const norm = normalizeText(str);
  return new Set(MEAT_TYPES.filter(m => norm.includes(m.slice(0, 4))));
}

function getStemmedTokens(str) {
  return normalizeText(str)
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    .map(w => stemRussian(w));
}

function extractPercentages(str) {
  const matches = [...str.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map(m => m[1].replace(',', '.'));
  return new Set(matches);
}

async function main() {
  console.log('=== Matching Korzina with Stemmer ===');

  const masterProducts = [];
  const stemIndex = new Map();

  const masterRl = readline.createInterface({
    input: fs.createReadStream('data/korset_master_catalog_v4_final.jsonl'),
    crlfDelay: Infinity
  });

  const nonFood = new Set(['household', 'personal_care']);

  for await (const line of masterRl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    const isFood = !nonFood.has(p.category);
    const hasPhoto = (p.image_url && p.image_url.length > 5) || (p.images && p.images.length > 0);
    if (isFood && hasPhoto) {
      const idx = masterProducts.length;
      const stems = getStemmedTokens(p.name);
      const percentages = extractPercentages(p.name);
      const flavors = extractFlavors(p.name);
      const meat = extractMeat(p.name);

      masterProducts.push({
        id: p.id,
        ean: p.ean,
        name: p.name,
        brand: p.brand ? normalizeText(p.brand) : null,
        stems,
        stemSet: new Set(stems),
        percentages,
        flavors,
        meat,
        hasKbju: !!(p.nutriments_json && Object.keys(p.nutriments_json).length >= 3),
        hasIng: !!(p.ingredients_raw && p.ingredients_raw.length > 10)
      });

      for (const st of stems) {
        if (!stemIndex.has(st)) stemIndex.set(st, []);
        stemIndex.get(st).push(idx);
      }
    }
  }

  console.log(`Indexed ${masterProducts.length} target food products.`);

  const korzinaRaw = fs.readFileSync('data/korzinavdom_catalog_full.json', 'utf8');
  const korzinaData = JSON.parse(korzinaRaw);

  const candidates = [];
  for (const k of korzinaData) {
    let cal, prot, fat, carb;
    if (Array.isArray(k.options)) {
      for (const opt of k.options) {
        const name = (opt.optionName || '').toLowerCase();
        const val = opt.valueFloat != null ? opt.valueFloat : parseFloat(opt.valueVariant);
        if (name.includes('энерг') || name.includes('калор')) cal = val;
        if (name.includes('белк')) prot = val;
        if (name.includes('жир')) fat = val;
        if (name.includes('углев')) carb = val;
      }
    }

    const hasValidKbju = (cal != null && prot != null && fat != null && carb != null &&
      prot + fat + carb <= 105 && cal > 0 && cal < 1000);
    const hasValidComp = (k.composition && k.composition.trim().length > 10);

    if (hasValidKbju || hasValidComp) {
      candidates.push({
        productName: k.productName,
        brand: k.brand ? normalizeText(k.brand) : null,
        stems: getStemmedTokens(k.productName),
        percentages: extractPercentages(k.productName),
        flavors: extractFlavors(k.productName),
        meat: extractMeat(k.productName),
        composition: hasValidComp ? k.composition.trim() : null,
        kbju: hasValidKbju ? {
          energy_kcal: Math.round(cal * 10) / 10,
          protein_100g: Math.round(prot * 10) / 10,
          fat_100g: Math.round(fat * 10) / 10,
          carbohydrates_100g: Math.round(carb * 10) / 10
        } : null
      });
    }
  }

  console.log(`Korzina candidates: ${candidates.length}`);

  let matchesCount = 0;
  let canEnrichKbju = 0;
  let canEnrichIng = 0;
  const matchSamples = [];

  for (const k of candidates) {
    if (k.stems.length === 0) continue;

    const candidateCounts = new Map();
    for (const st of k.stems) {
      const list = stemIndex.get(st);
      if (list) {
        for (const idx of list) {
          candidateCounts.set(idx, (candidateCounts.get(idx) || 0) + 1);
        }
      }
    }

    let bestScore = 0;
    let bestMaster = null;

    for (const [idx, commonStems] of candidateCounts.entries()) {
      const m = masterProducts[idx];
      const score = (2 * commonStems) / (k.stems.length + m.stems.length);

      // Percentage check (fat %)
      if (k.percentages.size > 0 && m.percentages.size > 0) {
        let pctMatch = false;
        for (const p of k.percentages) {
          if (m.percentages.has(p)) {
            pctMatch = true;
            break;
          }
        }
        if (!pctMatch) continue;
      }

      // Meat gating
      if (k.meat.size > 0 || m.meat.size > 0) {
        let meatConflict = false;
        for (const mt of k.meat) {
          if (!m.meat.has(mt)) meatConflict = true;
        }
        for (const mt of m.meat) {
          if (!k.meat.has(mt)) meatConflict = true;
        }
        if (meatConflict) continue;
      }

      // Flavor gating
      if (k.flavors.size > 0 || m.flavors.size > 0) {
        let flavorConflict = false;
        for (const fl of k.flavors) {
          if (!m.flavors.has(fl)) flavorConflict = true;
        }
        for (const fl of m.flavors) {
          if (!k.flavors.has(fl)) flavorConflict = true;
        }
        if (flavorConflict) continue;
      }

      // Brand compatibility
      if (k.brand && m.brand && k.brand.length > 2 && m.brand.length > 2) {
        if (!k.brand.includes(m.brand) && !m.brand.includes(k.brand)) {
          continue;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMaster = m;
      }
    }

    const brandMatch = k.brand && bestMaster && bestMaster.brand && (k.brand.includes(bestMaster.brand) || bestMaster.brand.includes(k.brand));
    const passThreshold = bestScore >= 0.75 || (bestScore >= 0.65 && brandMatch);

    if (bestMaster && passThreshold) {
      matchesCount++;
      if (!bestMaster.hasKbju && k.kbju) canEnrichKbju++;
      if (!bestMaster.hasIng && k.composition) canEnrichIng++;

      if (matchSamples.length < 15 && (!bestMaster.hasKbju && k.kbju)) {
        matchSamples.push({
          score: Math.round(bestScore * 100) / 100,
          masterName: bestMaster.name,
          korzinaName: k.productName,
          kbju: k.kbju
        });
      }
    }
  }

  console.log({ matchesCount, canEnrichKbju, canEnrichIng });
  console.log('Sample Matches:');
  console.log(JSON.stringify(matchSamples, null, 2));
}

main().catch(console.error);
