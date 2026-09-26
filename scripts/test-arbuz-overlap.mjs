import fs from 'fs';
import readline from 'readline';

async function testArbuzMasterOverlap() {
  console.log('Loading Arbuz enriched catalog (9,302 EANs)...');
  const arbuzEanMap = new Map();
  const rlArbuz = readline.createInterface({ input: fs.createReadStream('data/arbuz_enriched_catalog.jsonl') });
  for await (const line of rlArbuz) {
    if (!line.trim()) continue;
    try {
      const p = JSON.parse(line);
      if (p.ean && /^\d{8,14}$/.test(p.ean)) {
        arbuzEanMap.set(p.ean, p);
      }
    } catch {}
  }
  console.log(`Loaded ${arbuzEanMap.size} unique valid EANs from Arbuz!`);

  console.log('Matching against Korset Master Catalog (58,643 products)...');
  const rlMaster = readline.createInterface({ input: fs.createReadStream('data/korset_master_catalog_v4_final.jsonl') });
  let totalMaster = 0;
  let directMatches = 0;
  let newIngredients = 0;
  let newNutrition = 0;
  let newShelfLife = 0;
  let newHalal = 0;
  let newStorage = 0;
  let newCountry = 0;

  for await (const line of rlMaster) {
    if (!line.trim()) continue;
    totalMaster++;
    const m = JSON.parse(line);
    const arbuzMatch = arbuzEanMap.get(m.ean);
    if (arbuzMatch) {
      directMatches++;

      const masterHasIng = Boolean(m.ingredients_raw && m.ingredients_raw.trim().length > 3);
      if (!masterHasIng && arbuzMatch.ingredients_raw) newIngredients++;

      const masterHasNutr = Boolean(m.nutriments_json && Object.keys(m.nutriments_json).length > 0 &&
        (m.nutriments_json.energy_kcal || m.nutriments_json.protein_100g || m.nutriments_json.fat_100g));
      const arbuzHasNutr = Boolean(arbuzMatch.nutriments_json &&
        (arbuzMatch.nutriments_json.energy_kcal || arbuzMatch.nutriments_json.protein_100g || arbuzMatch.nutriments_json.fat_100g));
      if (!masterHasNutr && arbuzHasNutr) newNutrition++;

      const masterHasShelf = Boolean(m.shelf_life && String(m.shelf_life).trim().length > 0);
      if (!masterHasShelf && arbuzMatch.shelf_life_days) newShelfLife++;

      const masterHasHalal = Boolean(m.halal_status && m.halal_status !== 'unknown');
      if (!masterHasHalal && arbuzMatch.halal_status === 'yes') newHalal++;

      const masterHasStorage = Boolean(m.storage_conditions && m.storage_conditions.trim().length > 3);
      if (!masterHasStorage && arbuzMatch.storage_conditions) newStorage++;

      const masterHasCountry = Boolean(m.country_of_origin && m.country_of_origin.trim().length > 0);
      if (!masterHasCountry && arbuzMatch.producer_country) newCountry++;
    }
  }

  console.log(`\n=== ARBUZ EXACT EAN MATCH RESULTS ===`);
  console.log(`Total Master products: ${totalMaster}`);
  console.log(`Direct 100% Exact EAN Matches: ${directMatches}`);
  console.log(`New Ingredients gained: +${newIngredients}`);
  console.log(`New Nutrition (КБЖУ) gained: +${newNutrition}`);
  console.log(`New Shelf Life gained: +${newShelfLife}`);
  console.log(`New Storage Conditions gained: +${newStorage}`);
  console.log(`New Country gained: +${newCountry}`);
  console.log(`New Halal Status gained: +${newHalal}`);
}

testArbuzMasterOverlap().catch(console.error);
