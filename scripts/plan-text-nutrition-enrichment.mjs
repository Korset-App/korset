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

const PROPOSAL_PATH = path.join(__dirname, '..', 'scratch', 'text-nutrition-enrichment-proposal-2026-09-29.jsonl');
const SQL_PATH = path.join(__dirname, '..', 'scratch', 'apply-text-nutrition-enrichment-2026-09-29.sql');

function parseNum(str) {
  if (!str) return null;
  const clean = str.replace(',', '.').trim();
  const num = parseFloat(clean);
  return Number.isFinite(num) ? num : null;
}

function extractNutrition(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  // Protein
  let protein = null;
  let pMatch = lower.match(/(?:бел(?:ок|ка|ков|ки|ком)?|ақуыздар?)(?:\s+(?:на|в)\s+\d+\s*(?:г|гр|мл)(?:\s+продукта)?)?(?:[,\s]+(?:г|гр|g))?[\s:\-—–=]+(\d+(?:[.,]\d+)?)/i);
  if (!pMatch) {
    pMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм|г\.|g)?[\s:\-—–]*(?:бел(?:ок|ка|ков|ки|ком)?|ақуыз)/i);
  }
  if (pMatch) protein = parseNum(pMatch[1]);

  // Fat
  let fat = null;
  let fMatch = lower.match(/(?:жир(?:ы|ов|а|ом)?|майлар?)(?:\s+(?:на|в)\s+\d+\s*(?:г|гр|мл)(?:\s+продукта)?)?(?:[,\s]+(?:г|гр|g))?[\s:\-—–=]+(\d+(?:[.,]\d+)?)/i);
  if (!fMatch) {
    fMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм|г\.|g)?[\s:\-—–]*(?:жир(?:а|ов|ы|ом)?|май)/i);
  }
  if (fMatch) fat = parseNum(fMatch[1]);

  // Carbohydrates
  let carbs = null;
  let cMatch = lower.match(/(?:углевод(?:ы|ов|а|ом)?|көмірсулар?)(?:\s+(?:на|в)\s+\d+\s*(?:г|гр|мл)(?:\s+продукта)?)?(?:[,\s]+(?:г|гр|g))?[\s:\-—–=]+(\d+(?:[.,]\d+)?)/i);
  if (!cMatch) {
    cMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм|г\.|g)?[\s:\-—–]*(?:углевод(?:а|ов|ы|ом)?|көмірсу)/i);
  }
  if (cMatch) carbs = parseNum(cMatch[1]);

  // Energy
  let energy_kcal = null;
  let eMatch = lower.match(/(?:калорийность|энергетическая\s+ценность)(?:\s+(?:на|в)\s+\d+\s*(?:г|гр|мл)(?:\s+продукта)?)?[\s:\-—–=]+(?:(?:\d+\s*кдж\s*\(?|\d+\s*kj\s*\(?))?(\d+(?:[.,]\d+)?)\s*(?:ккал|kcal)?/i);
  if (eMatch && parseNum(eMatch[1]) > 5 && parseNum(eMatch[1]) < 950) {
    energy_kcal = parseNum(eMatch[1]);
  } else {
    const directKcal = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:ккал|kcal)\b/i);
    if (directKcal && parseNum(directKcal[1]) > 5 && parseNum(directKcal[1]) < 950) {
      energy_kcal = parseNum(directKcal[1]);
    } else {
      const kjMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:кдж|kj)\b/i);
      if (kjMatch) {
        const kj = parseNum(kjMatch[1]);
        if (kj) energy_kcal = Math.round(kj / 4.184);
      }
    }
  }

  if (protein == null || fat == null || carbs == null) {
    return null;
  }

  if (energy_kcal == null) {
    energy_kcal = Math.round(protein * 4 + fat * 9 + carbs * 4);
  }

  // Plausibility
  if (protein < 0 || protein > 100) return null;
  if (fat < 0 || fat > 100) return null;
  if (carbs < 0 || carbs > 100) return null;
  if (protein + fat + carbs > 105) return null;
  if (energy_kcal < 0 || energy_kcal > 950) return null;

  // Macro check
  const calculatedEnergy = protein * 4 + fat * 9 + carbs * 4;
  if (Math.abs(calculatedEnergy - energy_kcal) > Math.max(80, energy_kcal * 0.4)) {
    return null;
  }

  return {
    energy_kcal: Math.round(energy_kcal),
    energy_kj: Math.round(energy_kcal * 4.184),
    protein_100g: Number(protein.toFixed(1)),
    fat_100g: Number(fat.toFixed(1)),
    carbohydrates_100g: Number(carbs.toFixed(1))
  };
}

