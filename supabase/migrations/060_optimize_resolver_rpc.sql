-- 060_optimize_resolver_rpc.sql
-- Optimizes fn_resolve_product_by_ean to use exact B-tree index lookups
-- avoiding the slow OR filter that caused 58,000-row sequential scans.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_resolve_product_by_ean(
  p_ean text,
  p_store_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- 1. Try store product by direct EAN (index: store_products_store_ean_key)
  IF p_store_id IS NOT NULL THEN
    SELECT
      to_jsonb(gp) || jsonb_build_object(
        '_sp_id', sp.id,
        '_sp_price_kzt', sp.price_kzt,
        '_sp_shelf_zone', sp.shelf_zone,
        '_sp_shelf_position', sp.shelf_position,
        '_sp_stock_status', sp.stock_status
      )
    INTO v_result
    FROM public.store_products sp
    JOIN public.global_products gp ON gp.id = sp.global_product_id
    WHERE sp.store_id = p_store_id
      AND sp.ean = p_ean
      AND sp.is_active = true
      AND gp.is_active = true
    LIMIT 1;

    IF v_result IS NOT NULL THEN
      RETURN v_result;
    END IF;
  END IF;

  -- 2. Try global product by direct primary EAN (index: global_products_ean_key)
  SELECT to_jsonb(gp)
  INTO v_result
  FROM public.global_products gp
  WHERE gp.is_active = true
    AND gp.ean = p_ean
  LIMIT 1;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  -- 3. Try trusted alias in store context (index: product_ean_aliases_one_trusted_active_ean_key)
  IF p_store_id IS NOT NULL THEN
    SELECT
      to_jsonb(gp) || jsonb_build_object(
        '_sp_id', sp.id,
        '_sp_price_kzt', sp.price_kzt,
        '_sp_shelf_zone', sp.shelf_zone,
        '_sp_shelf_position', sp.shelf_position,
        '_sp_stock_status', sp.stock_status,
        '_ean_alias_ean', pea.ean,
        '_ean_alias_status', pea.status,
        '_ean_alias_confidence', pea.confidence,
        '_ean_alias_id', pea.id
      )
    INTO v_result
    FROM public.product_ean_aliases pea
    JOIN public.global_products gp ON gp.id = pea.global_product_id
    JOIN public.store_products sp ON sp.global_product_id = gp.id
    WHERE pea.ean = p_ean
      AND pea.status = 'trusted'
      AND pea.confidence >= 80
      AND pea.is_active = true
      AND gp.is_active = true
      AND sp.store_id = p_store_id
      AND sp.is_active = true
    LIMIT 1;

    IF v_result IS NOT NULL THEN
      RETURN v_result;
    END IF;
  END IF;

  -- 4. Try trusted alias in global context
  SELECT
    to_jsonb(gp) || jsonb_build_object(
      '_ean_alias_ean', pea.ean,
      '_ean_alias_status', pea.status,
      '_ean_alias_confidence', pea.confidence,
      '_ean_alias_id', pea.id
    )
  INTO v_result
  FROM public.product_ean_aliases pea
  JOIN public.global_products gp ON gp.id = pea.global_product_id
  WHERE pea.ean = p_ean
    AND pea.status = 'trusted'
    AND pea.confidence >= 80
    AND pea.is_active = true
    AND gp.is_active = true
  LIMIT 1;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_product_by_ean(text, uuid)
  TO anon, authenticated;

COMMIT;
