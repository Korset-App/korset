-- Связать 15 оригинальных продуктов с магазином
-- Цены из products.json, полки из products.json
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
    WHEN ean = '4820000000001' THEN 450   -- Йогурт клубничный
    WHEN ean = '4820000000002' THEN 690   -- Йогурт кокосовый
    WHEN ean = '4820000000003' THEN 1250  -- Сосиски куриные Halal
    WHEN ean = '4820000000004' THEN 1090  -- Сосиски говяжьи
    WHEN ean = '4820000000005' THEN 520    -- Печенье овсяное
    WHEN ean = '4820000000006' THEN 790   -- Батончик протеиновый
    WHEN ean = '4820000000007' THEN 430    -- Кола классическая
    WHEN ean = '4820000000008' THEN 470    -- Кола Zero
    WHEN ean = '4820000000009' THEN 950    -- Молоко рисовое
    WHEN ean = '6900000000010' THEN 2900   -- Кабель USB-C 60W
    WHEN ean = '6900000000011' THEN 900    -- Кабель USB-C бюджет
    WHEN ean = '6900000000012' THEN 6900   -- Зарядное 33W
    WHEN ean = '4800000000013' THEN 7800   -- Краска премиум
    WHEN ean = '4800000000014' THEN 4200   -- Краска эконом
    WHEN ean = '4800000000015' THEN 3500   -- Клей плиточный
  END,
  CASE
    WHEN ean IN ('4820000000001','4820000000002') THEN 'Молочные'
    WHEN ean IN ('4820000000003','4820000000004') THEN 'Мясо'
    WHEN ean = '4820000000005' THEN 'Кондитерские'
    WHEN ean = '4820000000006' THEN 'Спортивное питание'
    WHEN ean IN ('4820000000007','4820000000008') THEN 'Напитки'
    WHEN ean = '4820000000009' THEN 'Растительное молоко'
    WHEN ean IN ('6900000000010','6900000000011','6900000000012') THEN 'Электроника'
    WHEN ean IN ('4800000000013','4800000000014','4800000000015') THEN 'Строительство'
  END,
  CASE
    WHEN ean = '4820000000001' THEN 'F-2'
    WHEN ean = '4820000000002' THEN 'F-2'
    WHEN ean = '4820000000003' THEN 'M-1'
    WHEN ean = '4820000000004' THEN 'M-1'
    WHEN ean = '4820000000005' THEN 'S-3'
    WHEN ean = '4820000000006' THEN 'S-1'
    WHEN ean = '4820000000007' THEN 'D-1'
    WHEN ean = '4820000000008' THEN 'D-1'
    WHEN ean = '4820000000009' THEN 'F-1'
    WHEN ean = '6900000000010' THEN 'E-4'
    WHEN ean = '6900000000011' THEN 'E-4'
    WHEN ean = '6900000000012' THEN 'E-2'
    WHEN ean = '4800000000013' THEN 'B-7'
    WHEN ean = '4800000000014' THEN 'B-7'
    WHEN ean = '4800000000015' THEN 'B-3'
  END,
  CASE
    WHEN ean IN ('4820000000003','6900000000010','4800000000013') THEN true
    ELSE false
  END,
  NOW(),
  NOW()
FROM global_products
WHERE ean IN (
  '4820000000001','4820000000002','4820000000003','4820000000004','4820000000005',
  '4820000000006','4820000000007','4820000000008','4820000000009','6900000000010',
  '6900000000011','6900000000012','4800000000013','4800000000014','4800000000015'
)
ON CONFLICT (store_id, ean) DO UPDATE SET
  global_product_id = EXCLUDED.global_product_id,
  price_kzt = EXCLUDED.price_kzt,
  shelf_zone = EXCLUDED.shelf_zone,
  shelf_position = EXCLUDED.shelf_position,
  is_promoted = EXCLUDED.is_promoted,
  updated_at = NOW();
