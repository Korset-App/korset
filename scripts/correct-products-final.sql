-- ПРАВИЛЬНОЕ СООТВЕТСТВИЕ: фото → продукт → EAN → цена
-- Магазин: cebbe5fe-0512-4b24-96c9-3af7c948b3a4

-- 1. Очистка
DELETE FROM store_products WHERE store_id = 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4';
DELETE FROM global_products WHERE ean IN (
  '4600000102452','4600000102453','46000000103012',
  '5000112546324','5000112546325','5000112546326',
  '48900008100309','48900008100310',
  '4870200003012','4870200003013','4870200003014','4870200003015',
  '4870200003020','4870200003021','4870200003022',
  '4870200003011','4870200003023',
  '6900000000010','6900000000011','6900000000012','6900000000014',
  '4800000000013','4800000000014','4800000000015'
);

-- 2. Вставка продуктов (фото точно совпадают)
INSERT INTO global_products (
  id, ean, name, name_kz, brand, category, subcategory,
  quantity, image_url, ingredients_raw, ingredients_kz,
  nutriments_json, allergens_json, diet_tags_json, halal_status,
  nutriscore, data_quality_score, specs_json, is_verified, is_active,
  created_at, updated_at
) VALUES

-- 1.png = Snickers 50г (220₸)
(gen_random_uuid(), '4600000102452', 'Snickers 50г', 'Snickers 50г', 'Mars', 'Кондитерские', 'Батончики', '50 г',
'/products/1.png',
'Молочный шоколад (сахар, какао-масло, какао тёртое, цельное сухое молоко, эмульгатор соевый лецитин), арахис, карамель (кукурузный сироп, сахар, пальмовое масло, молоко сгущённое, масло сливочное), нуга (сахар, белок яичный), соль',
'Сүтті шоколад (қант, какао майы, какао, бүтін сүт ұнтағы, эмульгатор соя лецитині), жержаңғақ, карамель, нуга (қант, жұмыртқа ақ), тұз',
'{"energy_kj": 2100, "energy_kcal": 500, "protein": 9.0, "fat": 26.0, "saturated_fat": 11.0, "carbs": 55.0, "sugar": 50.0, "salt": 0.4}',
'["milk","peanuts","eggs","soy"]', '["contains_sugar"]', 'unknown',
'D', 65, NULL, true, true, NOW(), NOW()),

-- 2.png = Батончик СТЕП 50г (180₸)
(gen_random_uuid(), '46000000103012', 'Батончик Step 50г', 'Step батончигі 50г', 'Конфил', 'Кондитерские', 'Батончики', '50 г',
'/products/2.png',
'Шоколадная глазурь (сахар, какао-масло, сухое молоко, эмульгатор соевый лецитин), арахис жареный 25%, карамель (сахар, патока, молоко сгущённое, масло сливочное, соль), вафля (пшеничная мука, сахар, масло растительное)',
'Шоколад глазурі, күйдірілген жержаңғақ 25%, карамель, вафля (бидай ұны, қант, өсімдік майы)',
'{"energy_kj": 2050, "energy_kcal": 490, "protein": 8.5, "fat": 24.0, "saturated_fat": 10.0, "carbs": 60.0, "sugar": 52.0, "salt": 0.35}',
'["milk","peanuts","gluten","soy"]', '["contains_sugar"]', 'unknown',
'D', 60, NULL, true, true, NOW(), NOW()),

-- 3.png = Coca-Cola 0.5л (320₸)
(gen_random_uuid(), '5000112546324', 'Coca-Cola 0.5л', 'Coca-Cola 0.5л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '500 мл',
'/products/3.png',
'Вода газированная, сахар, краситель карамельный E150d, регулятор кислотности фосфорная кислота, натуральные ароматизаторы, кофеин',
'Газдалған су, қант, карамель бояғышы E150d, фосфор қышқылы, табиғи дәмдеуіштер, кофеин',
'{"energy_kj": 180, "energy_kcal": 42, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 10.6, "sugar": 10.6, "salt": 0.0}',
'[]', '["contains_sugar"]', 'unknown',
'E', 60, NULL, true, true, NOW(), NOW()),

