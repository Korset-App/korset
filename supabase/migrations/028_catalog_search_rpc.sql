-- ═══════════════════════════════════════════════════════════════════════════════
-- 028 — catalog search RPC foundation
-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds pg_trgm-backed fuzzy fallback and a store-scoped product search RPC.
-- Existing tsvector columns/indexes are kept from migrations 014/018.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

SET LOCAL search_path = public, extensions;

CREATE INDEX IF NOT EXISTS idx_global_products_name_trgm
  ON public.global_products USING gin (name gin_trgm_ops)
  WHERE is_active = true AND name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_global_products_name_kz_trgm
  ON public.global_products USING gin (name_kz gin_trgm_ops)
  WHERE is_active = true AND name_kz IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_global_products_brand_trgm
  ON public.global_products USING gin (brand gin_trgm_ops)
  WHERE is_active = true AND brand IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_products_local_name_trgm
  ON public.store_products USING gin (local_name gin_trgm_ops)
  WHERE is_active = true AND local_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_products_store_active_global_product
  ON public.store_products (store_id, is_active, global_product_id);

CREATE OR REPLACE FUNCTION public.fn_search_store_products(
  p_store_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  ean TEXT,
  local_name TEXT,
  price_kzt INTEGER,
  shelf_zone TEXT,
  shelf_position TEXT,
  stock_status TEXT,
  global_products JSONB,
  search_rank NUMERIC,
  match_type TEXT
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_query TEXT := btrim(coalesce(p_query, ''));
  v_limit INTEGER := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_offset INTEGER := greatest(coalesce(p_offset, 0), 0);
  v_tsquery_russian TSQUERY;
  v_tsquery_simple TSQUERY;
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'p_store_id is required';
  END IF;

  IF length(v_query) < 2 THEN
    RETURN;
  END IF;

  v_tsquery_russian := websearch_to_tsquery('russian', v_query);
  v_tsquery_simple := websearch_to_tsquery('simple', v_query);

  RETURN QUERY
  WITH matched AS (
    SELECT
      sp.id,
      sp.ean,
      sp.local_name,
      sp.price_kzt,
      sp.shelf_zone,
      sp.shelf_position,
      sp.stock_status,
      to_jsonb(gp) AS global_products,
      GREATEST(
        CASE
          WHEN sp.ean = v_query OR gp.ean = v_query OR gp.alternate_eans @> ARRAY[v_query]::TEXT[] THEN 1000
          ELSE 0
        END,
        CASE
          WHEN gp.name_tsvector @@ v_tsquery_russian THEN 500 + ts_rank_cd(gp.name_tsvector, v_tsquery_russian) * 100
          ELSE 0
        END,
        CASE
          WHEN gp.name_tsvector @@ v_tsquery_simple THEN 450 + ts_rank_cd(gp.name_tsvector, v_tsquery_simple) * 100
          ELSE 0
        END,
        CASE
          WHEN gp.brand_tsvector @@ v_tsquery_simple THEN 350 + ts_rank_cd(gp.brand_tsvector, v_tsquery_simple) * 100
          ELSE 0
        END,
        CASE
          WHEN sp.local_name ILIKE '%' || v_query || '%' THEN 300
          ELSE 0
        END,
        CASE
          WHEN gp.name ILIKE '%' || v_query || '%' OR gp.name_kz ILIKE '%' || v_query || '%' THEN 250
          ELSE 0
        END,
        CASE
          WHEN similarity(coalesce(sp.local_name, ''), v_query) >= 0.22 THEN 200 + similarity(coalesce(sp.local_name, ''), v_query) * 100
          ELSE 0
        END,
        CASE
          WHEN similarity(coalesce(gp.name, ''), v_query) >= 0.22 THEN 180 + similarity(coalesce(gp.name, ''), v_query) * 100
          ELSE 0
        END,
        CASE
          WHEN similarity(coalesce(gp.name_kz, ''), v_query) >= 0.22 THEN 170 + similarity(coalesce(gp.name_kz, ''), v_query) * 100
          ELSE 0
        END,
        CASE
          WHEN similarity(coalesce(gp.brand, ''), v_query) >= 0.25 THEN 150 + similarity(coalesce(gp.brand, ''), v_query) * 100
          ELSE 0
        END
      )::NUMERIC AS search_rank,
      CASE
        WHEN sp.ean = v_query OR gp.ean = v_query OR gp.alternate_eans @> ARRAY[v_query]::TEXT[] THEN 'ean'
        WHEN gp.name_tsvector @@ v_tsquery_russian OR gp.name_tsvector @@ v_tsquery_simple THEN 'fts_name'
        WHEN gp.brand_tsvector @@ v_tsquery_simple THEN 'fts_brand'
        WHEN sp.local_name ILIKE '%' || v_query || '%' OR gp.name ILIKE '%' || v_query || '%' OR gp.name_kz ILIKE '%' || v_query || '%' THEN 'substring'
        WHEN similarity(coalesce(sp.local_name, ''), v_query) >= 0.22
          OR similarity(coalesce(gp.name, ''), v_query) >= 0.22
          OR similarity(coalesce(gp.name_kz, ''), v_query) >= 0.22
          OR similarity(coalesce(gp.brand, ''), v_query) >= 0.25 THEN 'fuzzy'
        ELSE 'unknown'
      END AS match_type
    FROM public.store_products sp
    JOIN public.global_products gp ON gp.id = sp.global_product_id
    WHERE sp.store_id = p_store_id
      AND sp.is_active = TRUE
      AND gp.is_active = TRUE
      AND (
        sp.ean = v_query
        OR gp.ean = v_query
        OR gp.alternate_eans @> ARRAY[v_query]::TEXT[]
        OR gp.name_tsvector @@ v_tsquery_russian
        OR gp.name_tsvector @@ v_tsquery_simple
        OR gp.brand_tsvector @@ v_tsquery_simple
        OR sp.local_name ILIKE '%' || v_query || '%'
        OR gp.name ILIKE '%' || v_query || '%'
        OR gp.name_kz ILIKE '%' || v_query || '%'
        OR similarity(coalesce(sp.local_name, ''), v_query) >= 0.22
        OR similarity(coalesce(gp.name, ''), v_query) >= 0.22
        OR similarity(coalesce(gp.name_kz, ''), v_query) >= 0.22
        OR similarity(coalesce(gp.brand, ''), v_query) >= 0.25
      )
  )
  SELECT
    matched.id,
    matched.ean,
    matched.local_name,
    matched.price_kzt,
    matched.shelf_zone,
    matched.shelf_position,
    matched.stock_status,
    matched.global_products,
    matched.search_rank,
    matched.match_type
  FROM matched
  WHERE matched.search_rank > 0
  ORDER BY
    matched.search_rank DESC,
    matched.price_kzt NULLS LAST,
    matched.id
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_search_store_products(UUID, TEXT, INTEGER, INTEGER)
  TO anon, authenticated;

COMMIT;
