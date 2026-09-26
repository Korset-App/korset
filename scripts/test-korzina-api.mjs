const API_BASE = 'https://api.korzinavdom.kz/client';

async function testGlobalPagination() {
  console.log('Testing global showcases pagination...');

  for (const page of [0, 1, 2, 90, 92]) {
    const url = `${API_BASE}/showcases?size=100&page=${page}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await res.json();
    const p = j.data?.page;
    console.log(`Page ${page}: totalElements=${p?.totalElements}, totalPages=${p?.totalPages}, itemsReturned=${p?.content?.length}`);
    if (p?.content?.length > 0) {
      console.log(`   First item: [${p.content[0].quantumNumber}] ${p.content[0].productName}`);
      console.log(`   Last item:  [${p.content[p.content.length - 1].quantumNumber}] ${p.content[p.content.length - 1].productName}`);
    }
  }
}

testGlobalPagination().catch(console.error);