-- 3_1.png = Coca-Cola 1л (520₸)
(gen_random_uuid(), '5000112546325', 'Coca-Cola 1л', 'Coca-Cola 1л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '1 л',
'/products/3_1.png',
'Вода газированная, сахар, краситель карамельный E150d, регулятор кислотности фосфорная кислота, натуральные ароматизаторы, кофеин',
'Газдалған су, қант, карамель бояғышы E150d, фосфор қышқылы, табиғи дәмдеуіштер, кофеин',
'{"energy_kj": 180, "energy_kcal": 42, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 10.6, "sugar": 10.6, "salt": 0.0}',
'[]', '["contains_sugar"]', 'unknown',
'E', 60, NULL, true, true, NOW(), NOW()),

-- 3_2.png = Coca-Cola Zero 0.5л (340₸)
(gen_random_uuid(), '5000112546326', 'Coca-Cola Zero 0.5л', 'Coca-Cola Zero 0.5л', 'Coca-Cola', 'Напитки', 'Газированные напитки', '500 мл',
'/products/3_2.png',
'Вода газированная, краситель карамельный E150d, регуляторы кислотности (фосфорная кислота, лимонная кислота), подсластители (аспартам, ацесульфам К), натуральные ароматизаторы, кофеин',
'Газдалған су, карамель бояғышы E150d, қышқылдық реттеуіштер (фосфор қышқылы, лимон қышқылы), тәттendirгіштер (аспартам, ацесульфам К), кофеин',
'{"energy_kj": 1, "energy_kcal": 0.3, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 0.0, "sugar": 0.0, "salt": 0.02}',
'[]', '["no_sugar"]', 'unknown',
'B', 70, NULL, true, true, NOW(), NOW()),

-- 4.png = Pepsi 0.5л (300₸)
(gen_random_uuid(), '48900008100309', 'Pepsi 0.5л', 'Pepsi 0.5л', 'PepsiCo', 'Напитки', 'Газированные напитки', '500 мл',
'/products/4.png',
'Вода газированная, сахар, краситель карамельный E150d, регуляторы кислотности (фосфорная кислота, лимонная кислота), кофеин, натуральные ароматизаторы',
'Газдалған су, қант, карамель бояғышы E150d, қышқылдық реттеуіштер (фосфор қышқылы, лимон қышқылы), кофеин, табиғи дәмдеуіштер',
'{"energy_kj": 173, "energy_kcal": 41, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 11.0, "sugar": 11.0, "salt": 0.0}',
'[]', '["contains_sugar"]', 'unknown',
'E', 60, NULL, true, true, NOW(), NOW()),

-- 5.png = Tassay 0.5л (180₸)
(gen_random_uuid(), '4870200003012', 'Tassay 0.5л', 'Tassay 0.5л', 'Tassay', 'Напитки', 'Вода', '500 мл',
'/products/5.png',
'Природная питьевая негазированная вода. Минерализация 0.2-0.5 г/л.',
'Табиғи ауыз суы газсыз. Минерализация 0.2-0.5 г/л.',
'{"energy_kj": 0, "energy_kcal": 0, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 0.0, "sugar": 0.0, "salt": 0.02}',
'[]', '["vegan","gluten-free","halal","no_sugar"]', 'yes',
'A', 95, NULL, true, true, NOW(), NOW()),

-- 5_1.png = Tassay 1л (260₸)
(gen_random_uuid(), '4870200003013', 'Tassay 1л', 'Tassay 1л', 'Tassay', 'Напитки', 'Вода', '1 л',
'/products/5_1.png',
'Природная питьевая негазированная вода. Минерализация 0.2-0.5 г/л.',
'Табиғи ауыз суы газсыз. Минерализация 0.2-0.5 г/л.',
'{"energy_kj": 0, "energy_kcal": 0, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 0.0, "sugar": 0.0, "salt": 0.02}',
'[]', '["vegan","gluten-free","halal","no_sugar"]', 'yes',
'A', 95, NULL, true, true, NOW(), NOW()),

