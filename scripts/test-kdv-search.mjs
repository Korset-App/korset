async function testKdvSearch() {
  const url = 'https://kdvonline.kz/search?q=%D1%8F%D1%88%D0%BA%D0%B8%D0%BD%D0%BE';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  console.log('Search page length:', html.length);
  // look for api endpoints
  const apiMatches = [...html.matchAll(/(https?:\/\/[^"'\s]*api[^"'\s]*)/gi)].map(m => m[1]);
  console.log('API matches in search:', apiMatches.slice(0, 10));
}
testKdvSearch();
