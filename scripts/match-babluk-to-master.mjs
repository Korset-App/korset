import fs from 'fs';
import readline from 'readline';

const MASTER_PATH = 'data/korset_master_catalog_v4_final.jsonl';
const BABLUK_PATH = 'data/babluk_official_catalog.json';
const OUT_LOG = 'data/babluk_matches.jsonl';

const bablukItems = JSON.parse(fs.readFileSync(BABLUK_PATH, 'utf8'));
console.log(`Loaded ${bablukItems.length} official Babushkino Lukoshko items.`);

const MEAT_STEMS = {
  говядина: /говяд/i,
  индейка: /индей/i,
  кролик: /кролик/i,
  цыпленок: /цыпл/i,
  конина: /конин/i,
  печень: /печен/i,
  язык: /язык/i,
  судак: /судак/i,
  треска: /треск/i,
  горбуша: /горбуш/i,
  семга: /семг/i
};

const VEG_FRUIT_STEMS = {
  кабачок: /кабач/i,
  брокколи: /броккол/i,
  цветная_капуста: /цветн.*капуст|капуст.*цветн/i,
  морковь: /морков/i,
  тыква: /тыкв/i,
  картофель: /картоф/i,
  кукуруза: /кукуруз/i,
  свекла: /свекл/i,
  овощи: /овощ/i,
  яблоко: /яблок|яблоч/i,
  груша: /груш/i,
  абрикос: /абрикос/i,
  персик: /персик/i,
  чернослив: /чернослив/i,
  банан: /банан/i,
  клубника: /клубник/i,
  малина: /малин/i,
  вишня: /вишн/i,
  черника: /черник/i,
  черная_смородина: /черн.*смород/i,
  шиповник: /шиповник/i,
  виноград: /виноград/i
};

const GRAIN_STEMS = {
  гречка: /греч/i,
  рис: /рис/i,
  овсянка: /овсян|овес/i,
  мультизлак: /мультизлак|злак/i,
  чечевица: /чечевиц/i
};

const TEA_HERB_STEMS = {
  ромашка: /ромашк/i,
  шиповник: /шиповник/i,
  мята: /мят/i,
  фенхель: /фенхел/i,
  мелисса: /мелисс/i,
  чабрец: /чабрец/i,
  анис: /анис/i,
  витаминный: /витамин/i
};

function matchStems(str, stemMap) {
  const matched = [];
  for (const [key, regex] of Object.entries(stemMap)) {
    if (regex.test(str)) matched.push(key);
  }
  return matched.sort();
}

