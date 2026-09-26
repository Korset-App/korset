import https from 'https';

const CONSUMER_NAME = 'arbuz-kz.web.mobile';
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj';
const API_BASE = 'https://arbuz.kz/api/v1';

async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch (e) { resolve({ status: res.statusCode, raw: b.slice(0, 200) }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function checkApiEndpoints() {
  const tokenRes = await fetchJson(API_BASE + '/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ consumer: CONSUMER_NAME, key: CONSUMER_KEY })
  });
  const token = tokenRes.data.data.token;

  const endpoints = [
    '/shop/product/286654',
    '/shop/product/286654?fields=*',
    '/shop/product/286654?expand=*',
    '/catalog/item/286654',
    '/catalog/product/286654',
    '/products/286654',
    '/shop/item/286654'
  ];

  for (const ep of endpoints) {
    const res = await fetchJson(API_BASE + ep, {
      headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Mozilla/5.0' }
    });
    console.log(`Endpoint ${ep} -> Status ${res.status}`);
    if (res.data?.data) {
      const d = res.data.data;
      console.log('   barcode:', d.barcode, 'articleIndex:', d.articleIndex, 'shelfLife:', d.shelfLife || d.shelf_life_days);
    }
  }
}

checkApiEndpoints().catch(console.error);
