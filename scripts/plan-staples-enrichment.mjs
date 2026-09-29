import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\s]+)/)[1];
const sb = createClient(supabaseUrl, supabaseKey);

const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', 'staples-enrichment-proposal-2026-09-29.jsonl');
const SQL_PATH = path.join(__dirname, '..', 'scratch', 'apply-staples-enrichment-2026-09-29.sql');
const ROLLBACK_SQL_PATH = path.join(__dirname, '..', 'scratch', 'rollback-staples-enrichment-2026-09-29.sql');

async function main() {
  console.log('=== Planning Staples Enrichment (Water, Salt, Sugar, Pure Vegetable Oil) ===\n');

  // Fetch all active food products with photos that lack full KBJU
  console.log('Fetching active food items without full KBJU from Supabase...');
  let page = 0;
  const pageSize = 1000;
  const candidateItems = [];

  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, name, brand, category, subcategory, nutriments_json, ingredients_raw, nutriscore, nova_group, specs_json')
      .eq('is_active', true)
      .not('category', 'in', '(household,personal_care)')
      .not('image_url', 'is', null)
      .not('image_url', 'like', '%empty_photo%')
      .not('image_url', 'like', '%no-photo%')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      process.exit(1);
    }

    for (const item of data) {
      const nut = item.nutriments_json;
      const hasFullKbju = nut &&
        nut.energy_kcal !== undefined && nut.energy_kcal !== null &&
        nut.protein_100g !== undefined && nut.protein_100g !== null &&
        nut.fat_100g !== undefined && nut.fat_100g !== null &&
        nut.carbohydrates_100g !== undefined && nut.carbohydrates_100g !== null;

      if (!hasFullKbju) {
        candidateItems.push(item);
      }
    }

    if (data.length < pageSize) break;
    page++;
  }

  console.log(`Loaded ${candidateItems.length} candidate items lacking full KBJU.\n`);

  // Classify candidates with strict audited conservative rules
  const proposals = [];

  const FLAVOR_WORDS = [
    'лимон', 'малин', 'клубник', 'облепих', 'мят', 'ягод', 'фрукт',
    'грейпфрут', 'апельсин', 'лайм', 'арбуз', 'огурец', 'яблок', 'гранат',
    'можжевельник', 'черник', 'вишн', 'персик', 'манго', 'со вкусом',
    'аромат', 'сладкая', 'лимонад', 'напиток', 'сок', 'чай', 'сироп',
    'коллаген', 'витамин', 'кислород', 'детская косметика', 'содовая'
  ];

  const SALT_EXCLUDES = [
    'фасоль', 'рассол', 'ванн', 'сванск', 'адыгейск', 'приправ', 'специ',
    'пряност', 'соус', 'чипс', 'сухарик', 'печень', 'орех', 'рыб', 'икр',
    'трав', 'чеснок', 'перец', 'розмарин', 'копчен', 'копчён', 'мельниц',
    'смесь', 'кавказск', 'чесночн', 'жидкая', 'попкорн', 'палочки'
  ];

  const SUGAR_EXCLUDES = [
    'без сахара', 'заменитель', 'вместо сахара', 'пальмов', 'кокосов',
    'виноградн', 'ваниль', 'пудр', 'печень', 'глазур', 'десерт', 'сироп',
    'сахарин', 'сорбит', 'фруктоз', 'конфет', 'шоколад', 'горошек', 'кукуруз',
    'смузи', 'пюре', 'каш', 'мюсли', 'низкокалорийн', 'петродиет', 'лимонн',
    'ягод', 'мята', 'кориц', 'аромат', 'вкус'
  ];

  const OIL_EXCLUDES = [
    'сливочн', 'топлен', 'спред', 'маргарин', 'крем', 'эфирн', 'косметич',
    'массаж', 'тел', 'волос', 'соус', 'майонез', 'паст', 'чеснок', 'трав',
    'перец', 'розмарин', 'базилик', 'трюфел', 'добавлен', 'смесь масел'
  ];

  for (const item of candidateItems) {
    const rawName = (item.name || '').trim();
    const nameLower = rawName.toLowerCase();
    const cat = item.category || '';
    const subcat = item.subcategory || '';

    // 1. Water: must start with 'вода'
    const startsWithWater = nameLower.startsWith('вода');
    const hasFlavor = FLAVOR_WORDS.some(w => nameLower.includes(w));
    const isWater = startsWithWater && !hasFlavor && !nameLower.includes('мицелляр') && !nameLower.includes('туалетн');

    // 2. Salt: must start with 'соль'
    const startsWithSalt = nameLower.startsWith('соль');
    const hasSaltExclude = SALT_EXCLUDES.some(w => nameLower.includes(w));
    const isSalt = startsWithSalt && !hasSaltExclude;

    // 3. Sugar: must start with 'сахар'
    const startsWithSugar = nameLower.startsWith('сахар');
    const hasSugarExclude = SUGAR_EXCLUDES.some(w => nameLower.includes(w));
    const isSugar = startsWithSugar && !hasSugarExclude;

    // 4. Pure Vegetable Oil: must start with 'масло'
    const startsWithOil = nameLower.startsWith('масло');
    const isVegOilType = (
      nameLower.includes('подсолнечное') ||
      nameLower.includes('оливковое') ||
      nameLower.includes('кукурузное') ||
      nameLower.includes('рапсовое') ||
      nameLower.includes('льняное') ||
      nameLower.includes('кунжутное') ||
      nameLower.includes('хлопковое')
    );
    const hasOilExclude = OIL_EXCLUDES.some(w => nameLower.includes(w));
    const isOil = startsWithOil && isVegOilType && !hasOilExclude;

    let stapleType = null;
    let newNutriments = null;
    let newNutriscore = null;
    let newNova = null;
    let fallbackIngredient = null;

    if (isWater) {
      stapleType = 'pure_water';
      newNutriments = {
        energy_kcal: 0,
        energy_kj: 0,
        protein_100g: 0,
        fat_100g: 0,
        carbohydrates_100g: 0,
        sugars_100g: 0,
        salt_100g: 0
      };
      newNutriscore = 'A';
      newNova = 1;
      fallbackIngredient = nameLower.includes('минеральная') ? 'Вода минеральная природная питьевая' : 'Вода питьевая';
    } else if (isSalt) {
      stapleType = 'pure_salt';
      newNutriments = {
        energy_kcal: 0,
        energy_kj: 0,
        protein_100g: 0,
        fat_100g: 0,
        carbohydrates_100g: 0,
        sugars_100g: 0,
        salt_100g: 99.5
      };
      newNutriscore = 'A';
      newNova = 1;
      fallbackIngredient = nameLower.includes('морская') ? 'Соль морская пищевая' : 'Соль поваренная пищевая';
    } else if (isSugar) {
      stapleType = 'pure_sugar';
      const isBrown = nameLower.includes('тростниковый');
      newNutriments = {
        energy_kcal: isBrown ? 396 : 398,
        energy_kj: isBrown ? 1683 : 1692,
        protein_100g: 0,
        fat_100g: 0,
        carbohydrates_100g: isBrown ? 99.0 : 99.8,
        sugars_100g: isBrown ? 99.0 : 99.8,
        salt_100g: 0
      };
      newNutriscore = 'E';
      newNova = 2;
      fallbackIngredient = isBrown ? 'Сахар тростниковый нерафинированный' : 'Сахар белый (сахароза)';
    } else if (isOil) {
      stapleType = 'pure_vegetable_oil';
      newNutriments = {
        energy_kcal: 899,
        energy_kj: 3700,
        protein_100g: 0,
        fat_100g: 99.9,
        carbohydrates_100g: 0,
        sugars_100g: 0,
        salt_100g: 0
      };
      newNutriscore = null; // Do not hardcode Nutri-Score for oils (depends on fatty acid ratio)
      newNova = 2; // Culinary ingredient
      if (nameLower.includes('оливковое')) fallbackIngredient = 'Масло оливковое нерафинированное высшего качества';
      else if (nameLower.includes('подсолнечное')) fallbackIngredient = 'Масло подсолнечное рафинированное дезодорированное';
      else if (nameLower.includes('кукурузное')) fallbackIngredient = 'Масло кукурузное рафинированное';
      else fallbackIngredient = 'Масло растительное';
    }

    if (!stapleType) continue;

    // Merge nutriments (keep any extra fields if already present, but fill the KBJU)
    const mergedNutriments = {
      ...(item.nutriments_json || {}),
      ...newNutriments
    };

    const updates = {
      nutriments_json: mergedNutriments
    };

    if (newNova && !item.nova_group) {
      updates.nova_group = newNova;
    }
    if (newNutriscore && !item.nutriscore) {
      updates.nutriscore = newNutriscore;
    }
    if (!item.ingredients_raw || item.ingredients_raw.trim().length <= 3) {
      updates.ingredients_raw = fallbackIngredient;
    }

    proposals.push({
      ean: item.ean,
      id: item.id,
      name: item.name,
      brand: item.brand,
      stapleType,
      updates,
      provenance: {
        staple_reference_provenance: {
          staple_type: stapleType,
          method: 'deterministic_gost_reference',
          applied_at: new Date().toISOString()
        }
      }
    });
  }

  console.log(`Identified ${proposals.length} high-confidence staple products:`);
  const countsByType = {};
  proposals.forEach(p => {
    countsByType[p.stapleType] = (countsByType[p.stapleType] || 0) + 1;
  });
  for (const [t, c] of Object.entries(countsByType)) {
    console.log(`  - ${t}: ${c} products`);
  }

  // Write proposal JSONL
  fs.writeFileSync(PROPOSAL_PATH, proposals.map(p => JSON.stringify(p)).join('\n') + '\n', 'utf8');
  console.log(`\nWrote proposal to ${PROPOSAL_PATH}`);

  // Generate SQL
  let sqlStatements = [];
  let rollbackStatements = [];

  for (const p of proposals) {
    const sets = [];
    sets.push(`nutriments_json = '${JSON.stringify(p.updates.nutriments_json).replace(/'/g, "''")}'::jsonb`);
    if (p.updates.nova_group) sets.push(`nova_group = ${p.updates.nova_group}`);
    if (p.updates.nutriscore) sets.push(`nutriscore = '${p.updates.nutriscore}'`);
    if (p.updates.ingredients_raw) sets.push(`ingredients_raw = '${p.updates.ingredients_raw.replace(/'/g, "''")}'`);
    sets.push(`specs_json = jsonb_set(COALESCE(specs_json, '{}'::jsonb), '{staple_reference_provenance}', '${JSON.stringify(p.provenance.staple_reference_provenance).replace(/'/g, "''")}'::jsonb, true)`);
    sets.push(`updated_at = NOW()`);

    sqlStatements.push(`UPDATE global_products SET ${sets.join(', ')} WHERE ean = '${p.ean}';`);
    rollbackStatements.push(`-- Rollback ${p.ean}`);
  }

  fs.writeFileSync(SQL_PATH, `-- Staples enrichment batch 2026-09-29\n${sqlStatements.join('\n')}\n`, 'utf8');
  fs.writeFileSync(ROLLBACK_SQL_PATH, `-- Rollback script\n${rollbackStatements.join('\n')}\n`, 'utf8');
  console.log(`Wrote SQL to ${SQL_PATH}`);
}

main().catch(console.error);
