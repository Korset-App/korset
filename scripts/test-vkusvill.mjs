async function inspectVkusvillBarilla() {
  const res = await fetch(`https://vkusvill.ru/search/?q=${encodeURIComponent('Barilla')}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();
  const cardTitles = [...html.matchAll(/class="[^"]*ProductCard__link[^"]*"[^>]*title="([^"]+)"/g)].map(m => m[1]);
  console.log('Product card titles for Barilla:', cardTitles.slice(0, 10));

  // Check another brand: "Lay's" or "Coca-Cola"
  const resLays = await fetch(`https://vkusvill.ru/search/?q=${encodeURIComponent("Lay's")}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const htmlLays = await resLays.text();
  const cardTitlesLays = [...htmlLays.matchAll(/class="[^"]*ProductCard__link[^"]*"[^>]*title="([^"]+)"/g)].map(m => m[1]);
  console.log('Product card titles for Lays:', cardTitlesLays.slice(0, 10));
}

inspectVkusvillBarilla().catch(console.error);
