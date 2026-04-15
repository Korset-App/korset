-- ВОССТАНОВЛЕНИЕ ПРОДУКТОВ из store-one (по скриншотам)
-- Магазин: store-one (cebbe5fe-0512-4b24-96c9-3af7c948b3a4)

-- 1. Удалить текущие продукты этого магазина
DELETE FROM store_products WHERE store_id = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4';
DELETE FROM global_products WHERE ean LIKE '46%' OR ean LIKE '48%' OR ean LIKE '69%';

-- 2. Добавить продукты со скриншотов
INSERT INTO global_products (
  id, ean, name, name_kz, brand, category, subcategory, 
  quantity, image_url, ingredients_raw, ingredients_kz,
  nutriments_json, allergens_json, diet_tags_json, halal_status, 
  nutriscore, data_quality_score, is_verified, is_active,
  created_at, updated_at
) VALUES 

-- Батончик Step 50г (180₸)
(gen_random_uuid(), '46000000103012', 'Батончик Step 50г', 'Step батончигі 50г', 'Step', 'Кондитерские', 'Батончики', '50 г',
'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
'Milk chocolate, nougat, peanuts, caramel',
'Сүтті шоколад, нуга, жаңғақтар, карамель',
'{"energy_kj": 2100, "energy_kcal": 500, "protein": 8, "fat": 25, "saturated_fat": 10, "carbs": 60, "sugar": 55, "salt": 0.3}',
'["milk","peanuts"]',
'["vegetarian"]',
'unknown',
'D', 70, true, true, NOW(), NOW()),

-- Coca-Cola 0.5л (320₸)
(gen_random_uuid(), '5000112546324', 'Coca-Cola 0.5л', 'Coca-Cola 0.5л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '500 мл',
'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
'Carbonated water, sugar, caramel color, phosphoric acid, caffeine',
'Газдалған су, қант, карамель бояғышы, фосфор қышқылы, кофеин',
'{"energy_kj": 180, "energy_kcal": 42, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 10.6, "sugar": 10.6, "salt": 0}',
'[]',
'[]',
'unknown',
'E', 60, true, true, NOW(), NOW()),

-- Coca-Cola 1л (520₸)
(gen_random_uuid(), '5000112546325', 'Coca-Cola 1л', 'Coca-Cola 1л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '1 л',
'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
'Carbonated water, sugar, caramel color, phosphoric acid, caffeine',
'Газдалған су, қант, карамель бояғышы, фосфор қышқылы, кофеин',
'{"energy_kj": 180, "energy_kcal": 42, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 10.6, "sugar": 10.6, "salt": 0}',
'[]',
'[]',
'unknown',
'E', 60, true, true, NOW(), NOW()),

-- Coca-Cola Zero 0.5л (340₸)
(gen_random_uuid(), '5000112546326', 'Coca-Cola Zero 0.5л', 'Coca-Cola Zero 0.5л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '500 мл',
'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400',
'Carbonated water, sweeteners, caramel color, phosphoric acid, caffeine',
'Газдалған су, тәттendirгіштер, карамель бояғышы, фосфор қышқылы, кофеин',
'{"energy_kj": 1, "energy_kcal": 0.3, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 0, "sugar": 0, "salt": 0.02}',
'[]',
'["no_sugar"]',
'unknown',
'B', 70, true, true, NOW(), NOW()),

-- Pepsi 0.5л (300₸)
(gen_random_uuid(), '48900008100309', 'Pepsi 0.5л', 'Pepsi 0.5л', 'Pepsi', 'Напитки', 'Газированные напитки', '500 мл',
'https://images.unsplash.com/photo-1556742111-a301076d9d9d?w=400',
'Carbonated water, sugar, caramel color, phosphoric acid, caffeine, citric acid',
'Газдалған су, қант, карамель бояғышы, фосфор қышқылы, кофеин, лимон қышқылы',
'{"energy_kj": 170, "energy_kcal": 41, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 11, "sugar": 11, "salt": 0}',
'[]',
'[]',
'unknown',
'E', 60, true, true, NOW(), NOW()),

-- Cool Cola 1л (220₸)
(gen_random_uuid(), '4870200003011', 'Cool Cola 1л', 'Cool Cola 1л', 'Wimm-Bill-Dann', 'Напитки', 'Газированные напитки', '1 л',
'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
'Carbonated water, sugar, cola flavoring, caramel color, citric acid',
'Газдалған су, қант, кола дәмдеуіші, карамель бояғышы, лимон қышқылы',
'{"energy_kj": 165, "energy_kcal": 39, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 10, "sugar": 10, "salt": 0}',
'[]',
'[]',
'unknown',
'D', 55, true, true, NOW(), NOW()),

-- Tassay 0.5л (180₸)
(gen_random_uuid(), '4870200003012', 'Tassay 0.5л', 'Tassay 0.5л', 'Tassay', 'Напитки', 'Вода', '500 мл',
'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
'Natural mineral water',
'Табиғи минералды су',
'{"energy_kj": 0, "energy_kcal": 0, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 0, "sugar": 0, "salt": 0.02}',
'[]',
'["vegan","gluten-free","halal"]',
'yes',
'A', 95, true, true, NOW(), NOW()),

