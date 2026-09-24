async function findProductInKdv() {
  const url = 'https://kdvonline.kz/product/vafli-s-shokoladom-12571';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const idx = html.indexOf('"vafli-s-shokoladom-12571"');
  if (idx !== -1) {
    console.log(html.slice(idx - 100, idx + 800));
  } else {
    // search for 12571
    const idx2 = html.indexOf('12571');
    console.log('Search for 12571:', idx2 !== -1 ? html.slice(idx2 - 100, idx2 + 800) : 'not found');
  }
}
findProductInKdv();
