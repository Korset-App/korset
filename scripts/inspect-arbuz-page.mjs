import https from 'https';

const url = 'https://arbuz.kz/ru/almaty/catalog/item/191335-moloko_amiran_zhivoe_2_5_0_8_l';

function fetchPage(targetUrl) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    }, res => {
      let html = '';
      res.on('data', d => { html += d; });
      res.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

async function run() {
  const html = await fetchPage(url);
  const match = html.match(/:product="([^"]+)"/);
  if (match) {
    const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const obj = JSON.parse(raw);
    console.log('--- ALL KEYS IN :product ---');
    console.log(Object.keys(obj));
    console.log('--- FULL :product OBJECT ---');
    console.log(JSON.stringify(obj, null, 2));
  }
}

run().catch(console.error);
