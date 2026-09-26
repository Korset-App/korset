import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read API keys
const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const geminiKeyMatch = envLocal.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
const GEMINI_API_KEY = geminiKeyMatch ? geminiKeyMatch[1] : null;

const CONSUMER_NAME = 'arbuz-kz.web.mobile';
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj';
const API_BASE = 'https://arbuz.kz/api/v1';

let _arbuzToken = null;

async function getArbuzToken() {
  if (_arbuzToken) return _arbuzToken;
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ consumer: CONSUMER_NAME, key: CONSUMER_KEY });
    const req = https.request(API_BASE + '/auth/token', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          _arbuzToken = JSON.parse(b).data.token;
          resolve(_arbuzToken);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function searchArbuz(query) {
  const token = await getArbuzToken();
  return new Promise((resolve) => {
    const qs = encodeURIComponent(query);
    const req = https.request(`${API_BASE}/shop/search/products?where[name][c]=${qs}&limit=5`, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(b).data || []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

async function getArbuzProductDetail(id) {
  const token = await getArbuzToken();
  return new Promise((resolve) => {
    const req = https.request(`${API_BASE}/shop/product/${id}`, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(b).data || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function verifyImageWithGeminiVision(imageUrl, targetProduct) {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return { isMatch: false, rationale: 'Failed to download image' };
    const buf = await imgRes.arrayBuffer();
    const b64 = Buffer.from(buf).toString('base64');
    const mime = imgRes.headers.get('content-type') || 'image/jpeg';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `You are a strict grocery product verification AI for a supermarket catalog.
Target Product:
- Name: "${targetProduct.name}"
- Brand: "${targetProduct.brand || ''}"
- EAN: "${targetProduct.ean || ''}"

Inspect the packaging in the image carefully:
1. Brand: Does the brand on the package match the target product?
2. Product Type & Variant: Does the product type and flavor/variant match? (e.g. Strawberry vs Banana, Whole milk vs Skimmed)
3. Weight/Volume: Does the packaging size match (e.g. 320g vs 500g, 1L vs 0.5L)? Small variations like 300g vs 320g can be acceptable if packaging changed, but not 100g vs 1kg.
4. Studio quality: Is this a clean, high-resolution retail studio product packshot on white/neutral background? (Reject amateur phone snapshots, blurry images, or watermarked images).

Return strictly JSON:
{
  "isMatch": boolean,
  "confidence": number between 0.0 and 1.0,
  "recognizedBrand": string,
  "recognizedName": string,
  "recognizedWeight": string,
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
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return { isMatch: false, rationale: `Gemini error: ${res.status} ${err}` };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch (e) {
    return { isMatch: false, rationale: `Exception: ${e.message}` };
  }
}

async function runSampleTest() {
  const sampleTargetProducts = [
    { name: 'Творог Простоквашино рассыпчатый 9% 320гр м/у', brand: 'Простоквашино', ean: '4600605028476' },
    { name: 'Йогурт питьевой Чудо клубника-киви 1,9% 260мл пэт', brand: 'Чудо', ean: '4690228106934' },
    { name: 'Вафли РотФронт Коровка топленое молоко 150гр м/у', brand: 'РотФронт', ean: '4600080322106' },
    { name: 'Печенье Рахат 110гр м/у', brand: 'Рахат', ean: '4870099003123' },
    { name: 'Торт бисквитный Faretti шоколадный 300гр', brand: 'Faretti', ean: '4640005701470' }
  ];

  console.log(`=== TESTING AI VISION ENRICHMENT ON 5 SAMPLE PRODUCTS ===\n`);

  for (const item of sampleTargetProducts) {
    console.log(`\n-----------------------------------------------------------`);
    console.log(`Target: ${item.name} (EAN: ${item.ean})`);

    // Clean search query: brand + main keyword
    const searchQuery = `${item.brand} ${item.name.replace(item.brand, '').replace(/\b(?:м\/у|пэт|к\/у|ф\/п|г|гр|мл|л)\b/gi, '').trim()}`.split(/\s+/).slice(0, 4).join(' ');
    console.log(`Searching Arbuz with: "${searchQuery}"`);

    const results = await searchArbuz(searchQuery);
    console.log(`Found ${results.length} candidate(s) in Arbuz.`);

    if (results.length === 0) {
      console.log(`No candidates found for "${searchQuery}".`);
      continue;
    }

    let verifiedMatch = null;

    for (const cand of results.slice(0, 2)) {
      console.log(` Inspecting candidate: [ID: ${cand.id}] "${cand.name}" (Brand: ${cand.brandName})`);
      const detail = await getArbuzProductDetail(cand.id);
      if (!detail || !detail.images || detail.images.length === 0) {
        console.log(`   No images in candidate ${cand.id}.`);
        continue;
      }

      // Format image URL
      const rawImgUrl = detail.images[0].url.replace('%w', '700').replace('%h', '700');
      console.log(`   Candidate Packshot: ${rawImgUrl}`);

      console.log(`   -> Sending to AI Vision for strict inspection...`);
      const t0 = Date.now();
      const verdict = await verifyImageWithGeminiVision(rawImgUrl, item);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      console.log(`   -> AI Vision Verdict (${elapsed}s):`);
      console.log(`      isMatch: ${verdict.isMatch} (confidence: ${verdict.confidence})`);
      console.log(`      recognizedBrand: ${verdict.recognizedBrand}`);
      console.log(`      recognizedName: ${verdict.recognizedName}`);
      console.log(`      recognizedWeight: ${verdict.recognizedWeight}`);
      console.log(`      rationale: ${verdict.rationale}`);

      if (verdict.isMatch && verdict.confidence >= 0.85) {
        verifiedMatch = {
          candidate: cand,
          allImages: detail.images.map(img => img.url.replace('%w', '700').replace('%h', '700')),
          verdict
        };
        console.log(`   >>> APPROVED BY AI VISION! <<<`);
        break;
      } else {
        console.log(`   >>> REJECTED BY AI VISION (Did not meet 85% threshold or mismatch) <<<`);
      }
    }

    if (verifiedMatch) {
      console.log(`SUCCESS: Enriched "${item.name}" with ${verifiedMatch.allImages.length} studio images.`);
    } else {
      console.log(`PENDING: Item "${item.name}" remains clean without incorrect photo.`);
    }
  }
}

runSampleTest().catch(console.error);
