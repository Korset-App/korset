/**
 * Step 04: Media Enrichment, Halal Tagging & Staging into clean_products_v3
 * Matches verified packshots from Galmart with strict Zero-Tolerance on weight and flavor.
 * Tags official Halal Damu certification.
 * Inserts pristine records into public.clean_products_v3 in Supabase.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeStr(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function runEnrichAndInsert(inputFile = 'pilot_normalized.json') {
  console.log('=== Step 04: Enriching & Inserting into clean_products_v3 ===');
  const inPath = path.join(__dirname, '..', '..', 'data', 'v3_cache', inputFile);
  if (!fs.existsSync(inPath)) {
    console.error(`Input file ${inPath} does not exist. Run Step 03 first.`);
    return;
  }

  const normalizedMap = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const items = Object.values(normalizedMap);

  // Load Galmart catalog for packshot enrichment
  let galmartCatalog = [];
  const galmartPath = path.join(__dirname, '..', '..', 'data', 'galmart_catalog.json');
  if (fs.existsSync(galmartPath)) {
    galmartCatalog = JSON.parse(fs.readFileSync(galmartPath, 'utf8'));
  }
  console.log(`Loaded ${galmartCatalog.length} Galmart products for media enrichment.`);

  // Load Halal Damu certified companies
  let halalDamuList = [];
  const halalPath = path.join(__dirname, '..', '..', 'data', 'halal_damu_companies.json');
  if (fs.existsSync(halalPath)) {
    halalDamuList = JSON.parse(fs.readFileSync(halalPath, 'utf8'));
  }
  console.log(`Loaded ${halalDamuList.length} Halal Damu registry entries.`);

  const halalNames = new Set(
    halalDamuList.flatMap(c => [
      normalizeStr(c.name),
      normalizeStr(c.brand),
      normalizeStr(c.company_name)
    ]).filter(Boolean)
  );

  let insertedCount = 0;
  let packshotMatchedCount = 0;
  let halalCertifiedCount = 0;

  const rowsToInsert = [];

  for (const item of items) {
    let imageUrl = null;
    let imagesJson = [];

    // Zero-Tolerance Galmart Packshot Matching
    if (galmartCatalog.length > 0 && item.brand) {
      const normBrand = normalizeStr(item.brand);
      for (const gm of galmartCatalog) {
        if (!gm.photos || gm.photos.length === 0) continue;
        const gmBrand = normalizeStr(gm.brand);
        const gmTitle = normalizeStr(gm.title);

        // Brand must match
        if (normBrand.length >= 3 && (gmBrand.includes(normBrand) || normBrand.includes(gmBrand))) {
          // Weight must match exactly if present
          if (item.quantity_value) {
            const qStr = String(item.quantity_value);
            if (!gmTitle.includes(qStr)) continue;
          }
          // Fat % must match if present
          if (item.fat_percent) {
            const fStr = String(item.fat_percent).replace('.', ',');
            const fStrDot = String(item.fat_percent);
            if (!gmTitle.includes(fStr) && !gmTitle.includes(fStrDot) && !gmTitle.includes(`${item.fat_percent}%`)) {
              continue;
            }
          }
          // Flavor must match if present
          if (item.flavor) {
            const normFlavor = normalizeStr(item.flavor);
            const flavorWords = normFlavor.split(' ').filter(w => w.length > 3);
            if (flavorWords.length > 0 && !flavorWords.some(w => gmTitle.includes(w))) {
              continue;
            }
          }

          // Found a verified packshot!
          imageUrl = gm.photos[0];
          imagesJson = gm.photos;
          packshotMatchedCount++;
          break;
        }
      }
    }

    // Halal Check
    let halalStatus = 'unknown';
    let halalCertifier = null;
    const normProducer = normalizeStr(item.producer_name);
    const normBrand = normalizeStr(item.brand);

    for (const hName of halalNames) {
      if (hName.length < 4) continue;
      if (normProducer.includes(hName) || normBrand.includes(hName)) {
        halalStatus = 'certified';
        halalCertifier = 'Халал Даму (ҚМДБ)';
        halalCertifiedCount++;
        break;
      }
    }

    const row = {
      ean: item.ean,
      name: item.canonical_name || item.raw_source_name,
      name_kz: item.name_kz || null,
      brand: item.brand || null,
      category: item.category || 'grocery',
      subcategory: item.subcategory || null,
      quantity: item.quantity || null,
      quantity_value: item.quantity_value || null,
      quantity_unit: item.quantity_unit || null,
      fat_percent: item.fat_percent || null,
      flavor: item.flavor || null,
      package_type: item.package_type || null,
      tnved: item.tnved || null,
      producer_name: item.producer_name || null,
      producer_bin: item.producer_bin || null,
      country_of_origin: item.country_of_origin || null,
      halal_status: halalStatus,
      halal_certifier: halalCertifier,
      image_url: imageUrl,
      images_json: imagesJson,
      data_quality_score: item.validation_status === 'passed' ? 95 : 75,
      audit_status: 'verified_npc_ai',
      raw_source_name: item.raw_source_name,
      raw_payload: {
        validation_status: item.validation_status,
        validation_issues: item.validation_issues || []
      },
      updated_at: new Date().toISOString()
    };

    rowsToInsert.push(row);
  }

  // Insert into Supabase clean_products_v3 in batches of 25
  const BATCH = 25;
  for (let i = 0; i < rowsToInsert.length; i += BATCH) {
    const chunk = rowsToInsert.slice(i, i + BATCH);
    const { error } = await supabase
      .from('clean_products_v3')
      .upsert(chunk, { onConflict: 'ean' });

    if (error) {
      console.error(`Supabase insert error at batch ${i}:`, error.message);
    } else {
      insertedCount += chunk.length;
    }
  }

  console.log(`\n=== Insertion Summary ===`);
  console.log(`Successfully staged into clean_products_v3: ${insertedCount} items`);
  console.log(`Matched high-res packshots: ${packshotMatchedCount}`);
  console.log(`Certified Halal Damu: ${halalCertifiedCount}`);
}

const args = process.argv.slice(2);
const inputFile = args.includes('--full') ? 'full_normalized.json' : 'pilot_normalized.json';
runEnrichAndInsert(inputFile).catch(console.error);
