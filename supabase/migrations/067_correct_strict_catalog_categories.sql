BEGIN;

CREATE OR REPLACE FUNCTION public.fn_apply_strict_catalog_categories(p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'Expected an array of at most 200 corrections';
  END IF;

  UPDATE public.global_products AS gp
  SET category = COALESCE(item.new_category, gp.category),
      subcategory = CASE WHEN item.new_category IS NULL THEN gp.subcategory ELSE item.new_subcategory END,
      is_active = CASE WHEN item.deactivate THEN FALSE ELSE gp.is_active END
  FROM jsonb_to_recordset(p_items) AS item(
    ean TEXT, name TEXT, old_category TEXT, new_category TEXT,
    new_subcategory TEXT, deactivate BOOLEAN
  )
  WHERE gp.ean = item.ean
    AND gp.name = item.name
    AND gp.category = item.old_category
    AND gp.is_active = TRUE
    AND (
      (item.deactivate = TRUE AND item.old_category = 'grocery' AND item.new_category IS NULL)
      OR (item.deactivate = FALSE AND item.old_category = 'dairy_eggs' AND item.new_category IN ('deli', 'water_beverages'))
      OR (item.deactivate = FALSE AND item.old_category = 'water_beverages' AND item.new_category = 'snacks')
      OR (item.deactivate = FALSE AND item.old_category = 'grocery' AND item.new_category IN ('sauces_spices', 'fish'))
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_apply_strict_catalog_categories(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_apply_strict_catalog_categories(JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_apply_strict_catalog_categories(JSONB) TO service_role;

COMMIT;
