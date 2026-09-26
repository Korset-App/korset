import fs from 'fs';
import readline from 'readline';

async function auditAbbreviations() {
  const rl = readline.createInterface({ input: fs.createReadStream('data/korset_master_catalog_v4_final.jsonl') });
  const counts = {};
  const regex = /(?:^|\s)(к\/у|м\/у|д\/п|т\/п|в\/у|ж\/б|ст\/б|с\/бут|п\/бут|пэт|в\/с|1\/с|б\/к|с\/к|в\/к|п\/к|б\/г|с\/м|б\/а|кор|фас|вес)(?:\s|$|[.,])/gi;

  let total = 0;
  let withAbbr = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    const p = JSON.parse(line);
    const text = p.name || '';
    regex.lastIndex = 0;
    let match;
    let foundAny = false;
    while ((match = regex.exec(text)) !== null) {
      foundAny = true;
      const lower = match[1].toLowerCase();
      counts[lower] = (counts[lower] || 0) + 1;
    }
    if (foundAny) withAbbr++;
  }

  console.log(`Total Master products: ${total}`);
  console.log(`Products containing retail abbreviations: ${withAbbr} (${Math.round(withAbbr / total * 100)}%)`);
  console.log('Abbreviation frequencies:');
  for (const [abbr, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${abbr.padEnd(8)}: ${count}`);
  }
}

auditAbbreviations().catch(console.error);