-- 6.png = Samal 0.5л (150₸)
(gen_random_uuid(), '4870200003014', 'Samal 0.5л', 'Samal 0.5л', 'Samal', 'Напитки', 'Вода', '500 мл',
'/products/6.png',
'Природная питьевая негазированная вода. Минерализация 0.3-0.6 г/л.',
'Табиғи ауыз суы газсыз. Минерализация 0.3-0.6 г/л.',
'{"energy_kj": 0, "energy_kcal": 0, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 0.0, "sugar": 0.0, "salt": 0.03}',
'[]', '["vegan","gluten-free","halal","no_sugar"]', 'yes',
'A', 90, NULL, true, true, NOW(), NOW()),

-- 6_1.png = Samal 1л (200₸)
(gen_random_uuid(), '4870200003015', 'Samal 1л', 'Samal 1л', 'Samal', 'Напитки', 'Вода', '1 л',
'/products/6_1.png',
'Природная питьевая негазированная вода. Минерализация 0.3-0.6 г/л.',
'Табиғи ауыз суы газсыз. Минерализация 0.3-0.6 г/л.',
'{"energy_kj": 0, "energy_kcal": 0, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 0.0, "sugar": 0.0, "salt": 0.03}',
'[]', '["vegan","gluten-free","halal","no_sugar"]', 'yes',
'A', 90, NULL, true, true, NOW(), NOW()),

-- 7.png = Рис Цесна 700г (890₸)
(gen_random_uuid(), '4870200003020', 'Рис Цесна 700г', 'Цесна күріші 700г', 'Цесна', 'Бакалея', 'Крупы', '700 г',
'/products/7.png',
'Рис длиннозерный шлифованный. Без ГМО. Без консервантов.',
'Ұзын дәнді күріш жылтыратылған. ГМО жоқ. Консервант жоқ.',
'{"energy_kj": 1520, "energy_kcal": 365, "protein": 7.0, "fat": 0.7, "saturated_fat": 0.2, "carbs": 80.0, "sugar": 0.1, "salt": 0.0}',
'[]', '["vegan","gluten-free","halal"]', 'yes',
'A', 90, NULL, true, true, NOW(), NOW()),

-- 7_1.png = Рис Makfa 800г (750₸)
(gen_random_uuid(), '4870200003021', 'Рис Makfa 800г', 'Makfa күріші 800г', 'Makfa', 'Бакалея', 'Крупы', '800 г',
'/products/7_1.png',
'Рис пропаренный длиннозерный. Обработан паром для сохранения витаминов.',
'Бу өңделген ұзын дәнді күріш. Витаминдерді сақтау үшін бумен өңделген.',
'{"energy_kj": 1510, "energy_kcal": 360, "protein": 7.5, "fat": 1.0, "saturated_fat": 0.3, "carbs": 78.0, "sugar": 0.2, "salt": 0.0}',
'[]', '["vegan","gluten-free","halal"]', 'yes',
'A', 88, NULL, true, true, NOW(), NOW()),

-- 8.png = Тушёнка Кублей говядина 338г (1750₸)
(gen_random_uuid(), '4870200003022', 'Тушёнка Кублей говядина 338г', 'Кублей сиыр еті тушонкасы 338г', 'Kublei', 'Консервы', 'Мясные консервы', '338 г',
'/products/8.png',
'Говядина 95%, вода, соль поваренная, лавровый лист, перец чёрный молотый. ГОСТ 32125-2013. Халяль.',
'Сиыр еті 95%, су, ас тұзы, дафин жапырағы, үгітілген қара бұрыш. Халал.',
'{"energy_kj": 950, "energy_kcal": 230, "protein": 18.0, "fat": 16.0, "saturated_fat": 6.0, "carbs": 0.0, "sugar": 0.0, "salt": 1.5}',
'[]', '["halal","high-protein","gluten-free"]', 'yes',
'B', 90, NULL, true, true, NOW(), NOW()),

