async function inspectVkusvillBarillaPage() {
  const url = 'https://vkusvill.ru/goods/makaronnye-izdeliya-barilla-5-spagetti-450-g-35197/';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  console.log('Status:', res.status, 'HTML length:', html.length);

  // Check JSON-LD
  const jsonLd = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  for (const j of jsonLd) {
    console.log('\n--- JSON-LD ---');
    console.log(j.slice(0, 800));
  }

  // Check dataLayer / window.__
  const windowMatches = [...html.matchAll(/window\.[a-zA-Z0-9_]+\s*=\s*[\s\S]*?;/g)].map(m => m[0]);
  console.log('\nWindow objects found:', windowMatches.length);
  for (const w of windowMatches) {
    if (w.length < 2000) console.log(w);
  }

  // Look for Barcode, Composition, Shelf life
  const patterns = ['Штрихкод', 'Состав', 'Срок годности', 'Пищевая ценность', 'ккал', 'жиры', 'белки', 'углеводы'];
  console.log('\n--- Content Patterns ---');
  for (const pat of patterns) {
    const idx = html.indexOf(pat);
    if (idx !== -1) {
      console.log(`Pattern "${pat}":`, html.slice(idx, idx + 180).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    }
  }
}

inspectVkusvillBarillaPage().catch(console.error);
