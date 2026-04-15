-- 10 качественных продуктов с полными данными (КБЖУ, состав, аллергены)
-- Выполнить в Supabase SQL Editor

-- Сначала удалим старые демо-продукты если есть
DELETE FROM global_products WHERE ean IN (
  '4014400400007', '4606272039722', '4870035000087', '4607025396046', 
  '4607025396053', '4607025396060', '4600999001234', '4600999001235',
  '4600999001236', '4600999001237'
);

-- Вставка 10 качественных продуктов
INSERT INTO global_products (
  id, ean, name, name_kz, brand, category, subcategory, 
  quantity, image_url, ingredients_raw, ingredients_kz,
  allergens_json, diet_tags_json, halal_status, 
  nutriscore, data_quality_score, is_verified, is_active,
  created_at, updated_at,
  -- Дополнительные поля для КБЖУ
  energy_kj, energy_kcal, proteins_g, carbs_g, sugars_g, fat_g, saturated_fat_g, salt_g
) VALUES 

-- 1. Toffifee (шоколадные конфеты)
(gen_random_uuid(), '4014400400007', 'Toffifee Caramel Hazelnut Chocolate 125g', 'Toffifee карамельді жаңғақ шоколад 125г', 'Toffifee', 'Кондитерские изделия', 'Шоколадные конфеты', '125 г', 
'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400',
'Caramel (41%): sugar, vegetable oils (palm, shea, coconut), hazelnuts (10%), glucose syrup, humectant: sorbitol syrup, skimmed milk powder, lactose-free skimmed milk, cocoa butter, milk fat, cane sugar syrup, milk powder, emulsifier: soy lecithin, salt, flavorings. Nougat (37%): sugar, vegetable oils (palm, shea), whole roasted hazelnuts, glucose syrup, skimmed milk powder, lactose-free skimmed milk, cocoa butter, milk fat, cane sugar syrup, milk powder, emulsifier: soy lecithin, salt, flavorings. Chocolate (12%): sugar, cocoa butter, cocoa mass, skimmed milk powder, milk fat, emulsifier: soy lecithin, flavorings.',
'Карамель (41%): қант, өсімдік майлары (пальма, ши, кокос), жаңғақтар (10%), глюкоза сиропы, ылғалдандырғыш: сорбит шарабы, майсыздандырылған сүт ұнтағы, лактозасыз майсыз сүт, какао майы, сүт майы, құрақ қант сиропы, сүт ұнтағы, эмульгатор: соя лецитині, тұз, дәмдеуіштер. Нуга (37%): қант, өсімдік майлары (пальма, ши), қуырылған жаңғақтар, глюкоза сиропы, майсыздандырылған сүт ұнтағы, лактозасыз майсыз сүт, какао майы, сүт майы, құрақ қант сиропы, сүт ұнтағы, эмульгатор: соя лецитині, тұз, дәмдеуіштер. Шоколад (12%): қант, какао майы, какао массасы, майсыздандырылған сүт ұнтағы, сүт майы, эмульгатор: соя лецитині, дәмдеуіштер.',
'["milk", "hazelnuts", "soy", "lactose"]',
'["vegetarian"]',
'no',
'C', 95, true, true, NOW(), NOW(),
2177, 521, 6.0, 58.9, 48.8, 29.0, 12.7, 0.27),

-- 2. Maggi Макароны с курицей и грибами
(gen_random_uuid(), '4606272039722', 'Maggi Pasta with Chicken and Mushrooms Creamy Cheese Sauce 249g', 'Maggi Тауық пен саңырауқұлақ қосылған макарон 249г', 'Maggi', 'Быстрое приготовление', 'Смеси для приготовления', '249 г',
'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400',
'Durum wheat semolina, palm fat, wheat flour, maltodextrin, modified corn starch, salt, cheese powder (4%), yeast extract, cream powder (3%), mushroom powder (2%), chicken fat (2%), onion powder, garlic powder, spices (white pepper, nutmeg, turmeric), sugar, herbs (parsley, thyme), flavorings (contain milk, celery), acidity regulator: citric acid, iodized salt (salt, potassium iodate).',
'Дурум бидайы ұнтағы, пальма майы, бидай ұны, мальтодекстрин, модификацияланған кукуруз крахмалы, тұз, ірімшік ұнтағы (4%), ашытқы экстракты, қаймақ ұнтағы (3%), саңырауқұлақ ұнтағы (2%), тауық майы (2%), пияз ұнтағы, сарымсақ ұнтағы, дәмдеуіштер (ақ бұрыш, зер жаңғағы, куркума), қант, шөптік (жусан, шайыр), дәмдеуіштер (сүт, селдерей құрайды), қышқылдық реттегіш: лимон қышқылы, йодталған тұз (тұз, калий йодаты).',
'["gluten", "milk", "celery", "may_contain_egg"]',
'[]',
'unknown',
'D', 92, true, true, NOW(), NOW(),
1359, 325, 10.0, 52.0, 8.0, 9.0, 5.0, 2.5),

