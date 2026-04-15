-- Связать продукты store-one с магазином (цены со скриншотов)
-- Магазин: cebbe5fe-0512-4b24-96c9-3af7c948b3a4

INSERT INTO store_products (
  id, store_id, ean, global_product_id,
  price_kzt, shelf_zone, shelf_position,
  is_promoted, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'cebbe5fe-0512-4b24-96c9-3af7c948b3a4',
  ean,
  id,
  CASE
    WHEN ean = '46000000103012' THEN 180   -- Батончик Step 50г
    WHEN ean = '5000112546324' THEN 320    -- Coca-Cola 0.5л
    WHEN ean = '5000112546325' THEN 520    -- Coca-Cola 1л
    WHEN ean = '5000112546326' THEN 340    -- Coca-Cola Zero 0.5л
    WHEN ean = '48900008100309' THEN 300   -- Pepsi 0.5л
    WHEN ean = '4870200003011' THEN 220    -- Cool Cola 1л
    WHEN ean = '4870200003012' THEN 180    -- Tassay 0.5л
    WHEN ean = '4870200003013' THEN 260    -- Tassay 1л
    WHEN ean = '4870200003014' THEN 150    -- Samal 0.5л
    WHEN ean = '4870200003015' THEN 200    -- Samal 1л
    WHEN ean = '4870200003020' THEN 890    -- Рис Цесна 700г
    WHEN ean = '4870200003021' THEN 750    -- Рис Makfa 800г
    WHEN ean = '4870200003022' THEN 1750   -- Тушёнка Кублей 338г
    WHEN ean = '4600000102453' THEN 620    -- Snickers 80г
    WHEN ean = '4870200003023' THEN 1890    -- Колбаса Мама Может 400г
    WHEN ean = '4600000102452' THEN 220    -- Snickers 50г
  END,
  CASE
    WHEN ean IN ('46000000103012', '4600000102453', '4600000102452') THEN 'Сладости'
    WHEN ean IN ('5000112546324', '5000112546325', '5000112546326', '48900008100309', '4870200003011') THEN 'Напитки'
    WHEN ean IN ('4870200003012', '4870200003013', '4870200003014', '4870200003015') THEN 'Вода'
    WHEN ean IN ('4870200003020', '4870200003021') THEN 'Бакалея'
    WHEN ean = '4870200003022' THEN 'Консервы'
    WHEN ean = '4870200003023' THEN 'Мясо'
  END,
  CASE
    WHEN ean = '46000000103012' THEN 'S-01'
    WHEN ean = '5000112546324' THEN 'D-01'
    WHEN ean = '5000112546325' THEN 'D-02'
    WHEN ean = '5000112546326' THEN 'D-03'
    WHEN ean = '48900008100309' THEN 'D-04'
    WHEN ean = '4870200003011' THEN 'D-05'
    WHEN ean = '4870200003012' THEN 'W-01'
    WHEN ean = '4870200003013' THEN 'W-02'
    WHEN ean = '4870200003014' THEN 'W-03'
    WHEN ean = '4870200003015' THEN 'W-04'
    WHEN ean = '4870200003020' THEN 'G-01'
    WHEN ean = '4870200003021' THEN 'G-02'
    WHEN ean = '4870200003022' THEN 'C-01'
    WHEN ean = '4600000102453' THEN 'S-02'
    WHEN ean = '4870200003023' THEN 'M-01'
    WHEN ean = '4600000102452' THEN 'S-03'
  END,
  CASE
    WHEN ean IN ('4870200003022') THEN true
    ELSE false
  END,
  NOW(),
  NOW()
FROM global_products
WHERE ean IN (
  '46000000103012', '5000112546324', '5000112546325', '5000112546326',
  '48900008100309', '4870200003011', '4870200003012', '4870200003013',
  '4870200003014', '4870200003015', '4870200003020', '4870200003021',
  '4870200003022', '4600000102453', '4870200003023', '4600000102452'
)
ON CONFLICT (store_id, ean) DO UPDATE SET
  global_product_id = EXCLUDED.global_product_id,
  price_kzt = EXCLUDED.price_kzt,
  shelf_zone = EXCLUDED.shelf_zone,
  shelf_position = EXCLUDED.shelf_position,
  is_promoted = EXCLUDED.is_promoted,
  updated_at = NOW();
