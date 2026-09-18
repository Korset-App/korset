-- Migration 056: Store products featured status, strikethrough price and discounts
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Add promotional and featured columns to store_products
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS old_price_kzt INTEGER CHECK (old_price_kzt >= 0),
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 99);

COMMENT ON COLUMN public.store_products.is_featured IS 'Whether product is pinned by store owner to the showcase.';
COMMENT ON COLUMN public.store_products.old_price_kzt IS 'Original pre-discount price in KZT for strikethrough display.';
COMMENT ON COLUMN public.store_products.discount_percent IS 'Discount percentage from 0 to 99.';

-- 2. Drop existing function to safely allow return type signature extension
DROP FUNCTION IF EXISTS public.fn_get_store_catalog(UUID);

-- 3. Re-create fn_get_store_catalog with promotional fields
CREATE OR REPLACE FUNCTION public.fn_get_store_catalog(
  p_store_id UUID
)
RETURNS TABLE (
  ean               TEXT,
  gp_ean            TEXT,
  local_name        TEXT,
  price_kzt         INTEGER,
  old_price_kzt     INTEGER,
  discount_percent  INTEGER,
  is_featured       BOOLEAN,
  shelf_zone        TEXT,
  stock_status      TEXT,
  store_product_id  UUID,
  global_product_id UUID,
  name              TEXT,
  name_kz           TEXT,
  brand             TEXT,
  category          TEXT,
  subcategory       TEXT,
  quantity          TEXT,
  image_url         TEXT,
  allergens_json    JSONB,
  diet_tags_json    JSONB,
  halal_status      TEXT,
  packaging_type    TEXT,
  fat_percent       NUMERIC,
  nutriscore        TEXT,
  product_group     TEXT,
  alternate_eans    JSONB,
  ingredients_raw   TEXT,
  nutriments_json   JSONB,
  traces_json       JSONB
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    sp.ean,
    gp.ean              AS gp_ean,
    sp.local_name,
    sp.price_kzt,
    sp.old_price_kzt,
    sp.discount_percent,
    sp.is_featured,
    sp.shelf_zone,
    sp.stock_status,
    sp.id               AS store_product_id,
    gp.id               AS global_product_id,
    gp.name,
    gp.name_kz,
    gp.brand,
    gp.category,
    gp.subcategory,
    gp.quantity,
    gp.image_url,
    gp.allergens_json,
    gp.diet_tags_json,
    gp.halal_status,
    gp.packaging_type,
    gp.fat_percent,
    gp.nutriscore,
    gp."group"          AS product_group,
    gp.alternate_eans,
    gp.ingredients_raw,
    gp.nutriments_json,
    gp.traces_json
  FROM public.store_products sp
  JOIN public.global_products gp ON gp.id = sp.global_product_id
  WHERE sp.store_id    = p_store_id
    AND sp.is_active   = TRUE
    AND gp.is_active   = TRUE
    AND sp.stock_status IS DISTINCT FROM 'out_of_stock'
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = p_store_id
        AND (
          is_published = true
          OR owner_id = auth.uid()
          OR public.is_superadmin_user(auth.uid())
        )
    )
  ORDER BY gp.category NULLS LAST, gp.name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_store_catalog(UUID) TO anon, authenticated;

COMMIT;