function extractCompositionFromDescription(desc) {
  if (!desc || typeof desc !== 'string') return null;
  const match = desc.match(/(?:^|\n|\.\s+)(?:состав|құрамы)[\s:\-—–]+([^.]+?(?:\([^)]+\)[^.]*?)*\.)/i);
  if (match) {
    const raw = match[1].trim();
    if (raw.length > 10 && raw.length < 1500) {
      // Ensure it doesn't contain nutrition or manufacturer marketing
      const cutIdx = raw.search(/пищевая\s+ценность|энергетическая\s+ценность|условия\s+хранения|срок\s+годности/i);
      const clean = cutIdx !== -1 ? raw.slice(0, cutIdx).trim() : raw;
      if (clean.length > 10) return clean.replace(/[,.:;*—–\-]+$/, '').trim();
    }
  }
  return null;
}

function extractShelfLife(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/(?:срок\s+(?:годности|хранения)|жарамдылық\s+мерзімі)[\s:\-—–]+(\d+\s*(?:месяц(?:ев|а)?|дн(?:ей|я)?|сут(?:ок|ки)?|год(?:а)?|лет|час(?:ов|а)?))/i);
  if (match) {
    return match[1].trim();
  }
  return null;
}

function extractStorageConditions(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/(?:условия\s+хранения[\s:\-—–]+|хранить\s+при\s+температуре\s+)([^.\n]+?(?:от\s*[-+]?\d+.*?до\s*[-+]?\d+.*?(?:°с|c|градусов)[^.\n]*?))/i);
  if (match) {
    const res = match[1].trim();
    if (res.length > 5 && res.length < 200) return res;
  }
  return null;
}

function cleanExistingIngredients(text) {
  if (!text) return null;
  const markers = [
    /пищевая\s+ценность/i,
    /средние\s+значения\s+пищевой\s+ценности/i,
    /энергетическая\s+ценность/i,
    /условия\s+хранения/i,
    /хранить\s+при/i,
    /срок\s+годности/i
  ];
  let cutIdx = text.length;
  for (const m of markers) {
    const idx = text.search(m);
    if (idx !== -1 && idx < cutIdx && idx > 20) {
      cutIdx = idx;
    }
  }
  const cleaned = text.slice(0, cutIdx).trim().replace(/[,.:;*—–\-]+$/, '').trim();
  return (cleaned.length >= 10 && cleaned !== text) ? cleaned : null;
}

