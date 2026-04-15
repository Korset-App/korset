-- ВОССТАНОВЛЕНИЕ 15 ОРИГИНАЛЬНЫХ ПРОДУКТОВ из products.json
-- ⚠️ Удаляет текущие и добавляет оригинальные

-- 1. Очистка
DELETE FROM store_products WHERE ean LIKE '4820000000%' OR ean LIKE '6900000000%' OR ean LIKE '4800000000%';
DELETE FROM global_products WHERE ean LIKE '4820000000%' OR ean LIKE '6900000000%' OR ean LIKE '4800000000%';

-- 2. Вставка 15 оригинальных продуктов
INSERT INTO global_products (
  id, ean, name, name_kz, brand, category, subcategory, 
  quantity, image_url, ingredients_raw, ingredients_kz,
  nutriments_json, allergens_json, diet_tags_json, halal_status, 
  nutriscore, data_quality_score, is_verified, is_active,
  created_at, updated_at
) VALUES 

-- p001: Йогурт клубничный 2.5%
(gen_random_uuid(), '4820000000001', 'Йогурт клубничный 2.5%', 'Құлпынай йогурты 2.5%', 'Айран-Сут', 'Молочные', 'Йогурты', '125 г',
'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
'Milk, strawberry puree, sugar, cream, starter cultures, flavoring',
'Сүт, құлпынай пюресі, қант, сливки, стартовые культуры, ароматизатор',
'{"energy_kj": 460, "energy_kcal": 110, "protein": 4.0, "fat": 2.5, "saturated_fat": 1.5, "carbs": 16.0, "sugar": 12.0, "salt": 0.1}',
'["milk"]',
'["contains_sugar"]',
'no',
'C', 60, true, true, NOW(), NOW()),

-- p002: Йогурт кокосовый без сахара
(gen_random_uuid(), '4820000000002', 'Йогурт кокосовый без сахара', 'Кокос йогурты қантсыз', 'Coconut Bliss', 'Молочные', 'Растительные йогурты', '125 г',
'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
'Coconut milk, tapioca starch, probiotics, natural flavoring',
'Кокос сүті, тапиока крахмалы, пробиотиктер, табиғи дәмдеуіш',
'{"energy_kj": 335, "energy_kcal": 80, "protein": 2.0, "fat": 5.0, "saturated_fat": 4.5, "carbs": 6.0, "sugar": 0.0, "salt": 0.05}',
'[]',
'["no_sugar","vegan","dairy_free"]',
'yes',
'A', 80, true, true, NOW(), NOW()),

-- p003: Сосиски куриные Halal
(gen_random_uuid(), '4820000000003', 'Сосиски куриные Halal', 'Халал тауық сосискилер', 'Halal Meat Co', 'Мясо', 'Сосиски', '400 г',
'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
'Halal chicken meat, water, salt, spices, soy protein, sodium nitrite',
'Халал тауық еті, су, тұз, дәмдеуіштер, соя ақуызы, нитрит натрия',
'{"energy_kj": 880, "energy_kcal": 210, "protein": 12.0, "fat": 15.0, "saturated_fat": 4.0, "carbs": 2.0, "sugar": 1.0, "salt": 1.8}',
'["soy"]',
'["halal"]',
'yes',
'C', 70, true, true, NOW(), NOW()),

-- p004: Сосиски говяжьи (не Halal)
(gen_random_uuid(), '4820000000004', 'Сосиски говяжьи', 'Сиыр еті сосискилер', 'Beef Master', 'Мясо', 'Сосиски', '400 г',
'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400',
'Beef, pork fat, water, salt, spices, sodium nitrite',
'Сиыр еті, шошқа майы, су, тұз, дәмдеуіштер, нитрит натрия',
'{"energy_kj": 960, "energy_kcal": 230, "protein": 11.0, "fat": 18.0, "saturated_fat": 7.0, "carbs": 1.0, "sugar": 0.0, "salt": 1.9}',
'[]',
'[]',
'no',
'D', 60, true, true, NOW(), NOW()),

