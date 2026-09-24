import fs from 'fs';

async function checkKdvScripts() {
  const url = 'https://kdvonline.kz/product/vafli-s-shokoladom-12571';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const scriptMatches = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const [_, attrs, content] of scriptMatches) {
    if (attrs.includes('id="__NEXT_DATA__"') || content.includes('barcode') || content.includes('ingredients') || content.includes('composition')) {
      console.log('Script attrs:', attrs.slice(0, 100));
      console.log('Sample content:', content.slice(0, 300));
    }
  }
}
checkKdvScripts();
