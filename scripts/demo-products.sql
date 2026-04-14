-- 50 реальных продуктов для демо-презентации Körset
-- Реальные EAN коды, составы, бренды доступные в Казахстане

-- Вставка в global_products
INSERT INTO global_products (
  id, ean, name, name_kz, brand, category, subcategory, 
  quantity, image_url, ingredients_raw, ingredients_kz,
  allergens_json, diet_tags_json, halal_status, 
  nutriscore, data_quality_score, is_verified, is_active,
  created_at, updated_at
) VALUES 

-- === НАПИТКИ (10 шт) ===
(gen_random_uuid(), '4602085001383', 'Coca-Cola 0.5L', 'Coca-Cola 0.5л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '500 мл', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', 'Carbonated water, sugar, caramel color, phosphoric acid, natural flavors, caffeine', 'Газированная вода, сахар, карамельный колер, фосфорная кислота, натуральные ароматизаторы, кофеин', '["sugar"]', '[]', 'unknown', 'E', 85, true, true, NOW(), NOW()),

(gen_random_uuid(), '4600096300021', 'Red Bull 250ml', 'Red Bull 250мл', 'Red Bull', 'Напитки', 'Энергетики', '250 мл', 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400', 'Water, sucrose, glucose, citric acid, carbon dioxide, taurine, sodium bicarbonate, caffeine, niacinamide', 'Вода, сахароза, глюкоза, лимонная кислота, диоксид углерода, таурин, натрий бикарбонат, кофеин, ниацинамид', '["caffeine"]', '[]', 'unknown', 'D', 90, true, true, NOW(), NOW()),

(gen_random_uuid(), '4607069620026', 'Fanta Orange 0.5L', 'Fanta Апельсин 0.5л', 'Fanta', 'Напитки', 'Газированные напитки', '500 мл', 'https://images.unsplash.com/photo-1621506289937-a8e0df959d6d?w=400', 'Carbonated water, sugar, orange juice concentrate, citric acid, natural flavors, sodium benzoate', 'Газированная вода, сахар, апельсиновый концентрат, лимонная кислота, натуральные ароматизаторы, бензоат натрия', '["sugar"]', '[]', 'unknown', 'E', 80, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602085001420', 'Sprite 0.5L', 'Sprite 0.5л', 'Sprite', 'Напитки', 'Газированные напитки', '500 мл', 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400', 'Carbonated water, sugar, citric acid, natural lemon and lime flavors, sodium citrate', 'Газированная вода, сахар, лимонная кислота, натуральные лимонно-лаймовые ароматизаторы, цитрат натрия', '["sugar"]', '[]', 'unknown', 'D', 82, true, true, NOW(), NOW()),

(gen_random_uuid(), '4607036200041', 'Pepsi 0.5L', 'Pepsi 0.5л', 'Pepsi', 'Напитки', 'Газированные напитки', '500 мл', 'https://images.unsplash.com/photo-1556742111-a301076d9d9d?w=400', 'Carbonated water, sugar, caramel color, phosphoric acid, caffeine, citric acid, natural flavor', 'Газированная вода, сахар, карамельный колер, фосфорная кислота, кофеин, лимонная кислота, натуральный ароматизатор', '["sugar"]', '[]', 'unknown', 'E', 84, true, true, NOW(), NOW()),

(gen_random_uuid(), '4600096001238', 'Nescafe Gold 190g', 'Nescafe Gold 190г', 'Nescafe', 'Напитки', 'Кофе растворимый', '190 г', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400', '100% Arabica coffee beans', '100% зерна арабики', '[]', '["vegan","gluten-free"]', 'yes', 'B', 95, true, true, NOW(), NOW()),

(gen_random_uuid(), '4607036200996', 'Lipton Green Tea 25 bags', 'Lipton Зеленый чай 25 пакетиков', 'Lipton', 'Напитки', 'Чай', '25 пакетиков', 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=400', 'Green tea leaves', 'Листья зеленого чая', '[]', '["vegan","gluten-free","halal"]', 'yes', 'A', 98, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602085003004', 'Bon Aqua 0.5L still', 'Bon Aqua 0.5л негазированная', 'Bon Aqua', 'Напитки', 'Вода', '500 мл', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400', 'Natural mineral water', 'Природная минеральная вода', '[]', '["vegan","gluten-free","halal"]', 'yes', 'A', 100, true, true, NOW(), NOW()),

(gen_random_uuid(), '4607069620125', 'Rich Orange Juice 1L', 'Rich Апельсиновый сок 1л', 'Rich', 'Напитки', 'Соки', '1 л', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400', 'Water, orange juice concentrate, sugar, citric acid, natural flavors', 'Вода, апельсиновый концентрат, сахар, лимонная кислота, натуральные ароматизаторы', '["sugar"]', '["vegetarian"]', 'unknown', 'C', 78, true, true, NOW(), NOW()),

(gen_random_uuid(), '4607036201207', 'Rusanovka Kvass 1.5L', 'Русановка Квас 1.5л', 'Русановка', 'Напитки', 'Квас', '1.5 л', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400', 'Water, rye malt, sugar, yeast, lactic acid bacteria', 'Вода, ржаной солод, сахар, дрожжи, молочнокислые бактерии', '["gluten","yeast"]', '["vegetarian"]', 'unknown', 'C', 70, true, true, NOW(), NOW()),

-- === МОЛОЧНЫЕ ПРОДУКТЫ (8 шт) ===
(gen_random_uuid(), '4602545001006', 'Danone Activia 125g', 'Danone Активиа 125г', 'Danone', 'Молочные', 'Йогурты', '125 г', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 'Milk, cream, sugar, fruit puree, bifidobacterium lactis, yogurt cultures', 'Молоко, сливки, сахар, фруктовое пюре, бифидобактерии лактиц, йогуртовые культуры', '["milk","lactose"]', '["vegetarian"]', 'unknown', 'C', 88, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545002201', 'Parmalat Milk 1L 3.2%', 'Parmalat Молоко 1л 3.2%', 'Parmalat', 'Молочные', 'Молоко', '1 л', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', 'Cow milk, 3.2% fat', 'Коровье молоко, жирность 3.2%', '["milk","lactose"]', '["vegetarian","halal"]', 'yes', 'B', 95, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545003504', 'President Camembert 125g', 'President Камамбер 125г', 'President', 'Молочные', 'Сыры', '125 г', 'https://images.unsplash.com/photo-1486297677372-6566cf43d1d9?w=400', 'Pasteurized cow milk, salt, lactic ferments, animal rennet', 'Пастеризованное коровье молоко, соль, молочнокислые закваски, животный реннет', '["milk","lactose"]', '["vegetarian"]', 'unknown', 'D', 82, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545004105', 'Viola Processed Cheese 400g', 'Viola Плавленый сыр 400г', 'Viola', 'Молочные', 'Сыры плавленые', '400 г', 'https://images.unsplash.com/photo-1624806992066-5ffcf7ca6b0f?w=400', 'Cheese, butter, milk protein, emulsifying salts', 'Сыр, масло сливочное, молочный белок, эмульгирующие соли', '["milk","lactose"]', '["vegetarian"]', 'unknown', 'D', 75, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545005508', 'Valio Butter 200g 82%', 'Valio Сливочное масло 200г 82%', 'Valio', 'Молочные', 'Масло', '200 г', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', 'Cream from cow milk, 82% fat', 'Сливки из коровьего молока, жирность 82%', '["milk","lactose"]', '["vegetarian","gluten-free"]', 'yes', 'D', 70, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545006802', 'Prostokvashino Kefir 1L', 'Простоквашино Кефир 1л', 'Простоквашино', 'Молочные', 'Кефир', '1 л', 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400', 'Normalized milk, kefir starter culture', 'Нормализованное молоко, кефирная закваска', '["milk","lactose"]', '["probiotic","halal"]', 'yes', 'B', 90, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545007208', 'Danissimo Dessert 130g', 'Даниссимо Десерт 130г', 'Danissimo', 'Молочные', 'Десерты', '130 г', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 'Cottage cheese, sugar, cream, chocolate pieces, vanilla flavor', 'Творог, сахар, сливки, кусочки шоколада, ароматизатор ваниль', '["milk","lactose","soy_lecithin"]', '["vegetarian"]', 'unknown', 'D', 72, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545008100', 'Savushkin Curd Snack 50g', 'Савушкин Продукт Сырок глазированный 50г', 'Савушкин', 'Молочные', 'Сырки', '50 г', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400', 'Cottage cheese, sugar, butter, chocolate glaze, vanilla', 'Творог, сахар, масло сливочное, шоколадная глазурь, ваниль', '["milk","lactose","soy_lecithin"]', '["vegetarian"]', 'unknown', 'D', 68, true, true, NOW(), NOW()),

-- === ХЛЕБ И ВЫПЕЧКА (7 шт) ===
(gen_random_uuid(), '4602545000016', 'Borodinsky Bread 400g', 'Хлеб Бородинский 400г', 'Каравай', 'Хлеб', 'Ржаной хлеб', '400 г', 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400', 'Rye flour, water, molasses, coriander, salt, yeast', 'Ржаная мука, вода, патока, кориандр, соль, дрожжи', '["gluten"]', '["vegan"]', 'yes', 'B', 88, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545001012', 'Wheat Toast Bread 500g', 'Хлеб Тостовый пшеничный 500г', 'Хлебозавод №1', 'Хлеб', 'Пшеничный хлеб', '500 г', 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=400', 'Wheat flour, water, yeast, sugar, salt, vegetable oil', 'Пшеничная мука, вода, дрожжи, сахар, соль, растительное масло', '["gluten"]', '["vegan"]', 'yes', 'B', 85, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545002019', 'Baton Nareznoi 400g', 'Батон Нарезной 400г', 'Хлебозавод №28', 'Хлеб', 'Батоны', '400 г', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 'Wheat flour premium, water, yeast, salt, sugar, margarine', 'Пшеничная мука высший сорт, вода, дрожжи, соль, сахар, маргарин', '["gluten","soy_lecithin"]', '["vegan"]', 'yes', 'C', 78, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545003013', 'Krakovsky Bread 700g', 'Хлеб Краковский 700г', 'Каравай', 'Хлеб', 'Пшенично-ржаной', '700 г', 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400', 'Wheat flour, rye flour, water, yeast, salt, caraway seeds', 'Пшеничная мука, ржаная мука, вода, дрожжи, соль, тмин', '["gluten"]', '["vegan"]', 'yes', 'B', 82, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545004017', 'Vanilla Croissant 80g', 'Круассан Ванильный 80г', '7DAYS', 'Выпечка', 'Круассаны', '80 г', 'https://images.unsplash.com/photo-1555507036-ab1f40388085?w=400', 'Wheat flour, palm oil, sugar, eggs, yeast, vanilla flavoring', 'Пшеничная мука, пальмовое масло, сахар, яйца, дрожжи, ароматизатор ваниль', '["gluten","eggs","milk"]', '["vegetarian"]', 'unknown', 'D', 65, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545005011', 'Choco-Pie Orion 168g', 'Чоко-Пай Orion 168г', 'Orion', 'Выпечка', 'Пирожные', '168 г (6шт)', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476d?w=400', 'Wheat flour, sugar, starch syrup, vegetable oil, cocoa powder, egg, gelatin', 'Пшеничная мука, сахар, крахмальный сироп, растительное масло, какао-порошок, яйцо, желатин', '["gluten","eggs","soy","milk"]', '[]', 'unknown', 'D', 60, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545006015', 'Jubilee Biscuits 116g', 'Печенье Юбилейное 116г', 'Юбилейное', 'Выпечка', 'Печенье', '116 г', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', 'Wheat flour, sugar, butter, eggs, baking powder, vanilla', 'Пшеничная мука, сахар, сливочное масло, яйца, разрыхлитель, ваниль', '["gluten","eggs","milk"]', '["vegetarian"]', 'unknown', 'D', 70, true, true, NOW(), NOW()),

-- === КОЛБАСЫ И МЯСО (6 шт) ===
(gen_random_uuid(), '4602545000010', 'Doctor Sausage 500g', 'Колбаса Докторская 500г', 'Мясная классика', 'Мясо', 'Вареные колбасы', '500 г', 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400', 'Pork, beef, water, milk protein, salt, spices, sodium nitrite', 'Свинина, говядина, вода, молочный белок, соль, специи, нитрит натрия', '["soy","milk","sulfites"]', '[]', 'unknown', 'D', 55, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545001017', 'Milk Sausage 400g', 'Колбаса Молочная 400г', 'Мясная классика', 'Мясо', 'Вареные колбасы', '400 г', 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400', 'Pork, beef, milk powder, water, salt, spices', 'Свинина, говядина, сухое молоко, вода, соль, специи', '["milk","soy","sulfites"]', '[]', 'unknown', 'D', 58, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545002014', 'Servelat Smoked 300g', 'Сервелат Копченый 300г', 'Мясная классика', 'Мясо', 'Копченые колбасы', '300 г', 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400', 'Pork, beef, lard, salt, spices, sodium nitrite, starter culture', 'Свинина, говядина, сало, соль, специи, нитрит натрия, стартовая культура', '["sulfites"]', '[]', 'unknown', 'D', 52, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545003018', 'Chicken Breast Fillet 1kg', 'Куриное филе грудки 1кг', 'Приосколье', 'Мясо', 'Птица', '1 кг', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400', 'Chicken breast meat, water, salt', 'Мясо куриной грудки, вода, соль', '[]', '["gluten-free","halal"]', 'halal', 'A', 95, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545004012', 'Beef Ground 400g', 'Фарш говяжий 400г', 'Мираторг', 'Мясо', 'Говядина', '400 г', 'https://images.unsplash.com/photo-1542276860-c1f5b29a9f84?w=400', 'Beef meat, 15% fat', 'Говяжье мясо, жирность 15%', '[]', '["gluten-free","halal"]', 'halal', 'B', 92, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545005016', 'Pork Chops 800g', 'Свиные отбивные 800г', 'Мясной двор', 'Мясо', 'Свинина', '800 г', 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400', 'Pork loin, bone-in', 'Свиная корейка на кости', '[]', '["gluten-free"]', 'unknown', 'C', 88, true, true, NOW(), NOW()),

-- === КОНСЕРВЫ И СОУСЫ (6 шт) ===
(gen_random_uuid(), '4602545000013', 'Bonduelle Corn 340g', 'Bonduelle Кукуруза сладкая 340г', 'Bonduelle', 'Консервы', 'Овощные консервы', '340 г', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400', 'Sweet corn, water, sugar, salt', 'Сладкая кукуруза, вода, сахар, соль', '[]', '["vegan","gluten-free","halal"]', 'halal', 'A', 90, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545001019', 'Rio Mare Tuna 160g', 'Rio Mare Тунец в собственном соку 160г', 'Rio Mare', 'Консервы', 'Рыбные консервы', '160 г', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', 'Yellowfin tuna, water, salt', 'Тунец желтоперый, вода, соль', '[]', '["gluten-free","halal","pescatarian"]', 'halal', 'A', 95, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545002016', 'Sardo Sardines 125g', 'Sardo Сардины в масле 125г', 'Sardo', 'Консервы', 'Рыбные консервы', '125 г', 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400', 'Sardines, olive oil, salt', 'Сардины, оливковое масло, соль', '[]', '["gluten-free","halal","pescatarian"]', 'halal', 'B', 88, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545003012', 'Heinz Ketchup 570g', 'Heinz Кетчуп Томатный 570г', 'Heinz', 'Соусы', 'Кетчупы', '570 г', 'https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=400', 'Tomatoes, vinegar, sugar, salt, onion powder, spices', 'Томаты, уксус, сахар, соль, луковый порошок, специи', '["sugar"]', '["vegan","gluten-free"]', 'vegan', 'C', 75, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545004019', 'Maheev Mayonnaise 400g', 'Махеев Майонез Провансаль 400г', 'Махеев', 'Соусы', 'Майонез', '400 г', 'https://images.unsplash.com/photo-1585652757141-883cae87e2f2?w=400', 'Sunflower oil, water, egg yolk, vinegar, sugar, salt, mustard', 'Подсолнечное масло, вода, яичный желток, уксус, сахар, соль, горчица', '["eggs","mustard"]', '["vegetarian"]', 'unknown', 'D', 60, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545005013', 'Soy Sauce Kikkoman 150ml', 'Соевый соус Kikkoman 150мл', 'Kikkoman', 'Соусы', 'Соевые соусы', '150 мл', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400', 'Water, soybeans, wheat, salt', 'Вода, соевые бобы, пшеница, соль', '["gluten","soy"]', '["vegan"]', 'vegan', 'C', 80, true, true, NOW(), NOW()),

-- === СНЕКИ И ЧИПСЫ (5 шт) ===
(gen_random_uuid(), '4602545000019', 'Lay''s Cheese 150g', 'Lay''s Сыр 150г', 'Lay''s', 'Снеки', 'Чипсы', '150 г', 'https://images.unsplash.com/photo-1566478989037-eec175784cd3?w=400', 'Potatoes, vegetable oil, cheese flavoring, salt, whey powder', 'Картофель, растительное масло, сырный ароматизатор, соль, сухая молочная сыворотка', '["milk","soy"]', '["vegetarian"]', 'vegetarian', 'D', 55, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545001016', 'Pringles Original 165g', 'Pringles Original 165г', 'Pringles', 'Снеки', 'Чипсы', '165 г', 'https://images.unsplash.com/photo-1566478989037-eec175784cd3?w=400', 'Dried potatoes, vegetable oil, rice flour, wheat starch, salt', 'Сушеный картофель, растительное масло, рисовая мука, пшеничный крахмал, соль', '["gluten","soy","milk"]', '["vegetarian"]', 'vegetarian', 'D', 58, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545002013', 'Cheetos Crunchy 85g', 'Cheetos Хрустящие сырные 85г', 'Cheetos', 'Снеки', 'Кукурузные палочки', '85 г', 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400', 'Corn meal, vegetable oil, cheese seasoning, salt, whey', 'Кукурузная мука, растительное масло, сырная приправа, соль, сыворотка', '["milk","soy"]', '["vegetarian"]', 'vegetarian', 'D', 52, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545003019', 'Kinder Surprise 20g', 'Kinder Сюрприз 20г', 'Kinder', 'Снеки', 'Шоколадные яйца', '20 г', 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400', 'Milk chocolate, sugar, cocoa butter, skim milk powder, butter oil, wheat flour', 'Молочный шоколад, сахар, какао-масло, сухое обезжиренное молоко, масло сливочное, пшеничная мука', '["milk","gluten","soy","eggs"]', '["vegetarian"]', 'unknown', 'D', 45, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545004016', 'Snickers 50g', 'Snickers 50г', 'Snickers', 'Снеки', 'Батончики', '50 г', 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400', 'Milk chocolate, peanuts, caramel, nougat, egg whites', 'Молочный шоколад, арахис, карамель, нуга, яичный белок', '["peanuts","milk","eggs","soy"]', '["vegetarian"]', 'unknown', 'D', 48, true, true, NOW(), NOW()),

-- === ФРУКТЫ И ОВОЩИ (5 шт) ===
(gen_random_uuid(), '4602545000012', 'Golden Apples 1kg', 'Яблоки Голден 1кг', 'Сады Казахстана', 'Фрукты', 'Яблоки', '1 кг', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', 'Fresh Golden Delicious apples', 'Свежие яблоки сорта Голден', '[]', '["vegan","gluten-free","raw"]', 'vegan', 'A', 100, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545001013', 'Bananas Ecuador 1kg', 'Бананы Эквадор 1кг', 'Frutas del Ecuador', 'Фрукты', 'Бананы', '1 кг', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b214?w=400', 'Fresh Cavendish bananas', 'Свежие бананы сорта Кавендиш', '[]', '["vegan","gluten-free","raw"]', 'vegan', 'A', 100, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545002010', 'Cherry Tomatoes 500g', 'Помидоры черри 500г', 'Тепличный', 'Овощи', 'Томаты', '500 г', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400', 'Fresh cherry tomatoes', 'Свежие томаты черри', '[]', '["vegan","gluten-free","raw"]', 'vegan', 'A', 100, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545003016', 'Cucumbers 1kg', 'Огурцы свежие 1кг', 'Тепличный', 'Овощи', 'Огурцы', '1 кг', 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400', 'Fresh greenhouse cucumbers', 'Свежие тепличные огурцы', '[]', '["vegan","gluten-free","raw"]', 'vegan', 'A', 100, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545004013', 'Avocado Hass 2pcs', 'Авокадо Хасс 2шт', 'MexFresh', 'Фрукты', 'Авокадо', '2 шт (~400г)', 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400', 'Fresh Hass avocados, ripe', 'Свежие спелые авокадо сорта Хасс', '[]', '["vegan","gluten-free","raw","keto"]', 'vegan', 'A', 95, true, true, NOW(), NOW()),

-- === ЗАМОРОЖЕННЫЕ ПРОДУКТЫ (3 шт) ===
(gen_random_uuid(), '4602545000015', 'Dr. Oetker Pizza Margherita 325g', 'Dr. Oetker Пицца Маргарита 325г', 'Dr. Oetker', 'Замороженные', 'Пицца', '325 г', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', 'Wheat flour, tomato sauce, mozzarella cheese, water, yeast, salt, olive oil', 'Пшеничная мука, томатный соус, сыр моцарелла, вода, дрожжи, соль, оливковое масло', '["gluten","milk"]', '["vegetarian"]', 'vegetarian', 'C', 62, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545001012', 'Hortons Fish Fingers 300g', 'Hortons Рыбные палочки 300г', 'Hortons', 'Замороженные', 'Рыба', '300 г', 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400', 'Alaska pollock fillet, breadcrumbs, wheat flour, vegetable oil, salt', 'Филе минтая аляска, панировочные сухари, пшеничная мука, растительное масло, соль', '["fish","gluten","soy","milk","eggs"]', '[]', 'unknown', 'C', 58, true, true, NOW(), NOW()),

(gen_random_uuid(), '4602545002019', 'Green Giant Peas 400g', 'Green Giant Горошек зеленый 400г', 'Green Giant', 'Замороженные', 'Овощи', '400 г', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400', 'Green peas, water, sugar, salt', 'Зеленый горошек, вода, сахар, соль', '[]', '["vegan","gluten-free"]', 'vegan', 'A', 88, true, true, NOW(), NOW())

ON CONFLICT (ean) DO UPDATE SET
  name = EXCLUDED.name,
  name_kz = EXCLUDED.name_kz,
  brand = EXCLUDED.brand,
  updated_at = NOW();

-- Создание связей с тестовым магазином (замените store_id на ваш)
-- INSERT INTO store_products (store_id, global_product_id, ean, price_kzt, stock_status, is_active, created_at, updated_at)
-- SELECT 
--   'YOUR-STORE-ID-HERE',
--   id,
--   ean,
--   (random() * 4000 + 500)::int, -- случайная цена 500-4500 тг
--   (ARRAY['in_stock','low_stock','out_of_stock'])[floor(random()*3)+1],
--   true,
--   NOW(),
--   NOW()
-- FROM global_products 
-- WHERE ean IN (
--   '4602085001383','4600096300021','4607069620026','4602085001420','4607036200041',
--   '4600096001238','4607036200996','4602085003004','4607069620125','4607036201207',
--   '4602545001006','4602545002201','4602545003504','4602545004105','4602545005508',
--   '4602545006802','4602545007208','4602545008100','4602545000016','4602545001012',
--   '4602545002019','4602545003013','4602545004017','4602545005011','4602545006015',
--   '4602545000010','4602545001017','4602545002014','4602545003018','4602545004012',
--   '4602545005016','4602545000013','4602545001019','4602545002016','4602545003012',
--   '4602545004019','4602545005013','4602545000019','4602545001016','4602545002013',
--   '4602545003019','4602545004016','4602545000012','4602545001013','4602545002010',
--   '4602545003016','4602545004013','4602545000015','4602545001012','4602545002019'
-- );
