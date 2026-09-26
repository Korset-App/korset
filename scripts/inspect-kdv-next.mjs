const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function inspectKdv() {
  const res = await fetch('https://kdvonline.kz/product/vafli-s-shokoladom-12571', { headers: { 'User-Agent': UA } });
  const html = await res.text();

  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  for (let i = 0; i < scripts.length; i++) {
    const attrs = scripts[i][1];
    const body = scripts[i][2];
    console.log(`\nScript #${i} [${attrs}] len: ${body.length}`);
    if (body.length > 0 && body.length < 5000) {
      console.log(body);
    } else if (body.length >= 5000) {
      console.log(body.slice(0, 300) + '... [TRUNCATED]');
    }
  }

  // Look for API endpoints in the HTML
  const apiMatches = [...html.matchAll(/https?:\/\/[^"'\s]+\/api\/[^"'\s]+/g)].map(m => m[0]);
  console.log('\nAPI URLs found in HTML:', [...new Set(apiMatches)]);
}

inspectKdv().catch(console.error);
