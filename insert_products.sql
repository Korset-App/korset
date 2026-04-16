
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4008400404127', 'Шоколад молочный Alpen Gold 85г', 'grocery', 'chocolate', 'unknown',
      60, '["milk","soy"]'::jsonb, '["contains_sugar","contains_dairy"]'::jsonb,
      '{"sugars_100g":58,"proteins_100g":5.3}'::jsonb, 'сахар, какао тертое, масло какао, сыворотка сухая молочная, молоко сухое цельное, жир молочный, эмульгаторы (лецитин соевый, Е476), ароматизатор. Может содержать следы арахиса, других орехов и пшеницы.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4008400404127', 2157, 'in_stock'
    FROM public.global_products WHERE ean = '4008400404127'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4600680010360', 'Печенье Юбилейное Традиционное 112г', 'grocery', 'cookies', 'unknown',
      55, '["gluten","eggs"]'::jsonb, '["contains_sugar","contains_gluten"]'::jsonb,
      '{"sugars_100g":22,"proteins_100g":7.5}'::jsonb, 'мука пшеничная, сахар, масло растительное, вода питьевая, крахмал кукурузный, меланж яичный, сироп инвертный (сахар, вода, регулятор кислотности (кислота лимонная)), разрыхлители, соль. Может содержать следы кунжута и молока.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4600680010360', 1914, 'in_stock'
    FROM public.global_products WHERE ean = '4600680010360'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4600000102452', 'Батончик Snickers 50г', 'grocery', 'chocolate_bar', 'no',
      40, '["peanuts","milk","eggs","soy"]'::jsonb, '["contains_sugar","contains_dairy"]'::jsonb,
      '{"sugars_100g":49.5,"proteins_100g":8.6}'::jsonb, 'молочный шоколад (сахар, масло какао, какао тертое, лактоза, сухое цельное молоко, сухая молочная сыворотка, молочный жир, эмульгатор (соевый лецитин), ароматизатор (ванилин)), карамель, арахис, нуга (сахар, глюкозный сироп, пальмовое масло, соль, сухой яичный белок). Может содержать незначительное количество фундука, миндаля, кешью.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4600000102452', 1345, 'in_stock'
    FROM public.global_products WHERE ean = '4600000102452'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '5000112546326', 'Напиток Coca-Cola Zero 0.5л', 'grocery', 'cola_zero', 'yes',
      68, '[]'::jsonb, '["sugar_free","vegan"]'::jsonb,
      '{"sugars_100g":0,"proteins_100g":0}'::jsonb, 'вода очищенная, краситель сахарный колер IV (E150d), регуляторы кислотности (ортофосфорная кислота, цитраты натрия), подсластители (натриевая соль цикламовой кислоты, ацесульфам калия, аспартам), натуральные ароматизаторы, кофеин. Содержит источник фенилаланина.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '5000112546326', 2242, 'in_stock'
    FROM public.global_products WHERE ean = '5000112546326'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4005800431326', 'Сок Яблочный Добрый 1л', 'grocery', 'juice', 'yes',
      80, '[]'::jsonb, '["contains_sugar","vegan"]'::jsonb,
      '{"sugars_100g":11,"proteins_100g":0.5}'::jsonb, 'яблочный сок. Изготовлен из концентрированного сока. Содержит сахара природного (естественного) происхождения.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4005800431326', 676, 'in_stock'
    FROM public.global_products WHERE ean = '4005800431326'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4810200003011', 'Крабовые палочки Vici 200г', 'grocery', 'seafood', 'no',
      50, '["fish","eggs","gluten","crustaceans"]'::jsonb, '["contains_gluten"]'::jsonb,
      '{"sugars_100g":3.5,"proteins_100g":6}'::jsonb, 'фарш рыбный сурими, вода, крахмал пшеничный, масло растительное, белок яичный, соль, сахар, экстракт краба (содержит ракообразных), красители (кармины, экстракт паприки).'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4810200003011', 1654, 'in_stock'
    FROM public.global_products WHERE ean = '4810200003011'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '8005800431350', 'Майонез Провансаль 67%', 'grocery', 'sauce', 'unknown',
      40, '["eggs","mustard"]'::jsonb, '[]'::jsonb,
      '{"sugars_100g":2.5,"proteins_100g":0.5}'::jsonb, 'масло подсолнечное рафинированное дезодорированное, вода, яичный желток, сахар, уксус столовый, соль, горчичное масло.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '8005800431350', 2425, 'in_stock'
    FROM public.global_products WHERE ean = '8005800431350'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001001', 'Хлебцы Dr.Korner Гречневые', 'grocery', 'bread', 'yes',
      90, '[]'::jsonb, '["vegan","sugar_free","gluten_free"]'::jsonb,
      '{"sugars_100g":1,"proteins_100g":10}'::jsonb, 'крупа гречневая ядрица, витаминно-минеральный комплекс.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001001', 2276, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001001'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001002', 'Овсяной напиток Ne Moloko Klasik 1л', 'grocery', 'plant_milk', 'yes',
      85, '["gluten"]'::jsonb, '["vegan","dairy_free"]'::jsonb,
      '{"sugars_100g":6.5,"proteins_100g":1}'::jsonb, 'вода, овсяная мука, рапсовое масло, карбонат кальция, соль, витамин В2.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001002', 944, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001002'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001003', 'Пиво Балтика 0 Безалкогольное 0.45л', 'grocery', 'beer', 'no',
      50, '["gluten"]'::jsonb, '["contains_gluten"]'::jsonb,
      '{"sugars_100g":3.5,"proteins_100g":0.5}'::jsonb, 'вода питьевая очищенная, солод ячменный светлый, солодовый экстракт, хмелепродукты.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001003', 1874, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001003'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001004', 'Тунец кусочками консервированный', 'grocery', 'canned_food', 'yes',
      88, '["fish"]'::jsonb, '["sugar_free","dairy_free","gluten_free"]'::jsonb,
      '{"sugars_100g":0,"proteins_100g":24}'::jsonb, 'тунец (филе кусочками), вода питьевая, соль.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001004', 2471, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001004'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001005', 'Мороженое Пломбир ванильный', 'grocery', 'ice_cream', 'unknown',
      65, '["milk"]'::jsonb, '["contains_dairy","contains_sugar"]'::jsonb,
      '{"sugars_100g":15,"proteins_100g":3.5}'::jsonb, 'сливки, молоко коровье цельное, сахар, сгущенное молоко, вода, стабилизатор-эмульгатор, ароматизатор ванилин.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001005', 1174, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001005'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001006', 'Вино красное сухое 0.75л', 'grocery', 'wine', 'no',
      50, '["sulfites"]'::jsonb, '[]'::jsonb,
      '{"sugars_100g":0.2,"proteins_100g":0}'::jsonb, 'виноград сортов Каберне Совиньон, пищевая добавка диоксид серы (консервант).'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001006', 1208, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001006'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001007', 'Соус Терияки', 'grocery', 'sauce', 'unknown',
      60, '["soy","gluten","sesame"]'::jsonb, '["contains_sugar"]'::jsonb,
      '{"sugars_100g":30,"proteins_100g":4.5}'::jsonb, 'вода, соевый соус (вода, соевые бобы, пшеница, соль), сахар, уксус, имбирь, кунжутное семя, чеснок, загуститель (крахмал кукурузный).'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001007', 1323, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001007'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001008', 'Колбаса Докторская ГОСТ', 'grocery', 'sausage', 'no',
      65, '["milk"]'::jsonb, '["contains_dairy"]'::jsonb,
      '{"sugars_100g":0.5,"proteins_100g":12}'::jsonb, 'свинина, говядина, вода, яйца куриные или меланж яичный, молоко сухое коровье цельное, соль, пряности (мускатный орех), фиксатор окраски (нитрит натрия). Может содержать следы горчицы, сельдерея.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001008', 1969, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001008'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001009', 'Смесь ореховая коктейльная 150г', 'grocery', 'snacks', 'yes',
      85, '["tree_nuts","peanuts"]'::jsonb, '["vegan","sugar_free"]'::jsonb,
      '{"sugars_100g":4.5,"proteins_100g":22}'::jsonb, 'ядра кешью жареные, ядра миндаля жареные, арахис жареный, ядра фундука. Может содержать частицы арахиса и других орехов.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001009', 1439, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001009'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001010', 'Коктейль из морепродуктов в масле', 'grocery', 'seafood', 'unknown',
      70, '["mollusks","crustaceans"]'::jsonb, '["sugar_free","gluten_free"]'::jsonb,
      '{"sugars_100g":0,"proteins_100g":14}'::jsonb, 'отварные морепродукты (кальмар соломка, мидии мясо, креветки очищенные), масло подсолнечное рафинированное, соль, регуляторы кислотности.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001010', 2282, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001010'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001011', 'Пюре ФрутоНяня Яблоко 90г', 'grocery', 'baby_food', 'yes',
      95, '[]'::jsonb, '["vegan","gluten_free","dairy_free"]'::jsonb,
      '{"sugars_100g":9,"proteins_100g":0.3}'::jsonb, 'пюре из яблок.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001011', 2335, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001011'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001012', 'Сыр Гауда 45%', 'grocery', 'cheese', 'unknown',
      75, '["milk"]'::jsonb, '["contains_dairy","sugar_free"]'::jsonb,
      '{"sugars_100g":0.1,"proteins_100g":25}'::jsonb, 'молоко нормализованное пастеризованное, бактериальная закваска мезофильных молочнокислых микроорганизмов, молокосвертывающий ферментный препарат животного происхождения, соль поваренная пищевая.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001012', 1786, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001012'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '4607000001013', 'Котлеты куриные (полуфабрикат)', 'grocery', 'meat', 'yes',
      65, '["gluten","eggs"]'::jsonb, '["contains_gluten"]'::jsonb,
      '{"sugars_100g":0.5,"proteins_100g":14}'::jsonb, 'мясо кур, вода питьевая, сухари панировочиые (мука пшеничная хлебопекарная, вода, соль, дрожжи хлебопекарные), клетчатка пшеничная, меланж яичный сухой, соль, черный перец.'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '4607000001013', 2476, 'in_stock'
    FROM public.global_products WHERE ean = '4607000001013'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  