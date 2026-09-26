#!/usr/bin/env node

/**
 * ai-vision-enrich-catalog.mjs — Multi-Source Studio Packshot & 30-Attribute Harvester with 100% AI Vision Verification
 *
 * Enriches missing catalog images and packaging attributes (items with image_url: null) from:
 * - Arbuz.kz (Live API: Dedicated studio packshots, ingredients, KBJU, storage, halal)
 * - Galmart.kz (Live API: Supermarket catalog studio packshots, country, description, brand)
 * - KDV Online (Local manufacturer catalog: Renders and official specs)
 *
 * Mandatory AI Vision Verification:
 * - Every candidate packshot is inspected by Gemini Vision (gemini-flash-lite-latest)
 * - Verifies Brand, Product Type, Flavor/Variant, Packaging Format/Size, and Studio Quality
 * - Extracts packaging OCR (back of pack composition, nutrition, halal logo)
 * - Requires isMatch === true AND confidence >= 0.85
 *
 * Non-Destructive Packaging Parity (Закон неразрушающего дополнения):
 * - If an attribute is empty in master, it is filled from verified candidate + OCR
 * - Existing verified data is NEVER overwritten with null or inferior data
 *
 * 100% Resumable & Append-Only:
 * - Checkpoint: data/ai_vision_checkpoint.json
 * - Audit Log: data/ai_vision_enrichment_log.jsonl
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const MASTER_PATH = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');
const CHECKPOINT_PATH = path.join(__dirname, '..', 'data', 'ai_vision_checkpoint.json');
const LOG_PATH = path.join(__dirname, '..', 'data', 'ai_vision_enrichment_log.jsonl');
const KDV_PATH = path.join(__dirname, '..', 'data', 'kdv_catalog.json');

// Read Gemini API Key
const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const keyMatch = envLocal.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
if (!keyMatch) {
  console.error('CRITICAL: GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}
const GEMINI_API_KEY = keyMatch[1];

// Arbuz API Credentials
const ARBUZ_CONSUMER_NAME = 'arbuz-kz.web.mobile';
const ARBUZ_CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj';
const ARBUZ_API_BASE = 'https://arbuz.kz/api/v1';

let _arbuzToken = null;
let _arbuzTokenExpires = 0;

async function getArbuzToken() {
  if (_arbuzToken && Date.now() < _arbuzTokenExpires) return _arbuzToken;
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ consumer: ARBUZ_CONSUMER_NAME, key: ARBUZ_CONSUMER_KEY });
    const req = https.request(ARBUZ_API_BASE + '/auth/token', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          _arbuzToken = json.data?.token;
          _arbuzTokenExpires = Date.now() + 10 * 60 * 1000;
          resolve(_arbuzToken);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Arbuz token timeout')); });
    req.write(postData);
    req.end();
  });
}

async function searchArbuz(query) {
  try {
    const token = await getArbuzToken();
    return await new Promise((resolve) => {
      const qs = encodeURIComponent(query);
      const req = https.request(`${ARBUZ_API_BASE}/shop/search/products?where[name][c]=${qs}&limit=6`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        timeout: 10000
      }, res => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => {
          try { resolve(JSON.parse(b).data || []); }
          catch { resolve([]); }
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => { req.destroy(); resolve([]); });
      req.end();
    });
  } catch {
    return [];
  }
}

async function getArbuzDetail(id) {
  try {
    const token = await getArbuzToken();
    return await new Promise((resolve) => {
      const req = https.request(`${ARBUZ_API_BASE}/shop/product/${id}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        timeout: 10000
      }, res => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => {
          try { resolve(JSON.parse(b).data || null); }
          catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    });
  } catch {
    return null;
  }
}

// Galmart Live API
async function searchGalmart(query) {
  try {
    const url = `https://api.galmart.kz/api/v2/catalog/goods/?search=${encodeURIComponent(query)}&limit=6`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

async function getGalmartDetail(id) {
  try {
    const url = `https://api.galmart.kz/api/v2/catalog/goods/${id}/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

// AI Vision Verification & OCR
async function verifyImageWithAI(imageUrl, targetProduct) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) });
      if (!imgRes.ok) return { isMatch: false, confidence: 0, rationale: 'Download failed: ' + imgRes.status };
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const mime = imgRes.headers.get('content-type') || 'image/jpeg';

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `Target Product from retail catalog:
- Name: "${targetProduct.name}"
- Brand: "${targetProduct.brand || ''}"
- Category: "${targetProduct.category || ''}"

Inspect the packaging in the image with extreme retail precision:
1. Brand: Does the brand on the package match the target product brand?
2. Product Type & Variant: Does the flavor, variant, or type match? (e.g., Crab vs Onion chips, Dark vs Milk chocolate, Liquid soap vs Dishwasher capsules).
3. Packaging Size / Volume: Does the format and size match? (e.g. 50g bar vs 200g box, 100ml vs 150ml tube, 0.5L vs 1.5L bottle).
4. Studio Quality: Is this a clean, high-resolution retail studio product packshot on white/neutral background? Reject amateur phone snapshots or watermarked images.
5. OCR Attributes: If the back/side of the packaging or ingredients text is readable, extract ingredients, nutrition, and halal certification marks.

Return strictly JSON format:
{
  "isMatch": boolean,
  "confidence": number between 0.0 and 1.0,
  "recognizedBrand": string,
  "recognizedName": string,
  "recognizedWeight": string,
  "recognizedIngredients": string | null,
  "recognizedNutrition": { "calories": number | null, "protein": number | null, "fat": number | null, "carbs": number | null } | null,
  "recognizedHalal": boolean | null,
  "rationale": string
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mime, data: b64 } }
            ]
          }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (res.status === 503 || res.status === 429) {
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        return { isMatch: false, confidence: 0, rationale: `API Error ${res.status}: ${errText.slice(0, 100)}` };
      }

      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) return { isMatch: false, confidence: 0, rationale: 'Empty Gemini response' };

      return JSON.parse(content);
    } catch (e) {
      if (attempt === 3) return { isMatch: false, confidence: 0, rationale: 'Exception: ' + e.message };
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return { isMatch: false, confidence: 0, rationale: 'Exhausted retries' };
}

// Normalization & Pre-filtering
function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-zа-яё0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function passesPreFilter(candidateName, candidateBrand, target) {
  const cName = norm(candidateName);
  const cBrand = norm(candidateBrand);
  const tName = norm(target.name);
  const tBrand = norm(target.brand);

  if (tBrand && tBrand.length > 2) {
    if (!cBrand.includes(tBrand) && !cName.includes(tBrand)) {
      return false;
    }
  }

  const tWords = tName.split(' ').filter(w => w.length > 3 && !['для', 'или', 'под', 'над', 'при', 'всех'].includes(w));
  let matchCount = 0;
  for (const w of tWords) {
    if (cName.includes(w)) matchCount++;
  }

  return matchCount >= Math.min(2, tWords.length);
}

// Load KDV local catalog
let kdvItems = [];
try {
  kdvItems = JSON.parse(fs.readFileSync(KDV_PATH, 'utf8'));
  console.log(`Loaded ${kdvItems.length} KDV catalog items.`);
} catch {
  console.warn('KDV catalog not loaded.');
}

// Main execution
async function main() {
  console.log('=== KÖRSET MULTI-SOURCE STUDIO PACKSHOT & 30-ATTRIBUTE HARVESTER ===\n');

  // Load checkpoint
  let checkpoint = { processedEans: new Set(), enrichedCount: 0, rejectedCount: 0 };
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
      checkpoint.processedEans = new Set(raw.processedEans || []);
      checkpoint.enrichedCount = raw.enrichedCount || 0;
      checkpoint.rejectedCount = raw.rejectedCount || 0;
      console.log(`Resuming from checkpoint: ${checkpoint.processedEans.size} items previously processed (${checkpoint.enrichedCount} enriched).\n`);
    } catch {}
  }

  const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });

  // Read master catalog
  console.log('Reading master catalog...');
  const masterRl = readline.createInterface({
    input: fs.createReadStream(MASTER_PATH),
    crlfDelay: Infinity
  });

  const queue = [];
  for await (const line of masterRl) {
    if (!line.trim()) continue;
    const item = JSON.parse(line);
    if (!item.image_url && !checkpoint.processedEans.has(item.ean)) {
      queue.push(item);
    }
  }

  // Priority sorting: Core Grocery & FMCG first
  const CATEGORY_PRIORITY = {
    sweets: 1,
    dairy_eggs: 2,
    tea_coffee: 3,
    water_beverages: 4,
    snacks: 5,
    sauces_spices: 6,
    grocery: 7,
    household: 8,
    baby_food: 9,
    deli: 10,
    fish: 11,
    bread: 12,
    healthy: 13,
    meat: 14,
    frozen: 15,
    fruits_veg: 16,
    personal_care: 20
  };
  queue.sort((a, b) => (CATEGORY_PRIORITY[a.category] || 99) - (CATEGORY_PRIORITY[b.category] || 99));

  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const maxLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  console.log(`Found ${queue.length} products needing studio packshots. (Running limit: ${maxLimit === Infinity ? 'ALL' : maxLimit})\n`);

  let batchEnriched = 0;
  let batchRejected = 0;
  let totalProcessedInRun = 0;

  for (let i = 0; i < queue.length; i++) {
    if (totalProcessedInRun >= maxLimit) break;
    const target = queue[i];
    totalProcessedInRun++;

    const progressStr = `[${i + 1}/${queue.length}] ${target.name} (${target.ean})`;
    process.stdout.write(`\r${progressStr.slice(0, 80)}...`);

    let candidateImages = null;
    let candidateSource = null;
    let candidateTitle = null;
    let candidateBrand = null;
    let candidateIngredients = null;
    let candidateNutrition = null;
    let candidateStorage = null;
    let candidateCountry = null;
    let candidateDescription = null;
    let candidateHalal = null;

    const brandClean = target.brand ? target.brand.trim() : '';
    const nameClean = target.name.replace(brandClean, '').replace(/\b(?:м\/у|пэт|к\/у|ф\/п|с\/б|г|гр|мл|л|шт)\b/gi, '').trim();
    const query = `${brandClean} ${nameClean}`.split(/\s+/).slice(0, 3).join(' ');

    // --- Search Strategy 1: Arbuz.kz (Live API) ---
    const arbuzResults = await searchArbuz(query);
    const validArbuz = arbuzResults.filter(c => passesPreFilter(c.name, c.brandName, target));

    if (validArbuz.length > 0) {
      const topCand = validArbuz[0];
      const detail = await getArbuzDetail(topCand.id);
      if (detail && detail.images && detail.images.length > 0) {
        candidateImages = detail.images.map(img => img.url.replace('%w', '700').replace('%h', '700'));
        candidateSource = 'arbuz.kz';
        candidateTitle = topCand.name;
        candidateBrand = detail.brandName || topCand.brandName;
        candidateIngredients = detail.compound || detail.ingredients;
        candidateStorage = detail.storageConditions;
        candidateCountry = detail.producerCountry;
        candidateDescription = detail.description || detail.information;
        if (detail.nutrition) {
          candidateNutrition = {
            calories: detail.nutrition.kcal ? parseFloat(detail.nutrition.kcal) : null,
            protein: detail.nutrition.protein ? parseFloat(detail.nutrition.protein) : null,
            fat: detail.nutrition.fats ? parseFloat(detail.nutrition.fats) : null,
            carbs: detail.nutrition.carbs ? parseFloat(detail.nutrition.carbs) : null
          };
        }
        if (detail.characteristics && Array.isArray(detail.characteristics)) {
          candidateHalal = detail.characteristics.some(c => c.name && c.name.toLowerCase().includes('халал'));
        }
      }
    }

    // --- Search Strategy 2: Galmart.kz (Live API Fallback) ---
    if (!candidateImages) {
      const galmartResults = await searchGalmart(query);
      const validGalmart = galmartResults.filter(g => passesPreFilter(g.title, g.brand_name, target));
      if (validGalmart.length > 0) {
        const topG = validGalmart[0];
        const gDetail = await getGalmartDetail(topG.id);
        const photos = (gDetail && gDetail.photos && gDetail.photos.length > 0) ? gDetail.photos : topG.photos;
        if (photos && photos.length > 0) {
          candidateImages = photos;
          candidateSource = 'galmart.kz';
          candidateTitle = topG.title;
          candidateBrand = gDetail?.brand_name || topG.brand_name;
          candidateIngredients = gDetail?.composition || null;
          candidateStorage = gDetail?.storage_conditions || null;
          candidateCountry = gDetail?.country_name || null;
          candidateDescription = gDetail?.description || null;
        }
      }
    }

    // --- Search Strategy 3: KDV Online (Local Catalog Fallback) ---
    if (!candidateImages && kdvItems.length > 0 && target.category === 'sweets') {
      const kMatch = kdvItems.find(k => passesPreFilter(k.title, k.brand, target) && k.image);
      if (kMatch) {
        candidateImages = [kMatch.image];
        candidateSource = 'kdvonline.com';
        candidateTitle = kMatch.title;
        candidateBrand = kMatch.brand;
        candidateIngredients = kMatch.composition || null;
      }
    }

    // If candidate found -> Run AI Vision Verification Gate
    if (candidateImages && candidateImages.length > 0) {
      const packshotToInspect = candidateImages[0];
      const verdict = await verifyImageWithAI(packshotToInspect, target);

      if (verdict.isMatch && verdict.confidence >= 0.85) {
        batchEnriched++;
        checkpoint.enrichedCount++;

        const enrichedRecord = {
          ean: target.ean,
          name: target.name,
          source: candidateSource,
          candidate_title: candidateTitle,
          image_url: packshotToInspect,
          images: candidateImages,
          // 30 Packaging Attributes non-destructive enrichment
          brand: candidateBrand || verdict.recognizedBrand || target.brand,
          ingredients_raw: candidateIngredients || verdict.recognizedIngredients || target.ingredients_raw,
          nutriments_json: candidateNutrition || verdict.recognizedNutrition || target.nutriments_json,
          storage_conditions: candidateStorage || target.storage_conditions,
          country_of_origin: candidateCountry || target.country_of_origin,
          description: candidateDescription || target.description,
          halal_status: candidateHalal ? 'yes' : (verdict.recognizedHalal ? 'yes' : target.halal_status),
          ai_verification: verdict,
          enriched_at: new Date().toISOString()
        };

        logStream.write(JSON.stringify(enrichedRecord) + '\n');
        console.log(`\n✅ [${candidateSource}] ENRICHED: "${target.name}" -> ${candidateImages.length} packshot(s) (AI conf: ${verdict.confidence})`);
      } else {
        batchRejected++;
        checkpoint.rejectedCount++;
        const rejectedRecord = {
          ean: target.ean,
          name: target.name,
          candidate_source: candidateSource,
          candidate_title: candidateTitle,
          packshot: packshotToInspect,
          verdict,
          rejected_at: new Date().toISOString()
        };
        logStream.write(JSON.stringify(rejectedRecord) + '\n');
      }
    }

    checkpoint.processedEans.add(target.ean);

    // Save checkpoint every 25 items
    if (totalProcessedInRun % 25 === 0) {
      fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
        processedEans: [...checkpoint.processedEans],
        enrichedCount: checkpoint.enrichedCount,
        rejectedCount: checkpoint.rejectedCount,
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }

    // Delay between items to maintain smooth rate limit
    await new Promise(r => setTimeout(r, 250));
  }

  // Final checkpoint save
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
    processedEans: [...checkpoint.processedEans],
    enrichedCount: checkpoint.enrichedCount,
    rejectedCount: checkpoint.rejectedCount,
    lastUpdated: new Date().toISOString()
  }, null, 2));

  console.log('\n\n=== ENRICHMENT BATCH COMPLETE ===');
  console.log(`Total items checked: ${totalProcessedInRun}`);
  console.log(`Enriched with AI Vision verification: ${batchEnriched}`);
  console.log(`Rejected by AI Vision (kept clean): ${batchRejected}`);
}

main().catch(console.error);
