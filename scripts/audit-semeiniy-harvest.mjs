import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function auditHarvest() {
  const filePath = path.join(__dirname, '..', 'data', 'semeiniy_raw_products.jsonl');
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });

  let total = 0;
  let withPhoto = 0;
  let multiPhoto = 0;
  let withoutPhoto = 0;
  let totalPhotosAcrossCatalog = 0;

  const imageUsage = new Map();
  const sampleWithPhotos = [];
  const sampleWithoutPhotos = [];
  const byCategory = {};

  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    const p = JSON.parse(line);

    const cat = p.category || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, withPhoto: 0, multi: 0 };
    byCategory[cat].total++;

    if (p.image_url) {
      withPhoto++;
      byCategory[cat].withPhoto++;

      const imgs = p.images || [p.image_url];
      totalPhotosAcrossCatalog += imgs.length;

      if (imgs.length > 1) {
        multiPhoto++;
        byCategory[cat].multi++;
      }

      for (const img of imgs) {
        imageUsage.set(img, (imageUsage.get(img) || 0) + 1);
      }

      if (sampleWithPhotos.length < 10) {
        sampleWithPhotos.push({
          name: p.name,
          category: p.category,
          ean: p.ean,
          image_url: p.image_url,
          images_count: imgs.length,
          images: imgs
        });
      }
    } else {
      withoutPhoto++;
      if (sampleWithoutPhotos.length < 5) {
        sampleWithoutPhotos.push({
          name: p.name,
          category: p.category,
          ean: p.ean,
          url: p.source_url
        });
      }
    }
  }

  console.log('====================================================');
  console.log('SEMEINIY PHASE 1 HARVEST AUDIT REPORT');
  console.log('====================================================');
  console.log(`Total Products in Master Catalog: ${total}`);
  console.log(`Products with Verified Studio Packshots: ${withPhoto} (${((withPhoto / total) * 100).toFixed(1)}%)`);
  console.log(`Products with Multi-Angle Packshots: ${multiPhoto} (${((multiPhoto / withPhoto) * 100).toFixed(1)}% of items with photo)`);
  console.log(`Products without photo on Semeiniy: ${withoutPhoto} (${((withoutPhoto / total) * 100).toFixed(1)}%)`);
  console.log(`Total Studio Image Files Captured: ${totalPhotosAcrossCatalog}`);
  console.log(`Unique Studio Images in Catalog: ${imageUsage.size}`);

  // Check top image duplicates (to verify 0 carousel leakage)
  const sortedImages = [...imageUsage.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nTop 5 Most Reused Images across all 58k items:');
  sortedImages.slice(0, 5).forEach(([url, count], i) => {
    console.log(` [${i + 1}] Reused on ${count} items: ${url}`);
  });

  console.log('\nCategory Breakdown:');
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
  for (const [cat, s] of sortedCats) {
    const pct = ((s.withPhoto / s.total) * 100).toFixed(1);
    console.log(` - ${cat.padEnd(18)}: ${s.withPhoto}/${s.total} (${pct}% photo coverage, ${s.multi} multi-angle)`);
  }

  console.log('\nSample 5 Verified Products with Photos:');
  sampleWithPhotos.slice(0, 5).forEach((p, i) => {
    console.log(`\n[${i + 1}] ${p.name}`);
    console.log(`    Category: ${p.category} | EAN: ${p.ean}`);
    console.log(`    Primary Packshot: ${p.image_url}`);
    console.log(`    Total Angles (${p.images_count}): ${JSON.stringify(p.images)}`);
  });

  console.log('\nSample 5 Products Without Photo (Pending Phase 2 fallback):');
  sampleWithoutPhotos.forEach((p, i) => {
    console.log(` - ${p.name} (EAN: ${p.ean}, Cat: ${p.category})`);
  });

  // Save audit report
  const reportPath = path.join(__dirname, '..', 'data', 'semeiniy_phase1_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    total,
    withPhoto,
    multiPhoto,
    withoutPhoto,
    totalPhotosAcrossCatalog,
    uniqueImages: imageUsage.size,
    byCategory,
    samples: sampleWithPhotos
  }, null, 2));
  console.log(`\nAudit saved to ${reportPath}`);
}

auditHarvest().catch(console.error);
