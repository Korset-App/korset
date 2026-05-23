-- ═══════════════════════════════════════════════════════════════════════════════
-- 037 — fn_get_store_catalog: add ingredients_raw, nutriments_json, traces_json
-- ═══════════════════════════════════════════════════════════════════════════════
-- Extends fn_get_store_catalog (originally 029) with three new fit-check
-- columns from global_products to support allergens/traces/nutrition analysis
-- on the catalog level without extra round-trips.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

DROP FUNCTION IF EXISTS fn_get_store_catalog(uuid);

CREATE OR REPLACE FUNCTION public.fn_get_store_catalog(
  p_store_id UUID
)
RETURNS TABLE (
  ean           TEXT,
  gp_ean        TEXT,
  local_name    TEXT,
  price_kzt     INTEGER,
  shelf_zone    TEXT,
  stock_status  TEXT,
  store_product_id  UUID,
  global_product_id UUID,
  name          TEXT,
  name_kz       TEXT,
  brand         TEXT,
  category      TEXT,
  subcategory   TEXT,
  quantity      TEXT,
  image_url     TEXT,
  allergens_json    JSONB,
  diet_tags_json    JSONB,
  halal_status  TEXT,
  packaging_type TEXT,
  fat_percent   NUMERIC,
  nutriscore    TEXT,
  product_group TEXT,
  alternate_eans JSONB,
  ingredients_raw TEXT,
  nutriments_json JSONB,
  traces_json    JSONB
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
  ORDER BY gp.category NULLS LAST, gp.name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_store_catalog(UUID)
  TO anon, authenticated;

COMMIT;
