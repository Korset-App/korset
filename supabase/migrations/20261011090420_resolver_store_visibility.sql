BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

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
  v_store_visible boolean := false;
BEGIN
  -- Consumer prices require an active store, including owner and superadmin lookups.
  IF p_store_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = p_store_id
        AND s.is_active = true
        AND (
          s.is_published = true
          OR s.owner_id = auth.uid()
          OR public.is_superadmin_user(auth.uid())
        )
    ) INTO v_store_visible;
  END IF;

  -- 1. Try store product by direct EAN (index: store_products_store_ean_key)
  IF v_store_visible THEN
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
  IF v_store_visible THEN
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

REVOKE ALL ON FUNCTION public.fn_resolve_product_by_ean(text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fn_resolve_product_by_ean(text, uuid)
  TO anon, authenticated, service_role;

COMMIT;
