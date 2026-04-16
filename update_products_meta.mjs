import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const envLines = env.split('\n');
const supabaseUrl = envLines.find((l) => l.startsWith('SUPABASE_URL=')).split('=')[1].trim();
const supabaseKey = envLines.find((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const productsData = JSON.parse(fs.readFileSync('./src/data/products.json'));

// Качественные временные фото с Unsplash в зависимости от категории
const categoryImages = {
  chocolate: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=800&auto=format&fit=crop',
  cookies: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=800&auto=format&fit=crop',
  chocolate_bar: 'https://images.unsplash.com/photo-1624371414361-e670edf48a8d?q=80&w=800&auto=format&fit=crop',
  cola_zero: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
  juice: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop',
  seafood: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=800&auto=format&fit=crop',
  sauce: 'https://images.unsplash.com/photo-1472476443507-c7a5948772dc?q=80&w=800&auto=format&fit=crop',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop',
  plant_milk: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800&auto=format&fit=crop',
  beer: 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?q=80&w=800&auto=format&fit=crop',
  canned_food: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?q=80&w=800&auto=format&fit=crop',
  ice_cream: 'https://images.unsplash.com/photo-1557142046-c704a3adf8ba?q=80&w=800&auto=format&fit=crop',
  wine: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=800&auto=format&fit=crop',
  sausage: 'https://images.unsplash.com/photo-1595159046649-0d268294a4af?q=80&w=800&auto=format&fit=crop',
  snacks: 'https://images.unsplash.com/photo-1560159905-d8557ee7741d?q=80&w=800&auto=format&fit=crop',
  baby_food: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800&auto=format&fit=crop',
  cheese: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=800&auto=format&fit=crop',
  meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?q=80&w=800&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
};

async function sync() {
  console.log('🔄 Устанавливаем фото, КБЖУ и теги для 20 товаров...');

  for (const p of productsData) {
    const imageUrl = categoryImages[p.group] || categoryImages.default;

    const nutriments = p.nutriments || {};
    // Сохраним в БД удобный формат с алиасами _100g для совместимости
    if (nutriments.sugars != null) nutriments.sugars_100g = nutriments.sugars;
    if (nutriments.protein != null) nutriments.proteins_100g = nutriments.protein;
    if (nutriments.salt != null) nutriments.salt_100g = nutriments.salt;

    const { error } = await supabase
      .from('global_products')
      .update({
        images: [imageUrl],
        image_url: imageUrl,
        nutriments_json: nutriments,
        allergens_json: p.allergens || [],
        diet_tags_json: p.dietTags || [],
      })
      .eq('ean', p.ean);

    if (error) {
      console.error(`Ошибка с ${p.ean}:`, error.message);
    }
  }

  console.log('✅ Изображения и КБЖУ добавлены в базу!');
}

sync().catch(console.error);