async function matchBabluk() {
  const masterRl = readline.createInterface({
    input: fs.createReadStream(MASTER_PATH),
    crlfDelay: Infinity
  });

  const verifiedMatches = [];

  for await (const line of masterRl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    const hasPhoto = p.image_url && !p.image_url.includes('empty_photo') && !p.image_url.includes('no-photo');
    if (!hasPhoto) continue;

    const isBabluk = /бабушкино\s*лукошко/i.test(p.name) || /бабушкино\s*лукошко/i.test(p.brand || '');
    if (!isBabluk) continue;

    const needsKbju = !p.nutriments_json || Object.keys(p.nutriments_json).length === 0;
    const needsComp = !p.ingredients_raw || p.ingredients_raw.trim().length < 5;
    if (!needsKbju && !needsComp) continue;

    const pName = p.name.toLowerCase();

    // Determine category: tea, juice, or puree/meal
    const isTea = /чай/i.test(pName);
    const isJuice = /сок/i.test(pName);
    const isPuree = !isTea && !isJuice;

    const pMeats = matchStems(pName, MEAT_STEMS);
    const pVegFruits = matchStems(pName, VEG_FRUIT_STEMS);
    const pGrains = matchStems(pName, GRAIN_STEMS);
    const pHerbs = matchStems(pName, TEA_HERB_STEMS);

    const isTvorog = /творог/i.test(pName);
    const isMoloko = /молок/i.test(pName);
    const isPouch = /пауч|pouch/i.test(pName);

    // Is it a pure single meat puree (e.g. "Пюре ... говядина с 6мес" without other ingredients)?
    const isPureMeat = (pMeats.length === 1 && pVegFruits.length === 0 && pGrains.length === 0 && !isTvorog && !isMoloko);

    let best = null;
    let bestMatchCount = -1;

    for (const b of bablukItems) {
      const bTitle = b.product_name.toLowerCase();

      // Form category gate
      const bIsTea = /чай/i.test(bTitle);
      const bIsJuice = /сок/i.test(bTitle);
      const bIsPuree = !bIsTea && !bIsJuice;
      if (isTea !== bIsTea || isJuice !== bIsJuice || isPuree !== bIsPuree) continue;

      // Pure meat gate
      const bIsPureMeat = /мясное пюре/i.test(bTitle) && !/овощ|рис|греч/i.test(bTitle);
      if (isPureMeat && !bIsPureMeat) continue;
      if (!isPureMeat && bIsPureMeat && (pVegFruits.length > 0 || pGrains.length > 0)) continue;

      // Meat gate: EXACT identity set
      const bMeats = matchStems(bTitle, MEAT_STEMS);
      if (pMeats.join(',') !== bMeats.join(',')) continue;

      // Veg & Fruit gate: EXACT identity set
      const bVegFruits = matchStems(bTitle, VEG_FRUIT_STEMS);
      if (pVegFruits.join(',') !== bVegFruits.join(',')) continue;

      // Grain gate: EXACT identity set
      const bGrains = matchStems(bTitle, GRAIN_STEMS);
      if (pGrains.join(',') !== bGrains.join(',')) continue;

      // Tea Herb gate: EXACT identity set
      if (isTea) {
        const bHerbs = matchStems(bTitle, TEA_HERB_STEMS);
        if (pHerbs.join(',') !== bHerbs.join(',')) continue;
      }

      // Dairy addition gate
      const bTvorog = /творог/i.test(bTitle);
      const bMoloko = /молок/i.test(bTitle);
      if (isTvorog !== bTvorog || isMoloko !== bMoloko) continue;

      // Pouch preference
      const bIsPouch = /пауч|pouch/i.test(bTitle);

      const totalIngredientsCount = pMeats.length + pVegFruits.length + pGrains.length + pHerbs.length;
      if (totalIngredientsCount > bestMatchCount) {
        bestMatchCount = totalIngredientsCount;
        best = b;
      } else if (totalIngredientsCount === bestMatchCount && isPouch === bIsPouch) {
        best = b;
      }
    }

    if (best && bestMatchCount > 0) {
      const nutriments = {};
      if (best.calories) nutriments.energy_kcal = best.calories;
      if (best.protein !== null) nutriments.protein_100g = best.protein;
      if (best.fat !== null) nutriments.fat_100g = best.fat;
      if (best.carbs !== null) nutriments.carbohydrates_100g = best.carbs;

      verifiedMatches.push({
        masterId: p.id,
        masterEan: p.ean,
        masterName: p.name,
        brand: 'Бабушкино Лукошко',
        manufacturerTitle: best.product_name,
        url: best.source_url,
        score: '1.00',
        nutriments: Object.keys(nutriments).length >= 1 ? nutriments : null,
        composition: best.composition || null
      });
    }
  }

  console.log(`\nVerified Babushkino Lukoshko matches: ${verifiedMatches.length}`);
  fs.writeFileSync(OUT_LOG, verifiedMatches.map(m => JSON.stringify(m)).join('\n') + '\n');
  console.log(`Saved to ${OUT_LOG}`);

  console.log('\n--- Sample Verified Matches ---');
  verifiedMatches.slice(0, 25).forEach((m, i) => {
    console.log(`${i+1}. "${m.masterName}" <=> "${m.manufacturerTitle}"`);
    if (m.nutriments) console.log(`   KBJU: P:${m.nutriments.protein_100g} F:${m.nutriments.fat_100g} C:${m.nutriments.carbohydrates_100g} Cal:${m.nutriments.energy_kcal}`);
    if (m.composition) console.log(`   COMP: ${m.composition}`);
  });
}

matchBabluk().catch(console.error);