-- 11.png = Cool Cola 1л (220₸)
(gen_random_uuid(), '4870200003011', 'Cool Cola 1л', 'Cool Cola 1л', 'Wimm-Bill-Dann', 'Напитки', 'Газированные напитки', '1 л',
'/products/11.png',
'Вода газированная, сахар, краситель карамельный E150d, регулятор кислотности лимонная кислота, натуральные ароматизаторы',
'Газдалған су, қант, карамель бояғышы E150d, лимон қышқылы, табиғи дәмдеуіштер',
'{"energy_kj": 165, "energy_kcal": 39, "protein": 0.0, "fat": 0.0, "saturated_fat": 0.0, "carbs": 10.0, "sugar": 10.0, "salt": 0.0}',
'[]', '["contains_sugar"]', 'unknown',
'D', 55, NULL, true, true, NOW(), NOW()),

-- 12.png = Колбаса Папа Может Экстра 400г (1890₸)
(gen_random_uuid(), '4870200003023', 'Колбаса Папа Может Экстра 400г', 'Папа Может Экстра шұжықы 400г', 'Мясокомбинат', 'Мясо', 'Колбасы варёные', '400 г',
'/products/12.png',
'Мясо говядина, мясо птицы, вода, крахмал, соль, соевый белок, специи (перец, кориандр), чеснок, нитрит натрия. БЕЗ СВИНИНЫ.',
'Сиыр еті, құс еті, су, крахмал, тұз, соя ақуызы, дәмдеуіштер (бұрыш, кориандр), сарымсақ, нитрит натрий. ШОШҚАСЫЗ.',
'{"energy_kj": 800, "energy_kcal": 190, "protein": 13.0, "fat": 13.0, "saturated_fat": 5.0, "carbs": 3.0, "sugar": 0.5, "salt": 2.0}',
'["soy"]', '[]', 'unknown',
'C', 65, NULL, true, true, NOW(), NOW()),

-- 9.png = Кабель USB-C 60W 2м (2900₸)
(gen_random_uuid(), '6900000000010', 'Кабель USB-C → USB-C 60W 2м', 'USB-C кабелі 60W 2м', 'TechPro', 'Электроника', 'Кабели', '2 м',
'/products/9.png',
'Кабель Power Delivery 60W, разъёмы USB-C, передача данных, длина 2 метра',
'Power Delivery 60W кабелі, USB-C коннекторлар, деректер тасымалдау, ұзындығы 2 метр',
NULL, '[]', '[]', 'unknown',
NULL, 90, '{"connectorA": "USB-C", "connectorB": "USB-C", "powerW": 60, "length_m": 2}', true, true, NOW(), NOW()),

-- 10.png = Зарядное Xiaomi 33W (6900₸)
(gen_random_uuid(), '6900000000012', 'Зарядное устройство Xiaomi 33W USB-C', 'Xiaomi 33W USB-C зарядтағыш', 'Xiaomi', 'Электроника', 'Зарядные устройства', '1 шт',
'/products/10.png',
'Nano Power Adapter, USB-C, 33W, Xiaomi. Совместим со смартфонами и ноутбуками.',
'Nano Power Adapter, USB-C, 33W, Xiaomi. Смартфондармен және ноутбуктармен үйлесімді.',
NULL, '[]', '[]', 'unknown',
NULL, 90, '{"port": "USB-C", "powerW": 33, "brand": "Xiaomi", "model": "Nano Power Adapter", "pd": true}', true, true, NOW(), NOW()),

