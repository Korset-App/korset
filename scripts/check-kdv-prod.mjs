async function checkKdvProduct() {
  const url = 'https://kdvonline.kz/product/vafli-s-shokoladom-12571';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  console.log('Product HTML length:', html.length);
  
  // Barcode
  const bcMatch = html.match(/[Шш]трихкод[^<]*<[^>]+>([0-9]{8,14})/);
  console.log('Barcode:', bcMatch ? bcMatch[1] : null);

  // JSON-LD
  const jld = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jld) {
    try {
      const obj = JSON.parse(m[1]);
      console.log('JSON-LD gtin13:', obj.gtin13, 'image:', obj.image, 'brand:', obj.brand?.name);
    } catch {}
  }

  // Composition
  const compMatch = html.match(/Состав[:\s]*<\/[^>]+>([\s\S]*?)<\/p>|Состав[:\s]*([\s\S]*?)<\/(p|div|span|td)/i);
  console.log('Composition:', compMatch ? (compMatch[1] || compMatch[2] || '').replace(/<[^>]+>/g, '').trim().slice(0, 150) : null);
}
checkKdvProduct();
