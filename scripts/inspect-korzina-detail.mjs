async function inspectDetail() {
  const url = 'https://api.korzinavdom.kz/client/showcases/139049';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const j = await res.json();
  console.log('Detail keys:', Object.keys(j.data || {}));
  console.log('Detail options:', JSON.stringify(j.data?.options, null, 2));
  console.log('Markers:', JSON.stringify(j.data?.markers));
  console.log('Composition:', j.data?.composition);
}
inspectDetail();
