import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const key = envLocal.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/)[1];

async function testLiteVision() {
  const imgUrl = 'https://arbuz.kz/image/s3/arbuz-kz-products/file_name__34d58555-b285-4e23-bc14-fb433c9bbf2d-4607065001445_jpg.jpg?w=400&h=400';
  const imgRes = await fetch(imgUrl);
  const buf = await imgRes.arrayBuffer();
  const b64 = Buffer.from(buf).toString('base64');
  const mime = imgRes.headers.get('content-type') || 'image/jpeg';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: 'Look at this photo. What brand and product is it? Return JSON: { brand: string, name: string }' },
          { inlineData: { mimeType: mime, data: b64 } }
        ]
      }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });
  console.log('Lite Vision Status:', res.status);
  const data = await res.json();
  console.log('Reply:', data.candidates?.[0]?.content?.parts?.[0]?.text || data.error);
}

testLiteVision().catch(console.error);