-- Tassay 1л (260₸)
(gen_random_uuid(), '4870200003013', 'Tassay 1л', 'Tassay 1л', 'Tassay', 'Напитки', 'Вода', '1 л',
'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
'Natural mineral water',
'Табиғи минералды су',
'{"energy_kj": 0, "energy_kcal": 0, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 0, "sugar": 0, "salt": 0.02}',
'[]',
'["vegan","gluten-free","halal"]',
'yes',
'A', 95, true, true, NOW(), NOW()),

-- Samal 0.5л (150₸)
(gen_random_uuid(), '4870200003014', 'Samal 0.5л', 'Samal 0.5л', 'Samal', 'Напитки', 'Вода', '500 мл',
'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
'Natural mineral water',
'Табиғи минералды су',
'{"energy_kj": 0, "energy_kcal": 0, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 0, "sugar": 0, "salt": 0.03}',
'[]',
'["vegan","gluten-free","halal"]',
'yes',
'A', 90, true, true, NOW(), NOW()),

-- Samal 1л (200₸)
(gen_random_uuid(), '4870200003015', 'Samal 1л', 'Samal 1л', 'Samal', 'Напитки', 'Вода', '1 л',
'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
'Natural mineral water',
'Табиғи минералды су',
'{"energy_kj": 0, "energy_kcal": 0, "protein": 0, "fat": 0, "saturated_fat": 0, "carbs": 0, "sugar": 0, "salt": 0.03}',
'[]',
'["vegan","gluten-free","halal"]',
'yes',
'A', 90, true, true, NOW(), NOW()),

-- Рис Цесна 700г (890₸)
(gen_random_uuid(), '4870200003020', 'Рис Цесна 700г', 'Цесна күріші 700г', 'Цесна', 'Бакалея', 'Крупы', '700 г',
'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
'Rice grain',
'Күріш дән',
'{"energy_kj": 1520, "energy_kcal": 365, "protein": 7, "fat": 0.7, "saturated_fat": 0.2, "carbs": 80, "sugar": 0.1, "salt": 0}',
'[]',
'["vegan","gluten-free","halal"]',
'yes',
'A', 90, true, true, NOW(), NOW()),

-- Рис Makfa 800г (750₸)
(gen_random_uuid(), '4870200003021', 'Рис Makfa 800г', 'Makfa күріші 800г', 'Makfa', 'Бакалея', 'Крупы', '800 г',
'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
'Rice grain',
'Күріш дән',
'{"energy_kj": 1500, "energy_kcal": 360, "protein": 7.5, "fat": 1, "saturated_fat": 0.3, "carbs": 78, "sugar": 0.2, "salt": 0}',
'[]',
'["vegan","gluten-free","halal"]',
'yes',
'A', 88, true, true, NOW(), NOW()),

-- Тушёнка Кублей говядина 338г (1750₸)
(gen_random_uuid(), '4870200003022', 'Тушёнка Кублей говядина 338г', 'Кублей сиыр еті тушонкасы 338г', 'Halal Meat KZ', 'Консервы', 'Мясные консервы', '338 г',
'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400',
'Beef, water, salt, bay leaf',
'Сиыр еті, су, тұз, дафин жапырағы',
'{"energy_kj": 950, "energy_kcal": 230, "protein": 18, "fat": 16, "saturated_fat": 6, "carbs": 0, "sugar": 0, "salt": 1.5}',
'[]',
'["halal","high-protein"]',
'yes',
'B', 85, true, true, NOW(), NOW()),

-- Snickers 80г (620₸)
(gen_random_uuid(), '4600000102453', 'Snickers 80г', 'Snickers 80г', 'Mars', 'Кондитерские', 'Батончики', '80 г',
'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400',
'Milk chocolate, peanuts, nougat, caramel',
'Сүтті шоколад, жаңғақтар, нуга, карамель',
'{"energy_kj": 2100, "energy_kcal": 500, "protein": 9, "fat": 26, "saturated_fat": 11, "carbs": 55, "sugar": 50, "salt": 0.4}',
'["milk","peanuts","eggs","soy"]',
'["vegetarian"]',
'unknown',
'D', 65, true, true, NOW(), NOW()),

-- Колбаса Мама Может 400г (1890₸)
(gen_random_uuid(), '4870200003023', 'Колбаса Мама Может 400г', 'Мама Может шұжықы 400г', 'Мясокомбинат', 'Мясо', 'Колбасы', '400 г',
'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400',
'Pork, beef, water, salt, spices, sodium nitrite',
'Шошқа еті, сиыр еті, су, тұз, дәмдеуіштер, нитрит натрия',
'{"energy_kj": 1100, "energy_kcal": 270, "protein": 12, "fat": 22, "saturated_fat": 8, "carbs": 2, "sugar": 0, "salt": 2}',
'[]',
'[]',
'no',
'D', 60, true, true, NOW(), NOW()),

-- Snickers 50г (220₸)
(gen_random_uuid(), '4600000102452', 'Snickers 50г', 'Snickers 50г', 'Mars', 'Кондитерские', 'Батончики', '50 г',
'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400',
'Milk chocolate, peanuts, nougat, caramel',
'Сүтті шоколад, жаңғақтар, нуга, карамель',
'{"energy_kj": 2100, "energy_kcal": 500, "protein": 9, "fat": 26, "saturated_fat": 11, "carbs": 55, "sugar": 50, "salt": 0.4}',
'["milk","peanuts","eggs","soy"]',
'["vegetarian"]',
'unknown',
'D', 65, true, true, NOW(), NOW());
