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
  const { status, data } = await fetchPage('https://sadypridonia.ru/catalog/soki-i-nektary/');
  console.log('Catalog status:', status, 'Length:', data.length);
  
  // Find product detail links
  const matches = [...data.matchAll(/href=["'](\/catalog\/soki-i-nektary\/[^"']+)["']/g)].map(m => m[1]);
  const unique = [...new Set(matches)];
  console.log('Found product detail links in soki-i-nektary:', unique.length);
  console.log('Sample detail links:', unique.slice(0, 10));

  if (unique.length > 0) {
    const detailUrl = 'https://sadypridonia.ru' + unique[0];
    console.log('Fetching detail page:', detailUrl);
    const detail = await fetchPage(detailUrl);
    console.log('Detail status:', detail.status, 'Length:', detail.data.length);
    const hasIng = detail.data.includes('Состав') || detail.data.includes('состав');
    const hasKbju = detail.data.includes('Пищевая') || detail.data.includes('ккал') || detail.data.includes('углеводы');
    console.log({ hasIng, hasKbju });
    const idx = detail.data.indexOf('углеводы');
    if (idx !== -1) console.log(detail.data.slice(idx - 100, idx + 300));
  }
}

main().catch(console.error);
