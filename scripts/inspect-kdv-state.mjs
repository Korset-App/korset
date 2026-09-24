async function inspectKdvProductState() {
  const url = 'https://kdvonline.kz/product/vafli-s-shokoladom-12571';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*function[^{]*\{return\s*([\s\S]*?)\};\s*window\.__INITIAL_LOCALIZATION/);
  if (m) {
    try {
      const state = JSON.parse(m[1]);
      console.log('State keys:', Object.keys(state));
      if (state.catalog) {
        console.log('Catalog keys:', Object.keys(state.catalog));
        console.log('Product data:', JSON.stringify(state.catalog.product || state.catalog.currentProduct || {}).slice(0, 400));
      }
      if (state.product) {
        console.log('Product keys:', Object.keys(state.product));
        console.log('Product data:', JSON.stringify(state.product).slice(0, 400));
      }
    } catch (e) {
      console.log('JSON parse error:', e.message);
    }
  } else {
    console.log('Did not match window.__INITIAL_STATE__');
  }
}
inspectKdvProductState();
