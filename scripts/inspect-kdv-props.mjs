import vm from 'vm';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function testKdvProps() {
  const res = await fetch('https://kdvonline.kz/product/vafli-s-shokoladom-12571', { headers: { 'User-Agent': UA } });
  const html = await res.text();

  const match = html.match(/window\.__INITIAL_STATE__=function\([^)]*\)\{return\s*([\s\S]*?)\};/);
  if (match) {
    const jsCode = '(' + match[1] + ')';
    const state = vm.runInNewContext(jsCode, {});
    const p = state.api?.product?.data;
    console.log('Product propertyValues:');
    for (const pv of p.propertyValues || []) {
      console.log(`  ${pv.property?.title} (${pv.property?.name}):`, pv.value || pv.item?.label || pv.items?.map(i => i.label));
    }
    console.log('\nOther product fields:', {
      article: p.article,
      barcodes: p.barcodes,
      brand: p.brand,
      weightUnit: p.weightUnit,
      description: p.description
    });
  }
}

testKdvProps().catch(console.error);
