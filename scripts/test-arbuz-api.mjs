import https from 'https';

const CONSUMER_NAME = 'arbuz-kz.web.mobile';
const CONSUMER_KEY = '20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj';
const API_BASE = 'https://arbuz.kz/api/v1';

async function testSearch() {
  const token = await new Promise((resolve, reject) => {
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
          resolve(JSON.parse(b).data.token);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  const req = https.request(API_BASE + '/shop/product/20452', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  }, res => {
    let b = '';
    res.on('data', d => b += d);
    res.on('end', () => {
      const data = JSON.parse(b).data;
      console.log('Arbuz product details keys:', Object.keys(data));
      console.log('Images:', data.images || data.gallery || data.photos || data.image);
      console.log('Barcode:', data.barcode, 'EAN:', data.ean);
    });
  });
  req.end();
}

testSearch().catch(console.error);
