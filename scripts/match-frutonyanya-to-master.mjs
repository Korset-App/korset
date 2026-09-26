import fs from 'fs';
import readline from 'readline';
import { extractNormalizedWeight, areWeightsCompatible } from './utils/retail-tokenizer.mjs';

const MASTER_PATH = 'data/korset_master_catalog_v4_final.jsonl';
const FN_PATH = 'data/frutonyanya_official_catalog.json';
const OUT_LOG = 'data/frutonyanya_matches.jsonl';

const MEAT_STEMS = {
  говядина: /говяд/i,
  индейка: /индей/i,
  кролик: /кролик/i,
  цыпленок: /цыпл/i,
  телятина: /телят/i
};

const VEG_FRUIT_STEMS = {
  кабачок: /кабач/i,
  брокколи: /броккол/i,
  цветная_капуста: /цветн.*капуст|капуст.*цветн/i,
  морковь: /морков/i,
  тыква: /тыкв/i,
  овощи: /овощ/i,
  яблоко: /яблок|яблоч/i,
  груша: /груш/i,
  персик: /персик/i,
  банан: /банан/i,
  манго: /манго/i,
  малина: /малин/i,
  земляника: /землян/i,
  клубника: /клубник/i,
  ежевика: /ежевик/i,
  черника: /черник/i,
  вишня: /вишн/i,
  черешня: /черешн/i,
  абрикос: /абрикос/i,
  чернослив: /чернослив/i,
  маракуйя: /маракуй/i,
  шиповник: /шиповник/i,
  ягода: /ягод/i,
  пломбир: /пломбир/i,
  классический: /классич/i,
  ромашка: /ромашк/i,
  липа: /лип/i
};

const GRAIN_STEMS = {
  овсянка: /овсян/i,
  гречка: /греч/i,
  рис: /рис/i,
  кукуруза: /кукуруз/i,
  мультизлак: /мультизлак|злак/i
};

const DAIRY_STEMS = {
  творог: /творог/i,
  сливки: /сливк/i,
  молоко: /молок/i,
  йогурт: /йогурт/i
};

function matchStems(str, stemMap) {
  const matched = [];
  for (const [key, regex] of Object.entries(stemMap)) {
    if (regex.test(str)) matched.push(key);
  }
  return matched.sort();
}

function getFormType(str) {
  const s = str.toLowerCase();
  if (/сок/i.test(s)) return 'сок';
  if (/нектар/i.test(s)) return 'нектар';
  if (/морс/i.test(s)) return 'морс';
  if (/сухая каша|каша сухая/i.test(s)) return 'каша_сухая';
  if (/каша/i.test(s)) return 'каша_жидкая';
  if (/коктейль/i.test(s)) return 'коктейль';
  if (/кисель/i.test(s)) return 'кисель';
  if (/кусочки/i.test(s)) return 'кусочки';
  if (/палочки/i.test(s)) return 'палочки';
  if (/печенье/i.test(s)) return 'печенье';
  if (/хлебцы/i.test(s)) return 'хлебцы';
  if (/пазл/i.test(s)) return 'пазлы';
  if (/звездочки|паффс/i.test(s)) return 'звездочки';
  if (/батончик/i.test(s)) return 'батончик';
  if (/биотворог|творог/i.test(s)) return 'творог';
  if (/вода/i.test(s)) return 'вода';
  return 'пюре';
}

async function matchFn() {
  const fnItems = JSON.parse(fs.readFileSync(FN_PATH, 'utf8'));
  console.log(`Loaded ${fnItems.length} official FrutoNyanya items.`);

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

    const isFn = /фруто\s*няня/i.test(p.name) || /фруто\s*няня/i.test(p.brand || '');
    if (!isFn) continue;

    const needsKbju = !p.nutriments_json || Object.keys(p.nutriments_json).length === 0;
    const needsComp = !p.ingredients_raw || p.ingredients_raw.trim().length < 5;
    if (!needsKbju && !needsComp) continue;

    const pName = p.name.toLowerCase();
    const pForm = getFormType(pName);

    const pMeats = matchStems(pName, MEAT_STEMS);
    const pVegFruits = matchStems(pName, VEG_FRUIT_STEMS);
    const pGrains = matchStems(pName, GRAIN_STEMS);
    const pDairy = matchStems(pName, DAIRY_STEMS);

    const pWeight = extractNormalizedWeight(p.name);
    const isPouch = /пауч|pouch/i.test(pName);

    let best = null;
    let bestMatchCount = -1;

    for (const b of fnItems) {
      const bTitle = b.product_name.toLowerCase();
      const bForm = getFormType(bTitle);

      // Form category gate
      if (pForm !== bForm) continue;

      // Meat gate: EXACT identity set
      const bMeats = matchStems(bTitle, MEAT_STEMS);
      if (pMeats.join(',') !== bMeats.join(',')) continue;

      // Veg & Fruit gate: EXACT identity set
      const bVegFruits = matchStems(bTitle, VEG_FRUIT_STEMS);
      if (pVegFruits.join(',') !== bVegFruits.join(',')) continue;

      // Grain gate: EXACT identity set
      const bGrains = matchStems(bTitle, GRAIN_STEMS);
      if (pGrains.join(',') !== bGrains.join(',')) continue;

      // Dairy gate: EXACT identity set
      const bDairy = matchStems(bTitle, DAIRY_STEMS);
      if (pDairy.join(',') !== bDairy.join(',')) continue;

      // Weight compatibility gate
      const bWeight = extractNormalizedWeight(b.product_name);
      if (!areWeightsCompatible(pWeight, bWeight)) continue;

      // Pouch check
      const bIsPouch = /пауч|pouch/i.test(bTitle);

      const totalIngredientsCount = pMeats.length + pVegFruits.length + pGrains.length + pDairy.length;
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

      // Sanity check on composition for fruit/berry products
      let comp = best.composition;
      if (comp && pVegFruits.includes('клубника') && comp.includes('какао-порошок') && !comp.includes('клубник')) {
        comp = null;
      }

      verifiedMatches.push({
        masterId: p.id,
        masterEan: p.ean,
        masterName: p.name,
        brand: 'ФрутоНяня',
        manufacturerTitle: best.product_name,
        url: best.source_url,
        score: '1.00',
        nutriments: Object.keys(nutriments).length >= 1 ? nutriments : null,
        composition: comp || null
      });
    }
  }

  console.log(`\nVerified FrutoNyanya matches: ${verifiedMatches.length}`);
  fs.writeFileSync(OUT_LOG, verifiedMatches.map(m => JSON.stringify(m)).join('\n') + '\n');
  console.log(`Saved to ${OUT_LOG}`);

  console.log('\n--- Sample Verified Matches ---');
  verifiedMatches.slice(0, 20).forEach((m, i) => {
    console.log(`${i+1}. "${m.masterName}" <=> "${m.manufacturerTitle}"`);
    if (m.nutriments) console.log(`   KBJU: P:${m.nutriments.protein_100g} F:${m.nutriments.fat_100g} C:${m.nutriments.carbohydrates_100g} Cal:${m.nutriments.energy_kcal}`);
    if (m.composition) console.log(`   COMP: ${m.composition ? m.composition.slice(0, 70) + '...' : 'none'}`);
  });
}

matchFn().catch(console.error);
