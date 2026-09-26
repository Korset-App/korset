async function testKzOff() {
  const url = 'https://kz.openfoodfacts.org/';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    console.log('kz.openfoodfacts.org status:', res.status, 'len:', html.length);
    const countMatch = html.match(/([\d\s]+)\s+products/i) || html.match(/([\d\s]+)\s+өнім/i) || html.match(/([\d\s]+)\s+продук/i);
    console.log('Product count match:', countMatch ? countMatch[0] : 'None');
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testKzOff().catch(console.error);
