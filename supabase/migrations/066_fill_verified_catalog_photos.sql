BEGIN;

CREATE OR REPLACE FUNCTION public.fn_fill_verified_catalog_photos(p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) > 500 THEN
    RAISE EXCEPTION 'Expected an array of at most 500 photos';
  END IF;

  UPDATE public.global_products AS gp
  SET image_url = item.image_url
  FROM jsonb_to_recordset(p_items) AS item(ean TEXT, image_url TEXT)
  WHERE gp.ean = item.ean
    AND gp.image_url IS NULL
    AND item.ean ~ '^[0-9]{8}([0-9]{5})?$'
    AND item.image_url LIKE 'https://semeiniy.kz/wa-data/public/shop/products/%'
    AND item.image_url ~ '[.](jpg|jpeg|png|webp)$';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_fill_verified_catalog_photos(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_fill_verified_catalog_photos(JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fill_verified_catalog_photos(JSONB) TO service_role;

COMMIT;
