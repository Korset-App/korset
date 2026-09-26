import https from 'https';

const kzUrl = 'https://arbuz.kz/kk/almaty/catalog/item/191335-s_t_amiran_tabi_i_2_5_0_8_l';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    }, res => {
      let html = '';
      res.on('data', d => { html += d; });
      res.on('end', () => resolve({ status: res.statusCode, html }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function run() {
  const { status, html } = await fetchPage(kzUrl);
  console.log('Status:', status, 'Length:', html.length);
  const match = html.match(/:product="([^"]+)"/);
  if (match) {
    const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const obj = JSON.parse(raw);
    console.log('--- KZ PRODUCT DATA ---');
    console.log('name:', obj.name);
    console.log('lang:', obj.lang);
    console.log('ingredients:', obj.ingredients);
    console.log('information:', obj.information);
    console.log('storage_conditions:', obj.storage_conditions);
  } else {
    console.log(':product not found');
  }
}

run().catch(console.error);
