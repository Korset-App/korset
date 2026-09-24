async function inspectKdv() {
  try {
    const res = await fetch('https://kdvonline.kz/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    console.log('KDV status:', res.status);
    const html = await res.text();
    console.log('KDV HTML length:', html.length);
    const re = /href="(\/category\/[^"]+)"/g;
    let match;
    const cats = new Set();
    while ((match = re.exec(html)) !== null) {
      cats.add(match[1]);
    }
    console.log('Found categories:', Array.from(cats).slice(0, 15));
  } catch (e) {
    console.log('KDV error:', e.message);
  }
}
inspectKdv();