-- p005: Печенье овсяное классическое
(gen_random_uuid(), '4820000000005', 'Печенье овсяное классическое', 'Классикалық сұлы печенье', 'Печенье Плюс', 'Кондитерские', 'Печенье', '300 г',
'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
'Wheat flour, oats, sugar, butter, eggs, baking powder, vanilla',
'Бидай ұны, сұлы, қант, сары май, жұмыртқа, разрыхлитель, ваниль',
'{"energy_kj": 1800, "energy_kcal": 430, "protein": 6.0, "fat": 16.0, "saturated_fat": 8.0, "carbs": 68.0, "sugar": 18.0, "salt": 0.6}',
'["gluten","milk","eggs"]',
'["contains_sugar"]',
'unknown',
'D', 60, true, true, NOW(), NOW()),

-- p006: Батончик протеиновый без сахара
(gen_random_uuid(), '4820000000006', 'Батончик протеиновый без сахара', 'Қантсыз протеин батончигі', 'Protein Power', 'Спортивное питание', 'Протеиновые батончики', '60 г',
'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
'Protein blend, nuts, cocoa butter, erythritol, fiber, natural flavors',
'Ақуыздар қоспасы, жаңғақтар, какао майы, эритрит, талшық, табиғи дәмдеуіштер',
'{"energy_kj": 880, "energy_kcal": 210, "protein": 18.0, "fat": 12.0, "saturated_fat": 4.0, "carbs": 8.0, "sugar": 0.0, "salt": 0.3}',
'["nuts"]',
'["no_sugar","high_protein"]',
'unknown',
'B', 80, true, true, NOW(), NOW()),

-- p007: Кола классическая 0.5л
(gen_random_uuid(), '4820000000007', 'Кола классическая 0.5л', 'Кола классикалық 0.5л', 'Cola Classic', 'Напитки', 'Газированные напитки', '500 мл',
'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
'Carbonated water, sugar, caramel color, phosphoric acid, caffeine, natural flavors',
'Газдалған су, қант, карамель бояғышы, фосфор қышқылы, кофеин, табиғи дәмдеуіштер',
'{"energy_kj": 180, "energy_kcal": 42, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 10.6, "sugar": 10.6, "salt": 0.0}',
'[]',
'["contains_sugar"]',
'unknown',
'E', 40, true, true, NOW(), NOW()),

-- p008: Кола Zero 0.5л (без сахара)
(gen_random_uuid(), '4820000000008', 'Кола Zero 0.5л (без сахара)', 'Кола Zero қантсыз 0.5л', 'Cola Zero', 'Напитки', 'Газированные напитки', '500 мл',
'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400',
'Carbonated water, sweeteners, caramel color, phosphoric acid, caffeine, citric acid',
'Газдалған су, тәттendirгіштер, карамель бояғышы, фосфор қышқылы, кофеин, лимон қышқылы',
'{"energy_kj": 4, "energy_kcal": 1, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 0.0, "sugar": 0.0, "salt": 0.0}',
'[]',
'["no_sugar"]',
'unknown',
'D', 50, true, true, NOW(), NOW()),

-- p009: Молоко рисовое (без лактозы, без сахара)
(gen_random_uuid(), '4820000000009', 'Молоко рисовое (без лактозы, без сахара)', 'Қантсыз күріш сүті', 'Rice Dream', 'Молочные', 'Растительное молоко', '1 л',
'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
'Rice, water, sunflower oil, calcium, salt, vitamins',
'Күріш, су, күнбағыс майы, кальций, тұз, витаминдер',
'{"energy_kj": 147, "energy_kcal": 35, "protein": 1.0, "fat": 1.0, "saturated_fat": 0.1, "carbs": 7.0, "sugar": 0.0, "salt": 0.1}',
'[]',
'["no_sugar","vegan","dairy_free"]',
'yes',
'A', 80, true, true, NOW(), NOW()),

