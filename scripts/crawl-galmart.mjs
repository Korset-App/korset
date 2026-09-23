import fs from 'fs';

async function crawlGalmart() {
  console.log('Fetching Galmart base sections...');
  const res = await fetch('https://api.galmart.kz/api/v2/catalog/base-sections/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const json = await res.json();
  const baseSections = json.data || [];
  console.log(`Found ${baseSections.length} base sections.`);

  const allSubsections = [];
  for (const bs of baseSections) {
    if (Array.isArray(bs.sections)) {
      for (const s of bs.sections) {
        allSubsections.push({ id: s.id, title: s.title, parent: bs.title });
      }
    }
  }
  console.log(`Found ${allSubsections.length} subsections.`);

  const allGoods = [];
  const seenIds = new Set();

  for (let i = 0; i < allSubsections.length; i++) {
    const sec = allSubsections[i];
    try {
      let page = 1;
      let hasMore = true;
      let secCount = 0;
      while (hasMore) {
        const goodsRes = await fetch(`https://api.galmart.kz/api/v2/catalog/sections/${sec.id}/goods/?page=${page}&limit=50`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!goodsRes.ok) break;
        const gJson = await goodsRes.json();
        const goods = gJson.data?.goods || gJson.data?.results || [];
        if (!goods.length) break;

        for (const g of goods) {
          if (!seenIds.has(g.id)) {
            seenIds.add(g.id);
            allGoods.push({
              id: g.id,
              title: g.title,
              brand: g.brand_name || null,
              description: g.description || null,
              composition: g.composition || null,
              storage_conditions: g.storage_conditions || null,
              country: g.country_name || null,
              manufacturer: g.manufacturer_name || null,
              calories: g.calories || null,
              protein: g.protein || null,
              fat: g.fat || null,
              carbs: g.carbohydrates || null,
              price: g.price || null,
              photos: g.photos || [],
              category: sec.parent,
              subcategory: sec.title
            });
            secCount++;
          }
        }

        if (goods.length < 50) {
          hasMore = false;
        } else {
          page++;
          if (page > 20) break; // safety guard
        }
      }
      if (secCount > 0) {
        console.log(`[${i + 1}/${allSubsections.length}] Section "${sec.title}": +${secCount} goods (total: ${allGoods.length})`);
      }
    } catch (e) {
      console.error(`Error in section ${sec.id} (${sec.title}):`, e.message);
    }
  }

  console.log(`\nCrawling complete! Total unique Galmart goods: ${allGoods.length}`);
  fs.writeFileSync('data/galmart_catalog.json', JSON.stringify(allGoods, null, 2), 'utf8');
  console.log('Saved to data/galmart_catalog.json');
}

crawlGalmart();