async function main() {
  console.log('=== Planning Text Nutrition Extraction (Step 3) ===\n');

  console.log('Fetching active food items without full KBJU from Supabase...');
  let page = 0;
  const pageSize = 1000;
  const candidateItems = [];

  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('id, ean, name, brand, category, subcategory, nutriments_json, ingredients_raw, description, shelf_life, storage_conditions, specs_json')
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

  const proposals = [];

  for (const item of candidateItems) {
    // Try extracting nutrition from ingredients_raw first, then from description
    let nutr = extractNutrition(item.ingredients_raw);
    let nutrSource = 'ingredients_raw';

    if (!nutr) {
      nutr = extractNutrition(item.description);
      nutrSource = 'description';
    }

    if (!nutr) continue;

    const updates = {
      nutriments_json: {
        ...(item.nutriments_json || {}),
        ...nutr
      }
    };

    // If ingredients_raw had nutrition text appended, clean it
    const cleanedIng = cleanExistingIngredients(item.ingredients_raw);
    if (cleanedIng) {
      updates.ingredients_raw = cleanedIng;
    } else if (!item.ingredients_raw || item.ingredients_raw.trim().length < 10) {
      // Try extracting composition from description
      const extractedComp = extractCompositionFromDescription(item.description);
      if (extractedComp) {
        updates.ingredients_raw = extractedComp;
      }
    }

    // Try extracting shelf_life if missing
    if (!item.shelf_life || item.shelf_life.trim().length === 0) {
      const sl = extractShelfLife(item.description) || extractShelfLife(item.ingredients_raw);
      if (sl) updates.shelf_life = sl;
    }

    // Try extracting storage_conditions if missing
    if (!item.storage_conditions || item.storage_conditions.trim().length === 0) {
      const sc = extractStorageConditions(item.description) || extractStorageConditions(item.ingredients_raw);
      if (sc) updates.storage_conditions = sc;
    }

    proposals.push({
      ean: item.ean,
      id: item.id,
      name: item.name,
      category: item.category,
      nutrSource,
      updates,
      provenance: {
        text_extracted_provenance: {
          source_field: nutrSource,
          extracted_at: new Date().toISOString()
        }
      }
    });
  }

  console.log(`=== TEXT NUTRITION EXTRACTION SUMMARY ===`);
  console.log(`Total candidate products without full KBJU: ${candidateItems.length}`);
  console.log(`Identified products with high-confidence extracted KBJU: ${proposals.length}`);

  const byCat = {};
  proposals.forEach(p => byCat[p.category] = (byCat[p.category] || 0) + 1);
  console.log('\nExtracted by category:');
  for (const [c, n] of Object.entries(byCat)) {
    console.log(`  - ${c}: ${n} products`);
  }

  console.log('\nSample 15 items:');
  proposals.slice(0, 15).forEach((x, i) => {
    console.log(`${i + 1}. [${x.ean}] ${x.name}`);
    console.log(`   KBJU: ${JSON.stringify(x.updates.nutriments_json)} (source: ${x.nutrSource})`);
    if (x.updates.ingredients_raw) console.log(`   Ingredients: "${x.updates.ingredients_raw.slice(0, 70)}..."`);
    if (x.updates.shelf_life) console.log(`   Shelf life: "${x.updates.shelf_life}"`);
    if (x.updates.storage_conditions) console.log(`   Storage: "${x.updates.storage_conditions}"`);
  });

  fs.writeFileSync(PROPOSAL_PATH, proposals.map(p => JSON.stringify(p)).join('\n') + '\n', 'utf8');
  console.log(`\nWrote proposal to ${PROPOSAL_PATH}`);

  // Generate SQL
  let sqlStatements = [];
  for (const p of proposals) {
    const sets = [];
    sets.push(`nutriments_json = '${JSON.stringify(p.updates.nutriments_json).replace(/'/g, "''")}'::jsonb`);
    if (p.updates.ingredients_raw) sets.push(`ingredients_raw = '${p.updates.ingredients_raw.replace(/'/g, "''")}'`);
    if (p.updates.shelf_life) sets.push(`shelf_life = '${p.updates.shelf_life.replace(/'/g, "''")}'`);
    if (p.updates.storage_conditions) sets.push(`storage_conditions = '${p.updates.storage_conditions.replace(/'/g, "''")}'`);
    sets.push(`specs_json = jsonb_set(COALESCE(specs_json, '{}'::jsonb), '{text_extracted_provenance}', '${JSON.stringify(p.provenance.text_extracted_provenance).replace(/'/g, "''")}'::jsonb, true)`);
    sets.push(`updated_at = NOW()`);

    sqlStatements.push(`UPDATE global_products SET ${sets.join(', ')} WHERE ean = '${p.ean}';`);
  }

  fs.writeFileSync(SQL_PATH, `-- Text nutrition extraction batch 2026-09-29\n${sqlStatements.join('\n')}\n`, 'utf8');
  console.log(`Wrote SQL to ${SQL_PATH}`);
}

main().catch(console.error);
