-- Migration 008: Add R2 image columns for Cloudflare R2 migration
-- Preserves original URLs for rollback, adds R2-specific columns

-- ══════════════════════════════════════════════════════════════
-- 1. global_products — R2 image columns
-- ══════════════════════════════════════════════════════════════

-- Original URL backup (for rollback)
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS original_image_url text;

ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS original_image_ingredients_url text;

ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS original_image_nutrition_url text;

-- R2 object key (e.g. "products/4600494001/main.jpg")
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS r2_key text;

-- Image source (where the image came from)
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS image_source text
  CHECK (image_source IS NULL OR image_source IN (
    'openfoodfacts', 'kaspi', 'arbuz', 'ean-db', 'local', 'other'
  ));

-- ══════════════════════════════════════════════════════════════
-- 2. external_product_cache — R2 image columns
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS original_image_url text;

ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS r2_key text;

-- ══════════════════════════════════════════════════════════════
-- 3. Back up current image_url → original_image_url
-- ══════════════════════════════════════════════════════════════

UPDATE public.global_products
SET original_image_url = image_url
WHERE image_url IS NOT NULL AND original_image_url IS NULL;

UPDATE public.global_products
SET original_image_ingredients_url = image_ingredients_url
WHERE image_ingredients_url IS NOT NULL AND original_image_ingredients_url IS NULL;

UPDATE public.global_products
SET original_image_nutrition_url = image_nutrition_url
WHERE image_nutrition_url IS NOT NULL AND original_image_nutrition_url IS NULL;

UPDATE public.external_product_cache
SET original_image_url = image_url
WHERE image_url IS NOT NULL AND original_image_url IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 4. Infer image_source from URL pattern
-- ══════════════════════════════════════════════════════════════

UPDATE public.global_products
SET image_source = 'openfoodfacts'
WHERE image_url LIKE '%openfoodfacts.org%' AND image_source IS NULL;

UPDATE public.global_products
SET image_source = 'kaspi'
WHERE image_url LIKE '%cdn-kaspi.kz%' AND image_source IS NULL;

UPDATE public.global_products
SET image_source = 'arbuz'
WHERE image_url LIKE '%arbuz.kz%' AND image_source IS NULL;

UPDATE public.global_products
SET image_source = 'ean-db'
WHERE image_url LIKE '%ean-db.com%' AND image_source IS NULL;

UPDATE public.global_products
SET image_source = 'local'
WHERE image_url LIKE '%/products/%' AND image_source IS NULL;

UPDATE public.global_products
SET image_source = 'other'
WHERE image_url IS NOT NULL AND image_source IS NULL;
