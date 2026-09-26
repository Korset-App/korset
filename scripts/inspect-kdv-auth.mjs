import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function test() {
  const res = await fetch('https://kdvonline.ru/product/vafli-s-shokoladom-12571', { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const cookies = res.headers.get('set-cookie');
  console.log('cookies:', cookies);
  
  // Look for any script references
  const scripts = [...html.matchAll(/<script[^>]+src="([^">]+)"/g)].map(m => m[1]);
  console.log('Scripts:', scripts.slice(0, 5));

  // Let's check state.app or state.feature in scratch/kdv_state.json
  const s = JSON.parse(fs.readFileSync('scratch/kdv_state.json'));
  console.log('app state:', s.app);
}

test();