-- 3. Базилик сушеный 3 Желания
(gen_random_uuid(), '4870035000087', '3 Zhelaniya Dried Basil 15g', '3 Тілег Құрғақ Базилик 15г', '3 Zhelaniya', 'Специи и приправы', 'Сушеные травы', '15 г',
'https://images.unsplash.com/photo-1606914501449-5a9664d1d151?w=400',
'100% dried basil leaves (Ocimum basilicum). May contain traces of sesame, mustard, celery.',
'100% құрғақ базилик жапырақтары (Ocimum basilicum). Кунжут, майда, селдерей қалдықтарын қамтуы мүмкін.',
'[]',
'["vegan", "gluten-free", "halal"]',
'yes',
'A', 98, true, true, NOW(), NOW(),
132, 32, 3.2, 4.3, 0.0, 0.6, 0.1, 0.2),

-- 4. Райхан (базилик) казахстанский
(gen_random_uuid(), '4870035000088', 'Raihan Dried Basil Premium 15g', 'Райхан Премиум Құрғақ Базилик 15г', 'Raihan', 'Специи и приправы', 'Сушеные травы', '15 г',
'https://images.unsplash.com/photo-1618147868224-4786f8381190?w=400',
'100% dried basil leaves (Ocimum basilicum). Grown in Kazakhstan. Hand-picked and naturally dried.',
'100% құрғақ базилик жапырақтары (Ocimum basilicum). Қазақстанда өсірілген. Қолмен жиналған және табиғи түрде кептірілген.',
'[]',
'["vegan", "gluten-free", "halal", "local"]',
'yes',
'A', 99, true, true, NOW(), NOW(),
130, 31, 3.0, 4.0, 0.0, 0.5, 0.1, 0.1),

-- 5. Лаваш узбекский
(gen_random_uuid(), '4607025396046', 'Uzbek Lavash Traditional 300g', 'Өзбекстандық Лаваш Дәстүрлі 300г', 'Uzbek Tradition', 'Хлебобулочные изделия', 'Лаваш', '300 г',
'https://images.unsplash.com/photo-1626202378367-37427e5f7f34?w=400',
'Wheat flour, water, salt, yeast.',
'Бидай ұны, су, тұз, ашытқы.',
'["gluten"]',
'["vegan", "halal"]',
'yes',
'B', 90, true, true, NOW(), NOW(),
1060, 253, 8.0, 52.0, 2.0, 1.5, 0.3, 1.0),

-- 6. Сыр Костромской 45%
(gen_random_uuid(), '4607025396053', 'Kostromskoy Cheese 45% 200g', 'Қостромской Ірімшігі 45% 200г', 'Kostromskoy', 'Молочные продукты', 'Твердые сыры', '200 г',
'https://images.unsplash.com/photo-1606914501449-5a9664d1d151?w=400',
'Pasteurized milk, salt, starter cultures, microbial rennet.',
'Пастеризацияланған сүт, тұз, starter cultures, микробиологиялық реннет.',
'["milk", "lactose"]',
'["vegetarian", "halal"]',
'yes',
'C', 93, true, true, NOW(), NOW(),
1450, 347, 25.0, 0.0, 0.0, 27.0, 17.0, 1.5),

-- 7. Масло сливочное Вологодское 82.5%
(gen_random_uuid(), '4607025396060', 'Vologodskoe Butter 82.5% 180g', 'Вологодское Сарымай 82.5% 180г', 'Vologodskoe', 'Молочные продукты', 'Сливочное масло', '180 г',
'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
'Cream (cow milk), 82.5% fat.',
'Сүтті сливки (сиыр сүті), 82.5% майлылық.',
'["milk", "lactose"]',
'["vegetarian", "gluten-free", "halal"]',
'yes',
'D', 94, true, true, NOW(), NOW(),
3030, 725, 0.5, 0.8, 0.8, 82.5, 51.0, 0.0),

