import vm from 'vm';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function testKdvState() {
  const res = await fetch('https://kdvonline.kz/product/vafli-s-shokoladom-12571', { headers: { 'User-Agent': UA } });
  const html = await res.text();

  const match = html.match(/window\.__INITIAL_STATE__=function\([^)]*\)\{return\s*([\s\S]*?)\};/);
  if (match) {
    const jsCode = '(' + match[1] + ')';
    const state = vm.runInNewContext(jsCode, {});
    console.log('Successfully evaluated __INITIAL_STATE__!');
    console.log('Top keys:', Object.keys(state));
    console.log('api keys:', Object.keys(state.api || {}));

    // Find product details
    const product = state.api?.product || state.api?.products || state.product;
    console.log('\napi.product keys:', Object.keys(product || {}));
    if (product) {
      console.log('Product details:\n', JSON.stringify(product, null, 2).slice(0, 3000));
    }
  }
}

testKdvState().catch(console.error);
