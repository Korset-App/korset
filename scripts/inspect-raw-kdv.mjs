async function inspectRawKdvScript() {
  const url = 'https://kdvonline.kz/product/vafli-s-shokoladom-12571';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const idx = html.indexOf('window.__INITIAL_STATE__');
  if (idx !== -1) {
    console.log(html.slice(idx, idx + 1000));
  } else {
    console.log('Not found');
  }
}
inspectRawKdvScript();
