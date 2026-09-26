async function testGalmart() {
  const res = await fetch('https://api.galmart.kz/api/v2/catalog/base-sections/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const json = await res.json();
  console.log('Galmart base sections count:', json.data?.length);
  let totalSubs = 0;
  json.data?.forEach(bs => {
    const subs = bs.sections?.length || 0;
    console.log(`- ${bs.title}: ${subs} subsections`);
    totalSubs += subs;
  });
  console.log('Total subsections:', totalSubs);

  // Check search endpoint in Galmart:
  const searchRes = await fetch('https://api.galmart.kz/api/v2/catalog/search/?query=lay&limit=10', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('Galmart search status:', searchRes.status);
  if (searchRes.ok) {
    const sJson = await searchRes.json();
    console.log('Galmart search results:', sJson.data?.goods?.length || sJson.data?.results?.length || sJson.data?.length);
  }
}
testGalmart().catch(console.error);
