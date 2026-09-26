async function testOffBarcode() {
  const ean = '4870003753403'; // Nәtige milk
  const url = `https://world.openfoodfacts.org/api/v0/product/${ean}.json`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KorsetCatalogEnricher/1.0 (dev@korset.kz)' },
      signal: AbortSignal.timeout(8000)
    });
    console.log(`OFF product ${ean} status: ${res.status}`);
    if (res.ok) {
      const j = await res.json();
      console.log('Product status_verbose:', j.status_verbose);
      if (j.product) {
        console.log('Product:', {
          product_name: j.product.product_name,
          brands: j.product.brands,
          ingredients_text: j.product.ingredients_text,
          nutriments: j.product.nutriments
        });
      }
    }
  } catch (e) {
    console.log('OFF barcode error:', e.message);
  }
}

testOffBarcode().catch(console.error);
