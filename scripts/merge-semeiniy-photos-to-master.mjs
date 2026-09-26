import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function mergePhotos() {
  const masterPath = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
  const semeiniyPath = path.join(__dirname, '..', 'data', 'semeiniy_raw_products.jsonl');
  const backupPath = path.join(__dirname, '..', 'data', 'archive', 'korset_master_catalog_v4_final_pre_photo_merge.jsonl');
  const tempPath = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.tmp.jsonl');

  console.log('Step 1: Loading Semeiniy studio photos into memory...');
  const semeiniyMap = new Map();
  const sRl = readline.createInterface({
    input: fs.createReadStream(semeiniyPath),
    crlfDelay: Infinity
  });

  for await (const line of sRl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    if (p.ean && p.image_url) {
      semeiniyMap.set(p.ean, p);
    }
  }
  console.log(`Loaded ${semeiniyMap.size} verified Semeiniy photo records.`);

  console.log('Step 2: Backing up current master catalog...');
  if (!fs.existsSync(path.dirname(backupPath))) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  }
  fs.copyFileSync(masterPath, backupPath);
  console.log(`Backup saved to ${backupPath}`);

  console.log('Step 3: Merging photos into master catalog...');
  const mRl = readline.createInterface({
    input: fs.createReadStream(masterPath),
    crlfDelay: Infinity
  });
  const outStream = fs.createWriteStream(tempPath, { flags: 'w' });

  let totalMaster = 0;
  let mergedPhotos = 0;
  let preExistingPhotos = 0;
  let totalWithPhotosNow = 0;

  for await (const line of mRl) {
    if (!line.trim()) continue;
    totalMaster++;
    const masterItem = JSON.parse(line);

    if (masterItem.image_url) {
      preExistingPhotos++;
    }

    const sItem = semeiniyMap.get(masterItem.ean);
    if (sItem && sItem.image_url) {
      // Non-destructive update of image attributes
      masterItem.image_url = sItem.image_url;
      masterItem.images = (sItem.images && sItem.images.length > 0) ? sItem.images : [sItem.image_url];
      masterItem.original_image_url = sItem.image_url;
      mergedPhotos++;

      // Non-destructively fill ingredients_raw if empty
      if (!masterItem.ingredients_raw && sItem.ingredients_raw) {
        masterItem.ingredients_raw = sItem.ingredients_raw;
      }
      // Non-destructively fill description if empty
      if (!masterItem.description && sItem.description) {
        masterItem.description = sItem.description;
      }
    }

    if (masterItem.image_url) {
      totalWithPhotosNow++;
    }

    outStream.write(JSON.stringify(masterItem) + '\n');
  }

  await new Promise((resolve) => outStream.end(resolve));

  console.log('Step 4: Verifying merged output...');
  console.log(`Total master items processed: ${totalMaster}`);
  console.log(`Merged Semeiniy studio photos: ${mergedPhotos}`);
  console.log(`Pre-existing photos: ${preExistingPhotos}`);
  console.log(`Total master items with studio photos now: ${totalWithPhotosNow} (${((totalWithPhotosNow / totalMaster) * 100).toFixed(1)}%)`);

  if (totalMaster === 58643) {
    // Atomically replace the master file
    fs.renameSync(tempPath, masterPath);
    console.log('SUCCESS: korset_master_catalog_v4_final.jsonl updated cleanly.');
  } else {
    throw new Error(`Integrity check failed: expected 58643 master items, got ${totalMaster}`);
  }
}

mergePhotos().catch((err) => {
  console.error('Merge failed:', err);
  process.exit(1);
});
