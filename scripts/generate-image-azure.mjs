import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  envVars[key] = value;
}

const apiKey = envVars.OPENAI_API_KEY;
const baseUrl = envVars.OPENAI_API_BASE_URL?.replace(/\/$/, '');

if (!apiKey || !baseUrl) {
  console.error('Missing OPENAI_API_KEY or OPENAI_API_BASE_URL in .env.local');
  process.exit(1);
}

const deploymentName = process.argv[2] || 'gpt-image-2';
const prompt = process.argv[3] || 'a photorealistic basketball with a human face painted on it, studio lighting, 4k';
const outFile = process.argv[4] || 'generated-image.png';

// Try Azure OpenAI Service endpoint pattern
const url = `${baseUrl}/deployments/${deploymentName}/images/generations?api-version=2025-04-01-preview`;

const body = {
  prompt,
  n: 1,
  size: '1024x1024',
  quality: 'high',
  response_format: 'b64_json'
};

console.log('Requesting image generation...');
console.log('URL:', url);

async function generate() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    console.error(text);
    process.exit(1);
  }

  const data = JSON.parse(text);
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    console.error('No b64_json in response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(outFile, buf);
  console.log(`Saved to ${outFile} (${buf.length} bytes)`);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
