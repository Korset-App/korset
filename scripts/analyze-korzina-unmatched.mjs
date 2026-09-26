import fs from 'fs';

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[«»"'(),.\-\/\\–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function analyzeKorzinaUnmatched() {
  const matchedNames = new Set(
    fs.readFileSync('data/korzina_matches.jsonl', 'utf8')
      .trim().split('\n').map(l => JSON.parse(l).korzinaName)
  );

  const rawKorzina = JSON.parse(fs.readFileSync('data/korzinavdom_catalog_full.json', 'utf8'));
  const unmatched = [];

  for (const k of rawKorzina) {
    if (matchedNames.has(k.productName)) continue;
    
    // Check if it has valid KBJU
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
      unmatched.push({ name: k.productName, brand: k.brand, cal, prot, fat, carb });
    }
  }

  console.log('Total unmatched Korzina items with KBJU:', unmatched.length);
  console.log('\nSample 25 unmatched items:');
  unmatched.slice(0, 25).forEach(u => console.log(`- "${u.name}" (Brand: ${u.brand})`));
}

analyzeKorzinaUnmatched().catch(console.error);
