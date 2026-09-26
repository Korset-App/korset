import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const key = envLocal.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/)[1];

const CONSUMER_NAME = 'arbuz-kz.web.mobile';
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj';
const API_BASE = 'https://arbuz.kz/api/v1';

let _token = null;

async function getToken() {
  if (_token) return _token;
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ consumer: CONSUMER_NAME, key: CONSUMER_KEY });
    const req = https.request(API_BASE + '/auth/token', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          _token = JSON.parse(b).data.token;
          resolve(_token);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function searchArbuz(query) {
  const token = await getToken();
  return new Promise((resolve) => {
    const qs = encodeURIComponent(query);
    const req = https.request(`${API_BASE}/shop/search/products?where[name][c]=${qs}&limit=10`, {
      headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try { resolve(JSON.parse(b).data || []); }
        catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

async function getDetail(id) {
  const token = await getToken();
  return new Promise((resolve) => {
    const req = https.request(`${API_BASE}/shop/product/${id}`, {
      headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try { resolve(JSON.parse(b).data || null); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function verifyImage(imageUrl, targetProduct) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) return { isMatch: false, rationale: 'Download failed' };
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const mime = imgRes.headers.get('content-type') || 'image/jpeg';

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`;
      const prompt = `Target Product:
- Name: "${targetProduct.name}"
- Brand: "${targetProduct.brand || ''}"

Inspect the packaging in the image:
1. Brand: Does the brand match?
2. Product Type & Variant: Does flavor/type match?
3. Format & Size: Does packaging format match?
4. Quality: Is this a clean, high-resolution retail studio packshot on white/neutral background?

Return strictly JSON:
{
  "isMatch": boolean,
  "confidence": number,
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

      if (res.status === 503 || res.status === 429) {
        console.log(`[Attempt ${attempt}] High demand / 503, waiting ${attempt * 2}s...`);
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text);
    } catch (e) {
      if (attempt === 3) return { isMatch: false, rationale: e.message };
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return { isMatch: false, rationale: 'Exhausted retries' };
}

// Normalizer
function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-zа-яё0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function passesPreFilter(candidate, target) {
  const cName = norm(candidate.name);
  const cBrand = norm(candidate.brandName);
  const tName = norm(target.name);
  const tBrand = norm(target.brand);

  // If target has brand, candidate brand or name must contain target brand
  if (tBrand && tBrand.length > 2) {
    if (!cBrand.includes(tBrand) && !cName.includes(tBrand)) {
      return false;
    }
  }

  // Check key words from target name
  const tWords = tName.split(' ').filter(w => w.length > 3 && !['для', 'или', 'под', 'над', 'при'].includes(w));
  let matchCount = 0;
  for (const w of tWords) {
    if (cName.includes(w)) matchCount++;
  }

  return matchCount >= Math.min(2, tWords.length);
}

async function testPopular() {
  const testItems = [
    { name: 'Шоколад Alpen Gold молочный с фундуком 85гр', brand: 'Alpen Gold', ean: '7622210204738' },
    { name: 'Чипсы Lay\'s сметана и зелень 140гр', brand: 'Lay\'s', ean: '4823077618994' },
    { name: 'Кофе Jacobs Monarch сублимированный 95гр с/б', brand: 'Jacobs', ean: '8711000508823' },
    { name: 'Зубная паста Colgate Тройное действие 100мл', brand: 'Colgate', ean: '6920354812613' },
    { name: 'Средство для мытья посуды Fairy Сочный лимон 450мл пэт', brand: 'Fairy', ean: '5413149310860' }
  ];

  console.log(`=== TESTING SMART PRE-FILTER + AI VISION VERIFICATION ===\n`);

  for (const item of testItems) {
    console.log(`\n-----------------------------------------------------------`);
    console.log(`Target Product: "${item.name}" (Brand: ${item.brand})`);

    const q = `${item.brand} ${item.name.replace(item.brand, '').replace(/\b(?:м\/у|пэт|к\/у|ф\/п|с\/б|г|гр|мл|л)\b/gi, '').trim()}`.split(/\s+/).slice(0, 3).join(' ');
    console.log(`Searching: "${q}"`);

    const candidates = await searchArbuz(q);
    console.log(`Found ${candidates.length} candidate(s) from Arbuz.`);

    const filtered = candidates.filter(c => passesPreFilter(c, item));
    console.log(`Passed Smart Pre-Filter: ${filtered.length} candidate(s).`);

    let verified = false;

    for (const cand of filtered.slice(0, 2)) {
      console.log(` -> Evaluating: [ID: ${cand.id}] "${cand.name}" (Brand: ${cand.brandName})`);
      const detail = await getDetail(cand.id);
      if (!detail?.images?.length) continue;

      const packshot = detail.images[0].url.replace('%w', '700').replace('%h', '700');
      console.log(`    Packshot URL: ${packshot}`);

      console.log(`    Running AI Vision...`);
      const t0 = Date.now();
      const verdict = await verifyImage(packshot, item);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      console.log(`    AI Verdict in ${elapsed}s: isMatch=${verdict.isMatch}, confidence=${verdict.confidence}`);
      console.log(`    Rationale: ${verdict.rationale}`);

      if (verdict.isMatch && verdict.confidence >= 0.85) {
        console.log(`    >>> 100% VERIFIED BY AI VISION! <<<`);
        verified = true;
        break;
      }
    }

    if (verified) {
      console.log(`RESULT: "${item.name}" successfully matched with verified studio packshots!`);
    } else {
      console.log(`RESULT: No verified match found.`);
    }
  }
}

testPopular().catch(console.error);
