import vm from 'vm';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function testKdvProps() {
  const res = await fetch('https://kdvonline.ru/product/vafli-s-shokoladom-12571', { headers: { 'User-Agent': UA } });
  const html = await res.text();

  const match = html.match(/window\.__INITIAL_STATE__=function\([^)]*\)\{return\s*([\s\S]*?)\};/);
  if (match) {
    const jsCode = '(' + match[1] + ')';
    const state = vm.runInNewContext(jsCode, {});
    const p = state.api?.product?.data;
    console.log('Product Name:', p?.name);
    console.log('Product Barcodes:', p?.barcodes);
    console.log('Product PropertyValues:');
    for (const pv of p?.propertyValues || []) {
      const title = pv.property?.title;
      const val = pv.value || pv.item?.label || (pv.items ? pv.items.map(i => i.label).join(', ') : '');
      if (val) {
        console.log(`  ${title}: ${val}`);
      }
    }
  }
}

testKdvProps().catch(console.error);
