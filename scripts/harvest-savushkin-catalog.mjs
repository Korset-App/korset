import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CATEGORY_SLUGS = [
  'bionapitok-kislomolochnyy',
  'brynza',
  'yogurt-gustoy',
  'yogurt-grecheskiy-teos-gustoy',
  'yogurt-pitevoy',
  'yogurt-s-topperom',
  'kefir',
  'kokteyl-molochnyy',
  'maslo-slivochnoe',
  'moloko',
  'motsarella-dlya-pitstsy',
  'motsarella-shar',
  'napitki-sokosoderjashie',
  'pasta-vozdushnaya-dvukhsloynaya',
  'puding-tvorozhnyy',
  'ryazhenka',
  'smetana',
  'syr',
  'syr-belyj',
  'syr-plavlenyy',
  'syrok-glazirovannyy',
  'syrok-tvorozhnyy',
  'syr-tvorozhnyy',
  'suluguni',
  'tvorog-traditsionnyy',
  'tvorog-zernenyy',
  'tvorog-myagkiy',
  'tvorozhnaya-pasta',
  'feta',
  'novinki'
];

function parseSavushkinPage(html, url) {
  const products = [];
  const productBlocks = html.split(/<div class="product product_/i).slice(1);

  for (const block of productBlocks) {
    const nameMatch = block.match(/<div class="product__name"[^>]*>([\s\S]*?)<\/div>/i);
    const name = nameMatch ? cleanText(nameMatch[1]) : '';
    if (!name) continue;

    let brand = 'Савушкин';
    if (/брест-литовск/i.test(name)) brand = 'Брест-Литовск';
    else if (/teos|теос/i.test(name)) brand = 'TEOS';
    else if (/sveza|свеза/i.test(name)) brand = 'Sveza';
    else if (/березка/i.test(name)) brand = 'Березка';
    else if (/оптималь/i.test(name)) brand = 'Оптималь';
    else if (/активил/i.test(name)) brand = 'Активил';
    else if (/апети|apeti/i.test(name)) brand = 'Apeti';
    else if (/суперкид|superkid/i.test(name)) brand = 'СуперКид';
    else if (/ласковое\s*лето/i.test(name)) brand = 'Ласковое лето';
    else if (/\bтоп\b|\btop\b/i.test(name)) brand = 'ТОП';

    const propBlocks = block.split('<div class="props ');
    for (let i = 1; i < propBlocks.length; i += 2) {
      const metaBlock = propBlocks[i];
      const nutrBlock = propBlocks[i + 1] || '';

      const metaProps = Object.fromEntries(
        [...metaBlock.matchAll(/<div class="props__name"[^>]*>([\s\S]*?)<\/div>\s*<div class="props__value"[^>]*>([\s\S]*?)<\/div>/gi)]
          .map(m => [cleanText(m[1]).replace(/[*:]/g, '').toLowerCase(), cleanText(m[2])])
      );

      const nutrProps = Object.fromEntries(
        [...nutrBlock.matchAll(/<div class="props__name"[^>]*>([\s\S]*?)<\/div>\s*<div class="props__value"[^>]*>([\s\S]*?)<\/div>/gi)]
          .map(m => [cleanText(m[1]).replace(/[*:]/g, '').toLowerCase(), cleanText(m[2])])
      );

      const volume = metaProps['объем'] || metaProps['вес'] || metaProps['масса нетто'] || '';
      const fatPercent = metaProps['жирность'] || metaProps['массовая доля жира'] || '';
      const packaging = metaProps['упаковка'] || '';
      const shelfLife = metaProps['срок годности'] || '';
      const storageConditions = metaProps['условия хранения'] || '';
      const flavor = metaProps['вкус'] || metaProps['вид'] || '';

      let protein = null;
      let fat = null;
      let carbs = null;
      let calories = null;

      for (const [k, v] of Object.entries(nutrProps)) {
        if (k.includes('белк')) {
          const n = parseFloat(v.replace(',', '.'));
          if (!isNaN(n) && n >= 0 && n <= 100) protein = n;
        } else if (k.includes('жир')) {
          const n = parseFloat(v.replace(',', '.'));
          if (!isNaN(n) && n >= 0 && n <= 100) fat = n;
        } else if (k.includes('углевод')) {
          const n = parseFloat(v.replace(',', '.'));
          if (!isNaN(n) && n >= 0 && n <= 100) carbs = n;
        } else if (k.includes('ккал') || k.includes('энерг')) {
          const n = parseFloat(v.replace(',', '.'));
          if (!isNaN(n) && n >= 10 && n <= 950) calories = Math.round(n);
        }
      }

      if (!calories && protein !== null && fat !== null && carbs !== null) {
        calories = Math.round(4 * protein + 9 * fat + 4 * carbs);
      }

      const titleParts = [name];
      if (flavor && !name.toLowerCase().includes(flavor.toLowerCase())) {
        titleParts.push(flavor);
      }
      if (fatPercent && !name.toLowerCase().includes(fatPercent.toLowerCase())) {
        titleParts.push(fatPercent);
      }
      if (volume && !name.toLowerCase().includes(volume.toLowerCase())) {
        titleParts.push(volume);
      }
      const fullTitle = titleParts.join(' ').replace(/\s+/g, ' ').trim();

      products.push({
        source_url: url,
        brand,
        base_title: name,
        title: fullTitle,
        flavor,
        fat_percent: fatPercent,
        volume,
        packaging,
        shelf_life: shelfLife,
        storage_conditions: storageConditions,
        protein,
        fat,
        carbs,
        calories
      });
    }
  }

  return products;
}

async function main() {
  console.log('--- Starting Savushkin / Brest-Litovsk Catalog Harvester ---');
  const allProducts = [];
  const seenKeys = new Set();

  for (let i = 0; i < CATEGORY_SLUGS.length; i++) {
    const slug = CATEGORY_SLUGS[i];
    const url = `https://savushkin.com/products/${slug}/`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) {
        console.warn(`[${i + 1}/${CATEGORY_SLUGS.length}] ${url} returned ${res.status}`);
        continue;
      }
      const html = await res.text();
      const prods = parseSavushkinPage(html, url);

      let added = 0;
      for (const p of prods) {
        const key = `${p.brand}_${p.title}_${p.volume}_${p.fat_percent}`.toLowerCase();
        if (!seenKeys.has(key) && (p.calories || p.protein || p.fat || p.carbs)) {
          seenKeys.add(key);
          allProducts.push(p);
          added++;
        }
      }
      console.log(`[${i + 1}/${CATEGORY_SLUGS.length}] ${slug} => +${added} products (total: ${allProducts.length})`);
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`Error fetching ${url}:`, e.message);
    }
  }

  console.log(`\nHarvested ${allProducts.length} verified official products from Savushkin / Brest-Litovsk / TEOS / Sveza`);
  const brands = {};
  for (const p of allProducts) {
    brands[p.brand] = (brands[p.brand] || 0) + 1;
  }
  console.log('Brands breakdown:', brands);

  const outPath = 'data/savushkin_official_catalog.json';
  fs.writeFileSync(outPath, JSON.stringify(allProducts, null, 2));
  console.log(`Saved to ${outPath}`);
}

main().catch(console.error);
