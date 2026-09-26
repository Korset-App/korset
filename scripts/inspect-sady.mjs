import https from 'https';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  const { status, data } = await fetchPage('https://sadypridonia.ru/');
  console.log('Sady Pridonia root status:', status, 'Length:', data.length);
  
  // Extract all hrefs
  const matches = [...data.matchAll(/href=["']([^"']+)["']/g)].map(m => m[1]);
  const uniqueHrefs = [...new Set(matches)];
  console.log('Total unique links:', uniqueHrefs.length);
  console.log('Catalog/product related links:', uniqueHrefs.filter(h => h.includes('brand') || h.includes('prod') || h.includes('cat')));
}

main().catch(console.error);
