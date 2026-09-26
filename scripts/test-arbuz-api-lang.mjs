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

async function testApiLang() {
  const tokenRes = await fetchJson(API_BASE + '/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ consumer: CONSUMER_NAME, key: CONSUMER_KEY })
  });
  const token = tokenRes.data.data.token;

  // Try with ?lang=kk
  const resKk = await fetchJson(API_BASE + '/shop/product/191335?lang=kk', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept-Language': 'kk-KZ,kk;q=0.9', 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('API ?lang=kk:', resKk.data?.data?.name, '| ingredients:', resKk.data?.data?.ingredients);

  // Try catalog listing with ?lang=kk
  const resCatKk = await fetchJson(API_BASE + '/shop/catalog/225161?lang=kk&page=1', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept-Language': 'kk-KZ,kk;q=0.9', 'User-Agent': 'Mozilla/5.0' }
  });
  const firstProd = resCatKk.data?.data?.products?.[0];
  console.log('Cat API ?lang=kk first prod:', firstProd?.name, '| ingredients:', firstProd?.ingredients);
}

testApiLang().catch(console.error);
