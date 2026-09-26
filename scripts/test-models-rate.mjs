import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const key = envLocal.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/)[1];

async function testModel(modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hello, reply with your model name.' }] }]
    })
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || data.error?.message;
  console.log(`[${modelName}] Status: ${res.status} | Reply: ${text?.slice(0, 100)}`);
}

async function run() {
  await testModel('gemini-flash-latest');
  await testModel('gemini-flash-lite-latest');
  await testModel('gemini-2.5-flash-lite');
  await testModel('gemini-pro-latest');
}

run().catch(console.error);
