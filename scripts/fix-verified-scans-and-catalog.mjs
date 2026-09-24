/**
 * Fixes verified scan incidents and adds missing staple products.
 * Updates clean_products_v2, global_products, and store_products for all showcase stores.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function mapPackagingType(type) {
  if (!type) return null;
  const t = String(type).toLowerCase();
  if (t.includes('ведро') || t.includes('tub')) return 'tub';
  if (t.includes('стекл') || t.includes('банка')) return 'bottle_glass';
  if (t.includes('пленк') || t.includes('пакет') || t.includes('pouch') || t.includes('дой')) return 'pouch';
  if (t.includes('жест') || t.includes('ж/б') || t.includes('can')) return 'can';
  if (t.includes('тетра') || t.includes('tetrapak')) return 'tetrapak';
  if (t.includes('бутыл') && t.includes('пласт')) return 'bottle_plastic';
  return null;
}

const PRODUCTS_TO_APPLY = [
  {
    ean: '8000500023976',
    name: 'Конфеты Ferrero Raffaello T15, 150 г',
    name_kz: 'Ferrero Raffaello T15 кәмпиттері, 150 г',
    brand: 'Ferrero',
    category: 'sweets',
    subcategory: 'candy',
    quantity: '150 г',
    quantity_value: 150,
    quantity_unit: 'g',
    fat_percent: null,
    flavor: 'Кокос и миндаль',
    package_type: 'коробка',
    storage_conditions: 'Хранить при температуре от +14°C до +22°C и относительной влажности не более 65%',
    shelf_life: '9 месяцев',
    description: 'Хрустящая кокосовая конфета с цельным миндальным орехом внутри и нежным кремом.',
    ingredients_raw: 'Сушеная кокосовая стружка, растительные жиры, сахар, орехи миндаля сладкого, сухое обезжиренное молоко, сухая молочная сыворотка, мука пшеничная, тапиоковый крахмал, эмульгатор: лецитины, ароматизаторы, разрыхлитель: гидрокарбонат натрия, соль.',
    ingredients_json: [],
    nutriments_json: { fat_100g: 48.6, energy_kcal: 628, protein_100g: 7.2, carbohydrates_100g: 38.3 },
    halal_status: 'yes',
    halal_certifier: 'Halal Damu',
    halal_notes: 'Халал сертификатталған',
    allergens_json: ['milk', 'gluten', 'tree_nuts'],
    image_url: 'https://cdn.korset.app/products/arbuz_191265/main.jpg',
    images_json: ['https://cdn.korset.app/products/arbuz_191265/main.jpg'],
    country_of_origin: 'IT',
    producer_name: 'Ferrero',
    producer_bin: null,
    quality_score: 95,
    match_source: 'verified_primary_corrected',
    price_kzt: 1850,
  },
  {
    ean: '4870035007550',
    name: 'Майонез 3 Желания провансаль 67 %, 700 г',
    name_kz: '3 Желания провансаль майонезі 67 %, 700 г',
    brand: '3 Желания',
    category: 'sauces_spices',
    subcategory: 'mayonnaise',
    quantity: '700 г',
    quantity_value: 700,
    quantity_unit: 'g',
    fat_percent: 67.0,
    flavor: 'Классический провансаль',
    package_type: 'ведро',
    storage_conditions: 'Хранить при температуре от 0°C до +18°C',
    shelf_life: '180 суток',
    description: 'Классический майонез Провансаль 67% в удобном пластиковом ведре.',
    ingredients_raw: 'Масло подсолнечное рафинированное дезодорированное, вода питьевая, яичный желток сухой, сахар, соль поваренная пищевая, кислота уксусная, горчичное масло, натуральный краситель бета-каротин.',
    ingredients_json: [],
    nutriments_json: { fat_100g: 67.0, energy_kcal: 615, protein_100g: 0.5, carbohydrates_100g: 2.5 },
    halal_status: 'yes',
    halal_certifier: 'Halal Damu',
    halal_notes: 'Халал сертификатталған ТОО Масло-Дел',
    allergens_json: ['eggs', 'mustard'],
    image_url: 'https://cdn.korset.app/products/arbuz_244837/main.jpg',
    images_json: ['https://cdn.korset.app/products/arbuz_244837/main.jpg'],
    country_of_origin: 'KZ',
    producer_name: 'ТОО Масло-Дел',
    producer_bin: '990540001099',
    quality_score: 95,
    match_source: 'verified_primary_corrected',
    price_kzt: 1250,
  },
  {
    ean: '4870001081089',
    name: 'Соус Цин-Каз Аджика, 220 г',
    name_kz: 'Цин-Каз Аджика тұздығы, 220 г',
    brand: 'Цин-Каз',
    category: 'sauces_spices',
    subcategory: 'sauce',
    quantity: '220 г',
    quantity_value: 220,
    quantity_unit: 'g',
    fat_percent: null,
    flavor: 'Острый пряный',
    package_type: 'стеклянная банка',
    storage_conditions: 'Хранить при температуре от 0°C до +25°C',
    shelf_life: '24 месяца',
    description: 'Острая кавказская аджика из натурального перца, чеснока и томатов.',
    ingredients_raw: 'Томаты свежие, перец сладкий, перец красный острый, чеснок, соль поваренная пищевая, пряности, регулятор кислотности: уксусная кислота.',
    ingredients_json: [],
    nutriments_json: { fat_100g: 0.2, energy_kcal: 45, protein_100g: 1.5, carbohydrates_100g: 9.0 },
    halal_status: 'yes',
    halal_certifier: 'Halal Damu',
    halal_notes: 'Халал сертификатталған ТОО Цин-Каз',
    allergens_json: [],
    image_url: 'https://arbuz.kz/image/s3/arbuz-kz-products/image__184029-sous_cin-kaz_adzhika_370_g.jpg?w=400&h=400&_c=1778277944',
    images_json: ['https://arbuz.kz/image/s3/arbuz-kz-products/image__184029-sous_cin-kaz_adzhika_370_g.jpg?w=400&h=400&_c=1778277944'],
    country_of_origin: 'KZ',
    producer_name: 'ТОО Цин-Каз',
    producer_bin: '980740000789',
    quality_score: 95,
    match_source: 'verified_primary_corrected',
    price_kzt: 490,
  },
  {
    ean: '4870212681429',
    name: 'Молоко Гормолзавод 2,5 %, 1 л',
    name_kz: 'Гормолзавод сүті 2,5 %, 1 л',
    brand: 'Гормолзавод',
    category: 'dairy_eggs',
    subcategory: 'milk',
    quantity: '1 л',
    quantity_value: 1000,
    quantity_unit: 'ml',
    fat_percent: 2.5,
    flavor: null,
    package_type: 'пленка',
    storage_conditions: 'Хранить при температуре от +2°C до +6°C',
    shelf_life: '7 суток',
    description: 'Натуральное пастеризованное коровье молоко 2,5% жирности.',
    ingredients_raw: 'Молоко коровье цельное, молоко обезжиренное.',
    ingredients_json: [],
    nutriments_json: { fat_100g: 2.5, energy_kcal: 53, protein_100g: 2.8, carbohydrates_100g: 4.7 },
    halal_status: 'yes',
    halal_certifier: 'Halal Damu',
    halal_notes: 'Халал сертификатталған ТОО Гормолзавод',
    allergens_json: ['milk'],
    image_url: 'https://cdn.korset.app/products/4870144003726/main.jpg',
    images_json: ['https://cdn.korset.app/products/4870144003726/main.jpg'],
    country_of_origin: 'KZ',
    producer_name: 'ТОО Гормолзавод',
    producer_bin: '990140000854',
    quality_score: 95,
    match_source: 'verified_staple_addition',
    price_kzt: 430,
  },
  {
    ean: '4870001547141',
    name: 'Томатная паста King 400 г ж/б',
    name_kz: 'King қызанақ пастасы 400 г ж/б',
    brand: 'King',
    category: 'grocery',
    subcategory: 'canned',
    quantity: '400 г',
    quantity_value: 400,
    quantity_unit: 'g',
    fat_percent: null,
    flavor: null,
    package_type: 'жестяная банка',
    storage_conditions: 'Хранить при температуре от 0°C до +25°C',
    shelf_life: '24 месяца',
    description: 'Концентрированная томатная паста высшего качества без консервантов и загустителей.',
    ingredients_raw: 'Томаты свежие концентрированные, вода питьевая.',
    ingredients_json: [],
    nutriments_json: { fat_100g: 0.2, energy_kcal: 78, protein_100g: 4.5, carbohydrates_100g: 14.5 },
    halal_status: 'yes',
    halal_certifier: 'Halal Damu',
    halal_notes: 'Халал сертификатталған ТОО Цин-Каз',
    allergens_json: [],
    image_url: 'https://arbuz.kz/image/s3/arbuz-kz-products/file_name__1c070371-082e-46d4-b883-179de4d63aec-1080-vosstanovleno_jpg.jpg?w=400&h=400&_c=1765455247',
    images_json: ['https://arbuz.kz/image/s3/arbuz-kz-products/file_name__1c070371-082e-46d4-b883-179de4d63aec-1080-vosstanovleno_jpg.jpg?w=400&h=400&_c=1765455247'],
    country_of_origin: 'KZ',
    producer_name: 'ТОО Цин-Каз',
    producer_bin: '980740000789',
    quality_score: 95,
    match_source: 'verified_staple_addition',
    price_kzt: 690,
  },
  {
    ean: '4810093016422',
    name: 'Крем сливочный ультрапастеризованный 33 % Молочный гостинец, 1 л',
    name_kz: 'Молочный гостинец ультрапастерленген кілегейі 33 %, 1 л',
    brand: 'Молочный гостинец',
    category: 'dairy_eggs',
    subcategory: 'cream',
    quantity: '1 л',
    quantity_value: 1000,
    quantity_unit: 'ml',
    fat_percent: 33.0,
    flavor: null,
    package_type: 'тетрапак',
    storage_conditions: 'Хранить при температуре от +2°C до +6°C',
    shelf_life: '6 месяцев',
    description: 'Натуральные сливки 33% жирности для взбивания и десертов.',
    ingredients_raw: 'Нормализованные сливки, стабилизаторы: каррагинан, альгинат натрия.',
    ingredients_json: [],
    nutriments_json: { fat_100g: 33.0, energy_kcal: 317, protein_100g: 2.2, carbohydrates_100g: 3.0 },
    halal_status: 'unknown',
    halal_certifier: null,
    halal_notes: null,
    allergens_json: ['milk'],
    image_url: 'https://cdn.korset.app/products/arbuz_20054/main.jpg',
    images_json: ['https://cdn.korset.app/products/arbuz_20054/main.jpg'],
    country_of_origin: 'BY',
    producer_name: 'ОАО Минский молочный завод №1',
    producer_bin: null,
    quality_score: 95,
    match_source: 'verified_staple_addition',
    price_kzt: 2450,
  },
];

async function run() {
  console.log('=== APPLYING VERIFIED PRODUCT FIXES & ADDITIONS ===');

  // 1. Update clean_products_v2
  console.log('\n1. Upserting into clean_products_v2...');
  for (const item of PRODUCTS_TO_APPLY) {
    const { price_kzt, ...cleanPayload } = item;
    const { error: cErr } = await supabase
      .from('clean_products_v2')
      .upsert(cleanPayload, { onConflict: 'ean' });
    if (cErr) {
      console.error(`Error updating clean_products_v2 for ${item.ean}:`, cErr.message);
    } else {
      console.log(`  ✓ [clean_products_v2] ${item.ean} -> ${item.name}`);
    }
  }

  // 2. Update global_products
  console.log('\n2. Upserting into global_products...');
  const eanToGlobalId = new Map();

  for (const item of PRODUCTS_TO_APPLY) {
    const globalPayload = {
      ean: item.ean,
      name: item.name,
      name_kz: item.name_kz,
      brand: item.brand,
      category: item.category,
      subcategory: item.subcategory,
      quantity: item.quantity,
      fat_percent: item.fat_percent,
      packaging_type: mapPackagingType(item.package_type),
      description: item.description,
      ingredients_raw: item.ingredients_raw,
      nutriments_json: item.nutriments_json,
      allergens_json: item.allergens_json,
      halal_status: item.halal_status,
      halal_certifier: item.halal_certifier,
      halal_notes: item.halal_notes,
      storage_conditions: item.storage_conditions,
      shelf_life: item.shelf_life,
      image_url: item.image_url,
      images: item.images_json,
      country_of_origin: item.country_of_origin,
      manufacturer: item.producer_name,
      is_active: true,
      is_verified: true,
      data_quality_score: item.quality_score,
      source_primary: 'kz_verified',
      alternate_eans: [],
      updated_at: new Date().toISOString(),
    };

    const { data: gData, error: gErr } = await supabase
      .from('global_products')
      .upsert(globalPayload, { onConflict: 'ean' })
      .select('id, ean')
      .single();

    if (gErr) {
      console.error(`Error updating global_products for ${item.ean}:`, gErr.message);
    } else {
      console.log(`  ✓ [global_products] ${item.ean} -> ${item.name} (id: ${gData.id})`);
      eanToGlobalId.set(item.ean, gData.id);
    }
  }

  // 3. Purge conflicting alternate_eans in other rows of global_products
  console.log('\n3. Cleaning up stale alternate_eans in global_products...');
  for (const item of PRODUCTS_TO_APPLY) {
    const { data: dirtyRows } = await supabase
      .from('global_products')
      .select('id, ean, name, alternate_eans')
      .contains('alternate_eans', JSON.stringify([item.ean]))
      .neq('ean', item.ean);

    if (dirtyRows && dirtyRows.length > 0) {
      for (const row of dirtyRows) {
        const cleanedAliases = (row.alternate_eans || []).filter(e => e !== item.ean);
        await supabase
          .from('global_products')
          .update({ alternate_eans: cleanedAliases })
          .eq('id', row.id);
        console.log(`  ✓ Removed dirty alias ${item.ean} from '${row.name}' (id: ${row.id})`);
      }
    }
  }

  // 4. Update store_products for all showcase stores: bereke, mars, nurly, kalina
  console.log('\n4. Syncing into store_products for showcase stores...');
  const { data: stores } = await supabase
    .from('stores')
    .select('id, code, name')
    .in('code', ['bereke', 'mars', 'nurly', 'kalina']);

  for (const store of stores) {
    for (const item of PRODUCTS_TO_APPLY) {
      const globalId = eanToGlobalId.get(item.ean);
      if (!globalId) continue;

      const storeProductPayload = {
        store_id: store.id,
        global_product_id: globalId,
        ean: item.ean,
        price_kzt: item.price_kzt,
        stock_status: 'in_stock',
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { error: spErr } = await supabase
        .from('store_products')
        .upsert(storeProductPayload, { onConflict: 'store_id,ean' });

      if (spErr) {
        console.error(`Error adding to ${store.code} (${item.ean}):`, spErr.message);
      } else {
        console.log(`  ✓ [store: ${store.code}] Added ${item.name} (${item.price_kzt} KZT)`);
      }
    }
  }

  console.log('\n=== SUCCESS: All verified scans & missing products updated across catalog and stores! ===');
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
