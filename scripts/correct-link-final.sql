-- Связать продукты с магазином (цены со скриншотов)
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
    WHEN ean = '4600000102452'  THEN 220   -- Snickers 50г       (1.png)
    WHEN ean = '46000000103012' THEN 180   -- Батончик Step 50г  (2.png)
    WHEN ean = '5000112546324'  THEN 320   -- Coca-Cola 0.5л     (3.png)
    WHEN ean = '5000112546325'  THEN 520   -- Coca-Cola 1л       (3_1.png)
    WHEN ean = '5000112546326'  THEN 340   -- Coca-Cola Zero 0.5л(3_2.png)
    WHEN ean = '48900008100309' THEN 300   -- Pepsi 0.5л         (4.png)
    WHEN ean = '4870200003012'  THEN 180   -- Tassay 0.5л        (5.png)
    WHEN ean = '4870200003013'  THEN 260   -- Tassay 1л          (5_1.png)
    WHEN ean = '4870200003014'  THEN 150   -- Samal 0.5л         (6.png)
    WHEN ean = '4870200003015'  THEN 200   -- Samal 1л           (6_1.png)
    WHEN ean = '4870200003020'  THEN 890   -- Рис Цесна 700г     (7.png)
    WHEN ean = '4870200003021'  THEN 750   -- Рис Makfa 800г     (7_1.png)
    WHEN ean = '4870200003022'  THEN 1750  -- Тушёнка Кублей     (8.png)
    WHEN ean = '4870200003011'  THEN 220   -- Cool Cola 1л       (11.png)
    WHEN ean = '4870200003023'  THEN 1890  -- Колбаса Папа Может (12.png)
    WHEN ean = '6900000000010'  THEN 2900  -- Кабель USB-C 60W   (9.png)
    WHEN ean = '6900000000012'  THEN 6900  -- Зарядное Xiaomi    (10.png)
    WHEN ean = '6900000000011'  THEN 900   -- Кабель Type-C 18W  (13.png)
    WHEN ean = '6900000000014'  THEN 2500  -- Наушники Breaking  (14.png)
    WHEN ean = '4800000000013'  THEN 7800  -- Краска Düfa        (15.png)
    WHEN ean = '4800000000014'  THEN 4200  -- Краска Sniezka     (16.png)
    WHEN ean = '4800000000015'  THEN 3500  -- Клей Ceresit       (17.png)
  END,
  CASE
    WHEN ean IN ('4600000102452','46000000103012') THEN 'Кондитерские'
    WHEN ean IN ('5000112546324','5000112546325','5000112546326') THEN 'Напитки'
    WHEN ean IN ('48900008100309','4870200003011') THEN 'Напитки'
    WHEN ean IN ('4870200003012','4870200003013','4870200003014','4870200003015') THEN 'Вода'
    WHEN ean IN ('4870200003020','4870200003021') THEN 'Бакалея'
    WHEN ean = '4870200003022' THEN 'Консервы'
    WHEN ean = '4870200003023' THEN 'Мясо'
    WHEN ean IN ('6900000000010','6900000000011','6900000000012','6900000000014') THEN 'Электроника'
    WHEN ean IN ('4800000000013','4800000000014','4800000000015') THEN 'Строительство'
  END,
  CASE
    WHEN ean = '4600000102452'  THEN 'S-01'  -- Snickers 50г
    WHEN ean = '46000000103012' THEN 'S-02'  -- Step 50г
    WHEN ean = '5000112546324'  THEN 'D-01'  -- Coca-Cola 0.5л
    WHEN ean = '5000112546325'  THEN 'D-02'  -- Coca-Cola 1л
    WHEN ean = '5000112546326'  THEN 'D-03'  -- Coca-Cola Zero
    WHEN ean = '48900008100309' THEN 'D-04'  -- Pepsi 0.5л
    WHEN ean = '4870200003012'  THEN 'W-01'  -- Tassay 0.5л
    WHEN ean = '4870200003013'  THEN 'W-02'  -- Tassay 1л
    WHEN ean = '4870200003014'  THEN 'W-03'  -- Samal 0.5л
    WHEN ean = '4870200003015'  THEN 'W-04'  -- Samal 1л
    WHEN ean = '4870200003020'  THEN 'G-01'  -- Цесна
    WHEN ean = '4870200003021'  THEN 'G-02'  -- Makfa
    WHEN ean = '4870200003022'  THEN 'C-01'  -- Кублей
    WHEN ean = '4870200003011'  THEN 'D-05'  -- Cool Cola
    WHEN ean = '4870200003023'  THEN 'M-01'  -- Папа Может
    WHEN ean = '6900000000010'  THEN 'E-01'  -- Кабель 60W
    WHEN ean = '6900000000012'  THEN 'E-02'  -- Зарядное
    WHEN ean = '6900000000011'  THEN 'E-03'  -- Кабель 18W
    WHEN ean = '6900000000014'  THEN 'E-04'  -- Наушники
    WHEN ean = '4800000000013'  THEN 'B-01'  -- Краска Düfa
    WHEN ean = '4800000000014'  THEN 'B-02'  -- Краска Sniezka
    WHEN ean = '4800000000015'  THEN 'B-03'  -- Клей Ceresit
  END,
  CASE
    WHEN ean IN ('4870200003022','6900000000010','4800000000013') THEN true
    ELSE false
  END,
  NOW(),
  NOW()
FROM global_products
WHERE ean IN (
  '4600000102452','46000000103012',
  '5000112546324','5000112546325','5000112546326',
  '48900008100309','4870200003011',
  '4870200003012','4870200003013','4870200003014','4870200003015',
  '4870200003020','4870200003021','4870200003022','4870200003023',
  '6900000000010','6900000000011','6900000000012','6900000000014',
  '4800000000013','4800000000014','4800000000015'
)
ON CONFLICT (store_id, ean) DO UPDATE SET
  global_product_id = EXCLUDED.global_product_id,
  price_kzt        = EXCLUDED.price_kzt,
  shelf_zone       = EXCLUDED.shelf_zone,
  shelf_position   = EXCLUDED.shelf_position,
  is_promoted      = EXCLUDED.is_promoted,
  updated_at       = NOW();