-- p010: Кабель USB-C → USB-C 60W (премиум)
(gen_random_uuid(), '6900000000010', 'Кабель USB-C → USB-C 60W (премиум)', 'USB-C кабелі 60W (премиум)', 'TechPro', 'Электроника', 'Кабели', '1 м',
'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400',
'Braided nylon cable, USB-C connectors, 60W Power Delivery, data transfer 5Gbps',
'Т inability қапталған кабель, USB-C коннекторлар, 60W Power Delivery, деректер тасымалдау 5Gbps',
'null',
'[]',
'[]',
'unknown',
'null', 100, true, true, NOW(), NOW()),

-- p011: Кабель USB-C → USB-C (бюджет)
(gen_random_uuid(), '6900000000011', 'Кабель USB-C → USB-C (бюджет)', 'USB-C кабелі (бюджеттік)', 'BudgetTech', 'Электроника', 'Кабели', '1 м',
'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400',
'PVC cable, USB-C connectors, 18W charging, USB 2.0 data transfer',
'PVC кабель, USB-C коннекторлар, 18W зарядтау, USB 2.0 деректер тасымалдау',
'null',
'[]',
'[]',
'unknown',
'null', 40, true, true, NOW(), NOW()),

-- p012: Зарядное USB-C 33W
(gen_random_uuid(), '6900000000012', 'Зарядное USB-C 33W', 'USB-C зарядтағыш 33W', 'PowerCharge', 'Электроника', 'Зарядные устройства', '1 шт',
'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400',
'GaN technology, USB-C port, 33W Power Delivery, foldable plug',
'GaN технологиясы, USB-C порт, 33W Power Delivery, қиюлы штепсель',
'null',
'[]',
'[]',
'unknown',
'null', 80, true, true, NOW(), NOW()),

-- p013: Краска интерьерная (низкий запах, низкий VOC) 3л
(gen_random_uuid(), '4800000000013', 'Краска интерьерная (низкий запах, низкий VOC) 3л', 'Ішкі бояу (төмен иіс, төмен VOC) 3л', 'EcoPaint', 'Строительство', 'Краски', '3 л',
'https://images.unsplash.com/photo-1562259949-e8e768c5e5f0?w=400',
'Water-based acrylic, low VOC formula, titanium dioxide, eco-friendly pigments',
'Сулы акрил, төмен VOC формуласы, титан диоксиді, экологиялық бояғыштар',
'null',
'[]',
'["eco"]',
'unknown',
'null', 100, true, true, NOW(), NOW()),

-- p014: Краска интерьерная эконом 3л
(gen_random_uuid(), '4800000000014', 'Краска интерьерная эконом 3л', 'Ішкі бояу эконом 3л', 'BudgetPaint', 'Строительство', 'Краски', '3 л',
'https://images.unsplash.com/photo-1562259949-e8e768c5e5f0?w=400',
'Latex-based, standard VOC, chalk filler, basic pigments',
'Латекс негізі, стандартты VOC, бор қоспасы, негізгі бояғыштар',
'null',
'[]',
'[]',
'unknown',
'null', 40, true, true, NOW(), NOW()),

-- p015: Клей плиточный 25кг (универсальный)
(gen_random_uuid(), '4800000000015', 'Клей плиточный 25кг (универсальный)', 'Плитка желімі 25кг (универсалдық)', 'TileFix', 'Строительство', 'Клеи', '25 кг',
'https://images.unsplash.com/photo-1589939702024-10d6f8f417ce?w=400',
'Cement-based adhesive, sand, polymer additives, 25kg bag',
'Цемент негізіндегі желім, құм, полимер қоспалары, 25кг мешок',
'null',
'[]',
'[]',
'unknown',
'null', 60, true, true, NOW(), NOW());