-- 8. Кока-Кола 0.5л
(gen_random_uuid(), '4600999001234', 'Coca-Cola 0.5L', 'Coca-Cola 0.5л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '500 мл',
'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
'Carbonated water, sugar, caramel color (E150d), phosphoric acid, natural flavorings, caffeine.',
'Газдалған су, қант, карамель бояғышы (E150d), фосфор қышқылы, табиғи дәмдеуіштер, кофеин.',
'[]',
'["vegan", "gluten-free", "halal"]',
'yes',
'E', 95, true, true, NOW(), NOW(),
180, 43, 0.0, 10.6, 10.6, 0.0, 0.0, 0.0),

-- 9. Сникерс 50г
(gen_random_uuid(), '4600999001235', 'Snickers Chocolate Bar 50g', 'Snickers Шоколад Батончигі 50г', 'Snickers', 'Кондитерские изделия', 'Шоколадные батончики', '50 г',
'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400',
'Milk chocolate (sugar, cocoa butter, cocoa mass, skimmed milk powder, milk fat, lactose, whey powder, milk fat, emulsifier: soy lecithin, natural vanilla extract), peanuts, glucose syrup, sugar, skimmed milk powder, palm fat, lactose, sunflower oil, salt, egg white powder, natural vanilla extract, hydrolyzed milk protein.',
'Сүтті шоколад (қант, какао майы, какао массасы, майсыз сүт ұнтағы, сүт майы, лактоза, сұлық ұнтағы, сүт майы, эмульгатор: соя лецитині, табиғи ваниль экстракты), жаңғақтар, глюкоза сиропы, қант, майсыз сүт ұнтағы, пальма майы, лактоза, күнбағыс майы, тұз, жұмыртқа ақуызы, табиғи ваниль экстракты, гидролизденген сүт ақуызы.',
'["milk", "peanuts", "soy", "egg", "lactose"]',
'["vegetarian"]',
'unknown',
'D', 96, true, true, NOW(), NOW(),
2028, 485, 9.0, 56.0, 50.0, 25.0, 12.0, 0.5),

-- 10. Ред Булл 250мл
(gen_random_uuid(), '4600999001236', 'Red Bull Energy Drink 250ml', 'Red Bull Энергетикалық Сусын 250мл', 'Red Bull', 'Напитки', 'Энергетики', '250 мл',
'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400',
'Water, sucrose, glucose, citric acid, carbon dioxide, taurine (0.4%), sodium bicarbonate, caffeine (0.03%), niacinamide, pantothenic acid, vitamin B6, vitamin B12, artificial flavorings, colors: caramel (E150d), riboflavin (E101).',
'Су, сахароза, глюкоза, лимон қышқылы, көміртек диоксиді, таурин (0.4%), натрий бикарбонаты, кофеин (0.03%), ниацинамид, пантотен қышқылы, В6 витамині, В12 витамині, жасанды дәмдеуіштер, бояғыштар: карамель (E150d), рибофлавин (E101).',
'[]',
'["vegan", "gluten-free", "halal"]',
'yes',
'D', 95, true, true, NOW(), NOW(),
174, 42, 0.0, 10.0, 10.0, 0.0, 0.0, 0.1)

ON CONFLICT (ean) DO UPDATE SET
  name = EXCLUDED.name,
  name_kz = EXCLUDED.name_kz,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  quantity = EXCLUDED.quantity,
  image_url = EXCLUDED.image_url,
  ingredients_raw = EXCLUDED.ingredients_raw,
  ingredients_kz = EXCLUDED.ingredients_kz,
  allergens_json = EXCLUDED.allergens_json,
  diet_tags_json = EXCLUDED.diet_tags_json,
  halal_status = EXCLUDED.halal_status,
  nutriscore = EXCLUDED.nutriscore,
  data_quality_score = EXCLUDED.data_quality_score,
  updated_at = NOW(),
  energy_kj = EXCLUDED.energy_kj,
  energy_kcal = EXCLUDED.energy_kcal,
  proteins_g = EXCLUDED.proteins_g,
  carbs_g = EXCLUDED.carbs_g,
  sugars_g = EXCLUDED.sugars_g,
  fat_g = EXCLUDED.fat_g,
  saturated_fat_g = EXCLUDED.saturated_fat_g,
  salt_g = EXCLUDED.salt_g;
