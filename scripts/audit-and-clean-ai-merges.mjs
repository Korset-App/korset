/**
 * scripts/audit-and-clean-ai-merges.mjs
 * 
 * Deep audit of all 1,775 AI approvals in data/enrichment_matches.jsonl:
 * Detects any flavor/sub-variant divergence (e.g. "яблоко-груша" vs "яблоко", "в масле" vs "с укропом")
 * and rolls back data for those specific items to ensure 100% catalog integrity.
 */

import fs from 'fs';
import readline from 'readline';

const MATCHES_LOG_PATH = 'data/enrichment_matches.jsonl';
const MASTER_PATH = 'data/korset_master_catalog_v4_final.jsonl';
const TEMP_PATH = 'data/korset_master_catalog_v4_final.cleaned.jsonl';

const FLAVORS = [
  'клубник', 'малин', 'вишн', 'черник', 'земляник', 'ежевик', 'смородин',
  'апельсин', 'лимон', 'лайм', 'грейпфрут', 'мандарин',
  'яблок', 'груш', 'персик', 'абрикос', 'слив', 'банан', 'манго', 'ананас', 'кокос',
  'шоколад', 'карамел', 'ваниль', 'кофе', 'орех', 'фундук', 'миндаль', 'арахис',
  'сыр', 'томат', 'чеснок', 'лук', 'укроп', 'петрушк', 'паприк', 'перец',
  'куриц', 'говядин', 'свинин', 'индейк', 'лосос', 'семг', 'тунец', 'краб', 'креветк'
];

async function runAuditAndClean() {
  console.log('Auditing all AI approvals for variant/flavor divergence...');
  const rlLog = readline.createInterface({ input: fs.createReadStream(MATCHES_LOG_PATH) });
  
  const contaminatedEans = new Map();
  let totalApproved = 0;

  for await (const line of rlLog) {
    if (!line.trim()) continue;
    const m = JSON.parse(line);
    if (!m.isMatch) continue;
    totalApproved++;

    const mName = (m.masterName || '').toLowerCase();
    const dName = (m.donorName || '').toLowerCase();

    // Ignore known false-alarm substrings
    const cleanM = mName
      .replace(/игрушк\w*/g, '')
      .replace(/лимонад\w*/g, '')
      .replace(/т\/с/g, 'томат')
      .replace(/в\/с/g, '')
      .replace(/в\/м/g, '');

    const cleanD = dName
      .replace(/игрушк\w*/g, '')
      .replace(/лимонад\w*/g, '')
      .replace(/т\/с/g, 'томат')
      .replace(/в\/с/g, '')
      .replace(/в\/м/g, '');

    const mFlavors = new Set(FLAVORS.filter(f => cleanM.includes(f)));
    const dFlavors = new Set(FLAVORS.filter(f => cleanD.includes(f)));

    // Find flavors in Master that are missing in Donor, or vice versa
    const diffMD = [...mFlavors].filter(f => !dFlavors.has(f));
    const diffDM = [...dFlavors].filter(f => !mFlavors.has(f));

    if (diffMD.length > 0 || diffDM.length > 0) {
      // Exclude harmless pairings like "шоколадный" vs "с шоколадной глазурью"
      const isHarmless = (diffMD.length === 0 && diffDM.every(f => dName.includes(f) && mName.includes('шоколад')));
      if (!isHarmless) {
        contaminatedEans.set(m.masterEan, {
          master: m.masterName,
          donor: m.donorName,
          mDiff: diffMD,
          dDiff: diffDM,
          rationale: m.rationale
        });
      }
    }
  }

  console.log(`Total Approved pairs analyzed: ${totalApproved}`);
  console.log(`Identified variant/flavor divergences to revert: ${contaminatedEans.size}`);

  for (const [ean, info] of contaminatedEans) {
    console.log(`\nReverting EAN: ${ean}`);
    console.log(`  Master: ${info.master} (Flavors: ${info.mDiff.join(', ') || 'none'})`);
    console.log(`  Donor:  ${info.donor} (Flavors: ${info.dDiff.join(', ') || 'none'})`);
  }

  // Now clean Master catalog by resetting contaminated products' ingredients & nutriments back to null
  if (contaminatedEans.size > 0) {
    console.log('\nCleaning Master Catalog from contaminated pairs...');
    const rlM = readline.createInterface({ input: fs.createReadStream(MASTER_PATH) });
    const outStream = fs.createWriteStream(TEMP_PATH, { encoding: 'utf8' });

    let cleanedCount = 0;
    for await (const line of rlM) {
      if (!line.trim()) continue;
      const p = JSON.parse(line);
      if (contaminatedEans.has(p.ean)) {
        p.ingredients_raw = null;
        p.nutriments_json = null;
        cleanedCount++;
      }
      outStream.write(JSON.stringify(p) + '\n');
    }

    await new Promise(r => outStream.end(r));
    fs.renameSync(TEMP_PATH, MASTER_PATH);
    console.log(`Successfully cleaned ${cleanedCount} contaminated products from Master Catalog!`);
  }
}

runAuditAndClean();
