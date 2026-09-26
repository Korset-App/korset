import fs from 'fs';
import readline from 'readline';

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

function getTokens(str) {
  return normalizeText(str)
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

function extractNumbers(str) {
  const matches = str.match(/\d+(?:[.,]\d+)?/g) || [];
  return new Set(matches.map(m => m.replace(',', '.')));
}

async function testKorzinaMatch() {
  const masterProducts = [];
  const wordIndex = new Map(); // word -> Set of master indices

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
      const tokens = getTokens(p.name);
      const tokenSet = new Set(tokens);
      const numbers = extractNumbers(p.name);

      masterProducts.push({
        id: p.id,
        ean: p.ean,
        name: p.name,
        brand: p.brand ? normalizeText(p.brand) : null,
        tokens,
        tokenSet,
        numbers,
        category: p.category,
        hasKbju: !!(p.nutriments_json && Object.keys(p.nutriments_json).length >= 3),
        hasIng: !!(p.ingredients_raw && p.ingredients_raw.length > 10)
      });

      for (const t of tokens) {
        if (!wordIndex.has(t)) wordIndex.set(t, []);
        wordIndex.get(t).push(idx);
      }
    }
  }

  console.log(`Indexed ${masterProducts.length} master food products.`);

  const rawKorzina = fs.readFileSync('data/korzinavdom_catalog_full.json', 'utf8');
  const korzinaData = JSON.parse(rawKorzina);

  const korzinaWithKbju = [];
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
    if (cal != null && prot != null && fat != null && carb != null) {
      if (prot + fat + carb <= 105 && cal > 0 && cal < 1000) {
        korzinaWithKbju.push({
          productName: k.productName,
          brand: k.brand ? normalizeText(k.brand) : null,
          tokens: getTokens(k.productName),
          tokenSet: new Set(getTokens(k.productName)),
          numbers: extractNumbers(k.productName),
          composition: k.composition,
          kbju: {
            energy_kcal: Math.round(cal * 10) / 10,
            protein_100g: Math.round(prot * 10) / 10,
            fat_100g: Math.round(fat * 10) / 10,
            carbohydrates_100g: Math.round(carb * 10) / 10
          }
        });
      }
    }
  }

  console.log(`Korzina valid items with KBJU: ${korzinaWithKbju.length}`);

  let matchesCount = 0;
  let canEnrichKbju = 0;
  let canEnrichIng = 0;
  const matchSamples = [];

  for (const k of korzinaWithKbju) {
    if (k.tokens.length === 0) continue;

    // Collect candidate indices from inverted index
    const candidateCounts = new Map();
    for (const t of k.tokens) {
      const list = wordIndex.get(t);
      if (list) {
        for (const idx of list) {
          candidateCounts.set(idx, (candidateCounts.get(idx) || 0) + 1);
        }
      }
    }

    let bestScore = 0;
    let bestMaster = null;

    for (const [idx, commonWords] of candidateCounts.entries()) {
      const m = masterProducts[idx];
      // Dice similarity coefficient
      const score = (2 * commonWords) / (k.tokens.length + m.tokens.length);

      if (score > bestScore) {
        // Enforce zero mixup constraints:
        // 1. If numbers exist in both, at least the primary quantity/fat % must match
        let numberMismatch = false;
        if (k.numbers.size > 0 && m.numbers.size > 0) {
          // Check if there is at least one overlapping number or both have identical sets
          let hasCommonNum = false;
          for (const num of k.numbers) {
            if (m.numbers.has(num)) {
              hasCommonNum = true;
              break;
            }
          }
          // If no number matches, don't allow match if it's dairy/fat%
          if (!hasCommonNum && (k.productName.includes('%') || m.name.includes('%'))) {
            numberMismatch = true;
          }
        }

        // 2. Brand compatibility: if both have explicit brands, they shouldn't conflict
        let brandConflict = false;
        if (k.brand && m.brand && k.brand.length > 2 && m.brand.length > 2) {
          if (!k.brand.includes(m.brand) && !m.brand.includes(k.brand)) {
            brandConflict = true;
          }
        }

        if (!numberMismatch && !brandConflict) {
          bestScore = score;
          bestMaster = m;
        }
      }
    }

    // High precision threshold: score >= 0.75
    if (bestMaster && bestScore >= 0.75) {
      matchesCount++;
      if (!bestMaster.hasKbju) canEnrichKbju++;
      if (!bestMaster.hasIng && k.composition && k.composition.length > 10) canEnrichIng++;

      if (matchSamples.length < 20) {
        matchSamples.push({
          score: Math.round(bestScore * 100) / 100,
          masterName: bestMaster.name,
          korzinaName: k.productName,
          mHasKbju: bestMaster.hasKbju,
          kbju: k.kbju,
          compSnippet: (k.composition || '').slice(0, 45)
        });
      }
    }
  }

  console.log({ matchesCount, canEnrichKbju, canEnrichIng });
  console.log('Sample Matches:');
  console.log(JSON.stringify(matchSamples.slice(0, 10), null, 2));
}

testKorzinaMatch().catch(console.error);
