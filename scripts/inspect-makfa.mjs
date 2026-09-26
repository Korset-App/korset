import https from 'https';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const html = await fetchPage('https://www.makfa.ru/catalog/makaronnaya-produktsiya/klassicheskie-makaronnye-izdeliya/');
  
  const idx = html.indexOf('342 Ккал');
  if (idx !== -1) {
    console.log('Context 3500 chars before to 1000 after:');
    console.log(html.slice(Math.max(0, idx - 3500), Math.max(0, idx - 1500)));
  }
}

main().catch(console.error);
