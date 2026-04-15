-- Связать 26 продуктов с магазином (16 оригинальных + 10 новых)
-- ЗАМЕНИТЕ 'YOUR_STORE_ID_HERE' на реальный UUID магазина!

INSERT INTO store_products (
  id, store_id, ean, global_product_id,
  price_kzt, shelf_zone, shelf_position,
  is_promoted, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'YOUR_STORE_ID_HERE', -- <-- ЗАМЕНИТЕ НА ID ВАШЕГО МАГАЗИНА
  ean,
  id,
  CASE
    -- 16 оригинальных
    WHEN ean = '4602085001383' THEN 289  -- Coca-Cola
    WHEN ean = '4600096300021' THEN 399  -- Red Bull
    WHEN ean = '4607069620026' THEN 289  -- Fanta
    WHEN ean = '4602085001420' THEN 289  -- Sprite
    WHEN ean = '4602545001006' THEN 189  -- Danone Activia
    WHEN ean = '4602545002201' THEN 520  -- Parmalat Milk
    WHEN ean = '4602545005508' THEN 890  -- Valio Butter
    WHEN ean = '4602545006802' THEN 450  -- Prostokvashino Kefir
    WHEN ean = '4602545000016' THEN 180  -- Borodinsky Bread
    WHEN ean = '4602545001012' THEN 160  -- Wheat Toast
    WHEN ean = '4602545002019' THEN 150  -- Baton
    WHEN ean = '4602545003013' THEN 240  -- Krakovsky
    WHEN ean = '4602545003018' THEN 1890 -- Chicken Breast
    WHEN ean = '4602545004012' THEN 1580 -- Beef Ground
    WHEN ean = '4602545000012' THEN 590  -- Golden Apples
    WHEN ean = '4602545001013' THEN 890  -- Bananas
    -- 10 новых качественных
    WHEN ean = '4014400400007' THEN 899  -- Toffifee
    WHEN ean = '4606272039722' THEN 349  -- Maggi
    WHEN ean = '4870035000087' THEN 189  -- Базилик 3 Желания
    WHEN ean = '4870035000088' THEN 199  -- Райхан
    WHEN ean = '4607025396046' THEN 159  -- Лаваш
    WHEN ean = '4607025396053' THEN 289  -- Сыр
    WHEN ean = '4607025396060' THEN 459  -- Масло
    WHEN ean = '4600999001234' THEN 289  -- Coca-Cola (2)
    WHEN ean = '4600999001235' THEN 199  -- Snickers
    WHEN ean = '4600999001236' THEN 399  -- Red Bull (2)
  END,
  CASE
    WHEN ean IN ('4602085001383', '4607069620026', '4602085001420') THEN 'Напитки'
    WHEN ean = '4600096300021' THEN 'Напитги энергетические'
    WHEN ean IN ('4602545001006', '4602545002201', '4602545508', '4602545006802') THEN 'Молочные'
    WHEN ean IN ('4602545000016', '4602545001012', '4602545002019', '4602545003013') THEN 'Хлеб'
    WHEN ean IN ('4602545003018', '4602545004012') THEN 'Мясо'
    WHEN ean IN ('4602545000012', '4602545001013') THEN 'Фрукты и овощи'
    WHEN ean = '4014400400007' THEN 'Кондитерские'
    WHEN ean = '4606272039722' THEN 'Готовые блюда'
    WHEN ean IN ('4870035000087', '4870035000088') THEN 'Специи'
    WHEN ean = '4607025396046' THEN 'Хлеб'
    WHEN ean IN ('4607025396053', '4607025396060') THEN 'Молочные'
    WHEN ean = '4600999001234' THEN 'Напитки'
    WHEN ean = '4600999001235' THEN 'Кондитерские'
    WHEN ean = '4600999001236' THEN 'Напитки'
  END,
  CASE
    -- Напитки
    WHEN ean = '4602085001383' THEN 'E01-COLA'
    WHEN ean = '4607069620026' THEN 'E02-FANTA'
    WHEN ean = '4602085001420' THEN 'E03-SPRITE'
    WHEN ean = '4600096300021' THEN 'E04-REDBULL'
    WHEN ean = '4600999001234' THEN 'E05-COCA'
    WHEN ean = '4600999001236' THEN 'E06-REDBULL2'
    -- Молочные
    WHEN ean = '4602545001006' THEN 'D01-YOGURT'
    WHEN ean = '4602545002201' THEN 'D02-MILK'
    WHEN ean = '4602545005508' THEN 'D03-BUTTER'
    WHEN ean = '4602545006802' THEN 'D04-KEFIR'
    WHEN ean = '4607025396053' THEN 'D05-CHEESE'
    WHEN ean = '4607025396060' THEN 'D06-BUTTER2'
    -- Хлеб
    WHEN ean = '4602545000016' THEN 'A01-BORODINO'
    WHEN ean = '4602545001012' THEN 'A02-TOAST'
    WHEN ean = '4602545002019' THEN 'A03-BATON'
    WHEN ean = '4602545003013' THEN 'A04-KRAKOVSKY'
    WHEN ean = '4607025396046' THEN 'A05-LAVASH'
    -- Мясо
    WHEN ean = '4602545003018' THEN 'B01-CHICKEN'
    WHEN ean = '4602545004012' THEN 'B02-BEEF'
    -- Фрукты
    WHEN ean = '4602545000012' THEN 'C01-APPLES'
    WHEN ean = '4602545001013' THEN 'C02-BANANAS'
    -- Новые
    WHEN ean = '4014400400007' THEN 'F01-TOFFIFEE'
    WHEN ean = '4606272039722' THEN 'G01-MAGGI'
    WHEN ean = '4870035000087' THEN 'H01-BASIL1'
    WHEN ean = '4870035000088' THEN 'H02-BASIL2'
    WHEN ean = '4600999001235' THEN 'F02-SNICKERS'
  END,
  CASE
    WHEN ean IN ('4014400400007', '4606272039722') THEN true
    ELSE false
  END,
  NOW(),
  NOW()
FROM global_products
WHERE ean IN (
  -- 16 оригинальных
  '4602085001383', '4600096300021', '4607069620026', '4602085001420',
  '4602545001006', '4602545002201', '4602545005508', '4602545006802',
  '4602545000016', '4602545001012', '4602545002019', '4602545003013',
  '4602545003018', '4602545004012', '4602545000012', '4602545001013',
  -- 10 новых
  '4014400400007', '4606272039722', '4870035000087', '4870035000088',
  '4607025396046', '4607025396053', '4607025396060', '4600999001234',
  '4600999001235', '4600999001236'
)
ON CONFLICT (store_id, ean) DO UPDATE SET
  global_product_id = EXCLUDED.global_product_id,
  price_kzt = EXCLUDED.price_kzt,
  shelf_zone = EXCLUDED.shelf_zone,
  shelf_position = EXCLUDED.shelf_position,
  is_promoted = EXCLUDED.is_promoted,
  updated_at = NOW();
