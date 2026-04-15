-- Сброс и добавление 10 качественных продуктов
-- Выполнить в Supabase SQL Editor

-- 1. Удалить старые связи store_products
DELETE FROM store_products 
WHERE ean IN (
  '4014400400007', '4606272039722', '4870035000087', '4870035000088', 
  '4607025396046', '4607025396053', '4607025396060', 
  '4600999001234', '4600999001235', '4600999001236'
);

-- 2. Удалить старые продукты из global_products
DELETE FROM global_products 
WHERE ean IN (
  '4014400400007', '4606272039722', '4870035000087', '4870035000088',
  '4607025396046', '4607025396053', '4607025396060', '4600999001234',
  '4600999001235', '4600999001236'
);

-- 3. Добавить 10 качественных продуктов
INSERT INTO global_products (
  id, ean, name, name_kz, brand, category, subcategory, 
  quantity, image_url, ingredients_raw, ingredients_kz,
  nutriments_json, allergens_json, diet_tags_json, halal_status, 
  nutriscore, data_quality_score, is_verified, is_active,
  created_at, updated_at
) VALUES 

-- 1. Toffifee
(gen_random_uuid(), '4014400400007', 'Toffifee Caramel Hazelnut Chocolate 125g', 'Toffifee карамельді жаңғақ шоколад 125г', 'Toffifee', 'Кондитерские изделия', 'Шоколадные конфеты', '125 г', 
'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400',
'Caramel (41%): sugar, vegetable oils (palm, shea, coconut), hazelnuts (10%), glucose syrup, humectant: sorbitol syrup, skimmed milk powder, lactose-free skimmed milk, cocoa butter, milk fat, cane sugar syrup, milk powder, emulsifier: soy lecithin, salt, flavorings.',
'Карамель (41%): қант, өсімдік майлары (пальма, ши, кокос), жаңғақтар (10%), глюкоза сиропы, ылғалдандырғыш: сорбит шарабы, майсыздандырылған сүт ұнтағы, лактозасыз майсыз сүт, какао майы, сүт майы, құрақ қант сиропы, сүт ұнтағы, эмульгатор: соя лецитині, тұз, дәмдеуіштер.',
'{"energy_kj": 2177, "energy_kcal": 521, "protein": 6.0, "fat": 29.0, "saturated_fat": 12.7, "carbs": 58.9, "sugar": 48.8, "salt": 0.27}',
'["milk", "hazelnuts", "soy", "lactose"]',
'["vegetarian"]',
'no',
'C', 95, true, true, NOW(), NOW()),

-- 2. Maggi
(gen_random_uuid(), '4606272039722', 'Maggi Pasta with Chicken and Mushrooms 249g', 'Maggi Тауық пен саңырауқұлақ қосылған макарон 249г', 'Maggi', 'Быстрое приготовление', 'Смеси для приготовления', '249 г',
'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400',
'Durum wheat semolina, palm fat, wheat flour, maltodextrin, modified corn starch, salt, cheese powder (4%), yeast extract, cream powder (3%), mushroom powder (2%), chicken fat (2%), onion powder, garlic powder, spices, sugar, herbs, flavorings (contain milk, celery), citric acid.',
'Дурум бидайы ұнтағы, пальма майы, бидай ұны, мальтодекстрин, модификацияланған кукуруз крахмалы, тұз, ірімшік ұнтағы (4%), ашытқы экстракты, қаймақ ұнтағы (3%), саңырауқұлақ ұнтағы (2%), тауық майы (2%), пияз ұнтағы, сарымсақ ұнтағы, дәмдеуіштер, қант, шөптік, дәмдеуіштер (сүт, селдерей құрайды), лимон қышқылы.',
'{"energy_kj": 1359, "energy_kcal": 325, "protein": 10.0, "fat": 9.0, "saturated_fat": 5.0, "carbs": 52.0, "sugar": 8.0, "salt": 2.5}',
'["gluten", "milk", "celery"]',
'[]',
'unknown',
'D', 92, true, true, NOW(), NOW()),

-- 3. Базилик 3 Желания
(gen_random_uuid(), '4870035000087', '3 Zhelaniya Dried Basil 15g', '3 Тілег Құрғақ Базилик 15г', '3 Zhelaniya', 'Специи и приправы', 'Сушеные травы', '15 г',
'https://images.unsplash.com/photo-1606914501449-5a9664d1d151?w=400',
'100% dried basil leaves (Ocimum basilicum).',
'100% құрғақ базилик жапырақтары (Ocimum basilicum).',
'{"energy_kj": 132, "energy_kcal": 32, "protein": 3.2, "fat": 0.6, "saturated_fat": 0.1, "carbs": 4.3, "sugar": 0.0, "salt": 0.2}',
'[]',
'["vegan", "gluten-free", "halal"]',
'yes',
'A', 98, true, true, NOW(), NOW()),

-- 4. Райхан
(gen_random_uuid(), '4870035000088', 'Raihan Dried Basil Premium 15g', 'Райхан Премиум Құрғақ Базилик 15г', 'Raihan', 'Специи и приправы', 'Сушеные травы', '15 г',
'https://images.unsplash.com/photo-1618147868224-4786f8381190?w=400',
'100% dried basil leaves (Ocimum basilicum). Grown in Kazakhstan.',
'100% құрғақ базилик жапырақтары (Ocimum basilicum). Қазақстанда өсірілген.',
'{"energy_kj": 130, "energy_kcal": 31, "protein": 3.0, "fat": 0.5, "saturated_fat": 0.1, "carbs": 4.0, "sugar": 0.0, "salt": 0.1}',
'[]',
'["vegan", "gluten-free", "halal", "local"]',
'yes',
'A', 99, true, true, NOW(), NOW()),

