const API_BASE = 'https://api.korzinavdom.kz/client';

async function testDetail() {
  const ids = [26321, 5777, 10622, 8713];
  for (const id of ids) {
    const res = await fetch(`${API_BASE}/showcases/${id}`);
    const j = await res.json();
    console.log(`\n=== Showcase #${id}: ${j.data?.productName} ===`);
    console.log('Keys:', Object.keys(j.data || {}));
    console.log('Sample:', {
      productName: j.data?.productName,
      brand: j.data?.brand,
      barcode: j.data?.barcode,
      ean: j.data?.ean,
      barcodes: j.data?.barcodes,
      composition: j.data?.composition,
      storageConditions: j.data?.storageConditions,
      shelfLife: j.data?.shelfLife,
      country: j.data?.country,
      options: j.data?.options,
      markers: j.data?.markers,
      catalogPath: j.data?.catalogPath
    });
  }
}

testDetail().catch(console.error);