-- 13.png = Кабель Type-C 18W 1м бюджет (900₸)
(gen_random_uuid(), '6900000000011', 'Кабель USB-A → Type-C 18W 1м', 'USB-A → Type-C кабелі 18W 1м', 'BY Original', 'Электроника', 'Кабели', '1 м',
'/products/13.png',
'Нейлоновая оплётка, коннекторы USB-A и Type-C, зарядка 18W, передача данных',
'Нейлон қаптама, USB-A және Type-C коннекторлар, 18W зарядтау, деректер тасымалдау',
NULL, '[]', '[]', 'unknown',
NULL, 70, '{"connectorA": "USB-A", "connectorB": "Type-C", "powerW": 18, "length_m": 1, "material": "нейлон"}', true, true, NOW(), NOW()),

-- 14.png = Наушники Breaking E19 Jack 3.5mm (отсутствуют в products.json — добавляем)
(gen_random_uuid(), '6900000000014', 'Наушники Breaking E19 Jack 3.5mm', 'Breaking E19 наушниктер 3.5mm', 'Breaking', 'Электроника', 'Наушники', '1 шт',
'/products/14.png',
'Проводные наушники с микрофоном, разъём Jack 3.5mm, совместимы iOS и Android',
'Микрофонды сымды наушниктер, Jack 3.5mm, iOS және Android үйлесімді',
NULL, '[]', '[]', 'unknown',
NULL, 80, '{"connector": "Jack 3.5mm", "microphone": true, "compatibility": ["iOS", "Android"], "model": "E19"}', true, true, NOW(), NOW()),

-- 15.png = Краска Düfa Keramika 3л (7800₸)
(gen_random_uuid(), '4800000000013', 'Краска Düfa Europlast Keramika 3л', 'Düfa Keramika бояуы 3л', 'Düfa', 'Строительство', 'Краски', '3 л',
'/products/15.png',
'Акриловая краска на водной основе, керамическая технология, моющаяся, для гостиных и спален, укрывистость до 12 м²/л',
'Сулы акрил бояу, керамикалық технология, жуылатын, қонақ бөлме мен жатын бөлмеге, жабу дейін 12 м²/л',
NULL, '[]', '["eco"]', 'unknown',
NULL, 95, '{"coverageM2": 12, "voc": "low", "finish": "глубокоматовый", "washable": true, "technology": "Keramik", "brand_origin": "Germany"}', true, true, NOW(), NOW()),

-- 16.png = Краска Sniezka Eko 3л (4200₸)
(gen_random_uuid(), '4800000000014', 'Краска Sniezka Eko 3л', 'Sniezka Eko бояуы 3л', 'Sniezka', 'Строительство', 'Краски', '3 л',
'/products/16.png',
'Акриловая эмульсия гипоаллергенная, для стен и потолков, снежно белая, без запаха',
'Гипоаллергендік акрил эмульсия, қабырға мен төбеге арналған, қар ақ, иіссіз',
NULL, '[]', '["eco","hypoallergenic"]', 'unknown',
NULL, 80, '{"coverageM2": 10, "voc": "low", "finish": "матовый", "washable": false, "color": "белый"}', true, true, NOW(), NOW()),

-- 17.png = Клей Ceresit CM16 Flex 25кг (3500₸)
(gen_random_uuid(), '4800000000015', 'Клей Ceresit CM 16 Flex 25кг', 'Ceresit CM 16 Flex желімі 25кг', 'Ceresit', 'Строительство', 'Клеи', '25 кг',
'/products/17.png',
'Эластичный цементный клей для любых видов плитки, для внутренних и наружных работ, балконов, террас',
'Кез келген плитка түріне арналған эластикалық цемент желімі, ішкі және сыртқы жұмыстарға, балкон, терраса',
NULL, '[]', '[]', 'unknown',
NULL, 95, '{"bagKg": 25, "coverageM2PerBag": 6, "for": ["tile", "porcelain", "mosaic"], "elastic": true, "outdoor": true, "model": "CM 16"}', true, true, NOW(), NOW());
