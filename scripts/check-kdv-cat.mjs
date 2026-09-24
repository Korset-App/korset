async function checkKdvCategory() {
  const url = 'https://kdvonline.kz/catalog/vafli-19';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  console.log('Category HTML length:', html.length);
  const prodMatches = [...html.matchAll(/href="(\/product\/[^"]+)"/g)].map(m => m[1]);
  console.log('Product links:', [...new Set(prodMatches)].slice(0, 10));
}
checkKdvCategory();
