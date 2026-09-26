-- Keep the existing bulk RPC for compatibility; this function limits rows before returning them.
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_store_catalog_page(
  p_store_id UUID,
  p_after_ean TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  ean TEXT,
  gp_ean TEXT,
  local_name TEXT,
  price_kzt INTEGER,
  old_price_kzt INTEGER,
  discount_percent INTEGER,
  is_featured BOOLEAN,
  shelf_zone TEXT,
  stock_status TEXT,
  store_product_id UUID,
  global_product_id UUID,
  name TEXT,
  name_kz TEXT,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  quantity TEXT,
  image_url TEXT,
  allergens_json JSONB,
  diet_tags_json JSONB,
  halal_status TEXT,
  packaging_type TEXT,
  fat_percent NUMERIC,
  nutriscore TEXT,
  product_group TEXT,
  alternate_eans JSONB,
  ingredients_raw TEXT,
  nutriments_json JSONB,
  traces_json JSONB
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    sp.ean,
    gp.ean AS gp_ean,
    sp.local_name,
    sp.price_kzt,
    sp.old_price_kzt,
    sp.discount_percent,
    sp.is_featured,
    sp.shelf_zone,
    sp.stock_status,
    sp.id AS store_product_id,
    gp.id AS global_product_id,
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
    gp."group" AS product_group,
    gp.alternate_eans,
    gp.ingredients_raw,
    gp.nutriments_json,
    gp.traces_json
  FROM public.store_products sp
  JOIN public.global_products gp ON gp.id = sp.global_product_id
  WHERE sp.store_id = p_store_id
    AND sp.is_active = TRUE
    AND gp.is_active = TRUE
    AND sp.stock_status IS DISTINCT FROM 'out_of_stock'
    AND (p_after_ean IS NULL OR sp.ean > p_after_ean)
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = p_store_id
        AND (
          s.is_published = TRUE
          OR s.owner_id = auth.uid()
          OR public.is_superadmin_user(auth.uid())
        )
    )
  ORDER BY sp.ean
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 500);
$$;

REVOKE ALL ON FUNCTION public.fn_get_store_catalog_page(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_store_catalog_page(UUID, TEXT, INTEGER)
  TO anon, authenticated;

COMMIT;
