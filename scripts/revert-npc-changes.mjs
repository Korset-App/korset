import fs from 'fs';
import readline from 'readline';

const MASTER_PATH = 'data/korset_master_catalog_v4_final.jsonl';
const TEMP_PATH = 'data/korset_master_catalog_v4_final.tmp.jsonl';

async function revertNpc() {
  console.log('Reverting unverified NPC fields from Master Catalog...');
  const rl = readline.createInterface({ input: fs.createReadStream(MASTER_PATH) });
  const outStream = fs.createWriteStream(TEMP_PATH, { encoding: 'utf8' });

  let count = 0;
  let resetKz = 0;
  let resetTnved = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    count++;
    const p = JSON.parse(line);

    // Revert unverified name_kz
    if (p.name_kz) {
      p.name_kz = null;
      resetKz++;
    }

    // Revert unverified TNVED codes
    if (p.specs_json && p.specs_json.tnved) {
      delete p.specs_json.tnved;
      delete p.specs_json.tnved_name;
      if (Object.keys(p.specs_json).length === 0) {
        p.specs_json = null;
      }
      resetTnved++;
    }

    outStream.write(JSON.stringify(p) + '\n');
  }

  await new Promise(r => outStream.end(r));
  fs.renameSync(TEMP_PATH, MASTER_PATH);

  console.log(`Reversion complete:`);
  console.log(`  Total products preserved: ${count}`);
  console.log(`  Reset dirty name_kz: ${resetKz}`);
  console.log(`  Reset dirty TNVED: ${resetTnved}`);
}

revertNpc();