-- 5. Лаваш
(gen_random_uuid(), '4607025396046', 'Uzbek Lavash Traditional 300g', 'Өзбекстандық Лаваш Дәстүрлі 300г', 'Uzbek Tradition', 'Хлебобулочные изделия', 'Лаваш', '300 г',
'https://images.unsplash.com/photo-1626202378367-37427e5f7f34?w=400',
'Wheat flour, water, salt, yeast.',
'Бидай ұны, су, тұз, ашытқы.',
'{"energy_kj": 1060, "energy_kcal": 253, "protein": 8.0, "fat": 1.5, "saturated_fat": 0.3, "carbs": 52.0, "sugar": 2.0, "salt": 1.0}',
'["gluten"]',
'["vegan", "halal"]',
'yes',
'B', 90, true, true, NOW(), NOW()),

-- 6. Сыр
(gen_random_uuid(), '4607025396053', 'Kostromskoy Cheese 45% 200g', 'Қостромской Ірімшігі 45% 200г', 'Kostromskoy', 'Молочные продукты', 'Твердые сыры', '200 г',
'https://images.unsplash.com/photo-1606914501449-5a9664d1d151?w=400',
'Pasteurized milk, salt, starter cultures, microbial rennet.',
'Пастеризацияланған сүт, тұз, starter cultures, микробиологиялық реннет.',
'{"energy_kj": 1450, "energy_kcal": 347, "protein": 25.0, "fat": 27.0, "saturated_fat": 17.0, "carbs": 0.0, "sugar": 0.0, "salt": 1.5}',
'["milk", "lactose"]',
'["vegetarian", "halal"]',
'yes',
'C', 93, true, true, NOW(), NOW()),

-- 7. Масло
(gen_random_uuid(), '4607025396060', 'Vologodskoe Butter 82.5% 180g', 'Вологодское Сарымай 82.5% 180г', 'Vologodskoe', 'Молочные продукты', 'Сливочное масло', '180 г',
'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
'Cream (cow milk), 82.5% fat.',
'Сүтті сливки (сиыр сүті), 82.5% майлылық.',
'{"energy_kj": 3030, "energy_kcal": 725, "protein": 0.5, "fat": 82.5, "saturated_fat": 51.0, "carbs": 0.8, "sugar": 0.8, "salt": 0.0}',
'["milk", "lactose"]',
'["vegetarian", "gluten-free", "halal"]',
'yes',
'D', 94, true, true, NOW(), NOW()),

-- 8. Coca-Cola
(gen_random_uuid(), '4600999001234', 'Coca-Cola 0.5L', 'Coca-Cola 0.5л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '500 мл',
'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
'Carbonated water, sugar, caramel color (E150d), phosphoric acid, natural flavorings, caffeine.',
'Газдалған су, қант, карамель бояғышы (E150d), фосфор қышқылы, табиғи дәмдеуіштер, кофеин.',
'{"energy_kj": 180, "energy_kcal": 43, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 10.6, "sugar": 10.6, "salt": 0.0}',
'[]',
'["vegan", "gluten-free", "halal"]',
'yes',
'E', 95, true, true, NOW(), NOW()),

-- 9. Snickers
(gen_random_uuid(), '4600999001235', 'Snickers Chocolate Bar 50g', 'Snickers Шоколад Батончигі 50г', 'Snickers', 'Кондитерские изделия', 'Шоколадные батончики', '50 г',
'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400',
'Milk chocolate, peanuts, glucose syrup, sugar, skimmed milk powder, palm fat, lactose, sunflower oil, salt, egg white powder.',
'Сүтті шоколад, жаңғақтар, глюкоза сиропы, қант, майсыз сүт ұнтағы, пальма майы, лактоза, күнбағыс майы, тұз, жұмыртқа ақуызы.',
'{"energy_kj": 2028, "energy_kcal": 485, "protein": 9.0, "fat": 25.0, "saturated_fat": 12.0, "carbs": 56.0, "sugar": 50.0, "salt": 0.5}',
'["milk", "peanuts", "soy", "egg", "lactose"]',
'["vegetarian"]',
'unknown',
'D', 96, true, true, NOW(), NOW()),

-- 10. Red Bull
(gen_random_uuid(), '4600999001236', 'Red Bull Energy Drink 250ml', 'Red Bull Энергетикалық Сусын 250мл', 'Red Bull', 'Напитки', 'Энергетики', '250 мл',
'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400',
'Water, sucrose, glucose, citric acid, carbon dioxide, taurine (0.4%), sodium bicarbonate, caffeine (0.03%), vitamins B6, B12.',
'Су, сахароза, глюкоза, лимон қышқылы, көміртек диоксиді, таурин (0.4%), натрий бикарбонаты, кофеин (0.03%), В6, В12 витаминдері.',
'{"energy_kj": 174, "energy_kcal": 42, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 10.0, "sugar": 10.0, "salt": 0.1}',
'[]',
'["vegan", "gluten-free", "halal"]',
'yes',
'D', 95, true, true, NOW(), NOW())

ON CONFLICT (ean) DO UPDATE SET
  name = EXCLUDED.name,
  name_kz = EXCLUDED.name_kz,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  nutriments_json = EXCLUDED.nutriments_json,
  updated_at = NOW();
