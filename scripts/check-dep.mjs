import fs from 'fs';

async function checkDepYogurt() {
  const url = 'https://semeiniy.kz/yogurt-pitevoy-dep-ananas-2-5-500ml-pet/';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const skuMatch = html.match(/class=["'][^"']*js-product-sku[^"']*["'][^>]*>([^<]+)</i);
  const sku = skuMatch ? skuMatch[1].trim() : 'NONE';
  console.log('DEP Yogurt SKU/Barcode:', sku);

  // Check OFF
  if (sku !== 'NONE') {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${sku}.json`, { headers: { 'User-Agent': 'Korset-App/1.0' } });
    const offData = await offRes.json();
    console.log('OFF status:', offData.status, 'has image:', !!offData.product?.image_url);
    if (offData.product?.image_url) console.log('OFF Image URL:', offData.product.image_url);
  }
}

checkDepYogurt().catch(console.error);
