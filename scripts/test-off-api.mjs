async function testOpenFoodFacts() {
  console.log('Testing Open Food Facts API for Kazakhstan (country / prefix 487)...');

  // Search by country: kazakhstan
  try {
    const url = 'https://world.openfoodfacts.org/api/v2/search?countries_tags_en=kazakhstan&fields=code,product_name,brands,ingredients_text,nutriments,labels_tags&page_size=20';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KorsetCatalogEnricher/1.0 (contact@korset.kz)' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const j = await res.json();
      console.log(`OFF Kazakhstan search: count=${j.count}, returned=${j.products?.length}`);
      if (j.products?.length > 0) {
        console.log('Sample product:', {
          code: j.products[0].code,
          name: j.products[0].product_name,
          brand: j.products[0].brands,
          has_ingredients: Boolean(j.products[0].ingredients_text),
          labels: j.products[0].labels_tags
        });
      }
    } else {
      console.log('OFF API status:', res.status);
    }
  } catch (e) {
    console.log('OFF API error:', e.message);
  }
}

testOpenFoodFacts().catch(console.error);
