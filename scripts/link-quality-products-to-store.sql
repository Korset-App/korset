-- Связать 10 качественных продуктов с магазином (выполнить после добавления в global_products)
-- Заменить store_id на ID вашего магазина

INSERT INTO store_products (
  id, store_id, ean, global_product_id,
  price_kzt, shelf_zone, shelf_position,
  is_promoted, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'YOUR_STORE_ID_HERE', -- <-- ЗАМЕНИТЕ НА ID ВАШЕГО МАГАЗИНА
  ean,
  id, -- global_product_id из global_products
  CASE
    WHEN ean = '4014400400007' THEN 899  -- Toffifee
    WHEN ean = '4606272039722' THEN 349  -- Maggi
    WHEN ean = '4870035000087' THEN 189  -- Базилик
    WHEN ean = '4870035000088' THEN 199  -- Райхан
    WHEN ean = '4607025396046' THEN 159  -- Лаваш
    WHEN ean = '4607025396053' THEN 289  -- Сыр
    WHEN ean = '4607025396060' THEN 459  -- Масло
    WHEN ean = '4600999001234' THEN 289  -- Coca-Cola
    WHEN ean = '4600999001235' THEN 199  -- Snickers
    WHEN ean = '4600999001236' THEN 399  -- Red Bull
  END,
  CASE
    WHEN ean = '4014400400007' THEN 'Сладости'
    WHEN ean = '4606272039722' THEN 'Готовые блюда'
    WHEN ean = '4870035000087' THEN 'Специи'
    WHEN ean = '4607025396046' THEN 'Хлеб'
    WHEN ean = '4607025396053' THEN 'Молочные'
    WHEN ean = '4607025396060' THEN 'Молочные'
    WHEN ean = '4600999001234' THEN 'Напитки'
    WHEN ean = '4600999001235' THEN 'Сладости'
    WHEN ean = '4600999001236' THEN 'Напитки'
  END,
  CASE
    WHEN ean = '4014400400007' THEN 'A12'
    WHEN ean = '4606272039722' THEN 'B05'
    WHEN ean = '4870035000087' THEN 'C03-SPICES'
    WHEN ean = '4870035000088' THEN 'C03-SPICES'
    WHEN ean = '4607025396046' THEN 'A05-BREAD'
    WHEN ean = '4607025396053' THEN 'D02'
    WHEN ean = '4607025396060' THEN 'D01'
    WHEN ean = '4600999001234' THEN 'E01'
    WHEN ean = '4600999001235' THEN 'A13'
    WHEN ean = '4600999001236' THEN 'E02'
  END,
  CASE
    WHEN ean IN ('4014400400007', '4606272039722') THEN true
    ELSE false
  END,
  NOW(),
  NOW()
FROM global_products
WHERE ean IN (
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
