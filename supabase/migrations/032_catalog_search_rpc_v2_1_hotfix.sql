-- ═══════════════════════════════════════════════════════════════════════════════
-- 032 — catalog search RPC v2.1 hotfix
-- ═══════════════════════════════════════════════════════════════════════════════
-- Fixes performance issues in migration 031:
--   1. Replaces LEFT JOIN category_keywords (duplicate rows) with scalar subquery
--   2. Removes expensive per-token unnest+word_similarity; keeps single-call
--      word_similarity on full name (same as v2)
--   3. Keeps quantity normalization and all v2 ranking signals
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

SET LOCAL search_path = public, extensions, pg_temp;

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
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_query TEXT := btrim(coalesce(p_query, ''));
  v_limit INTEGER := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_offset INTEGER := greatest(coalesce(p_offset, 0), 0);
  v_tsquery_russian TSQUERY;
  v_tsquery_simple TSQUERY;
  v_ingredients_tsquery TSQUERY;
  v_normalized TEXT := public.normalize_search_query(v_query);
  v_query_qty RECORD;
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'p_store_id is required';
  END IF;

  IF length(v_query) < 2 THEN
    RETURN;
  END IF;

  v_tsquery_russian := websearch_to_tsquery('russian', v_query);
  v_tsquery_simple := websearch_to_tsquery('simple', v_query);
  v_ingredients_tsquery := websearch_to_tsquery('russian', v_query);

  SELECT * INTO v_query_qty FROM public.normalize_search_quantity(v_normalized);

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
        -- EAN exact
        CASE
          WHEN sp.ean = v_query OR gp.ean = v_query OR gp.alternate_eans @> ARRAY[v_query]::TEXT[] THEN 1000
          ELSE 0
        END,
        -- Name FTS Russian
        CASE
          WHEN gp.name_tsvector @@ v_tsquery_russian THEN 500 + ts_rank_cd(gp.name_tsvector, v_tsquery_russian) * 100
          ELSE 0
        END,
        -- Name FTS Simple
        CASE
          WHEN gp.name_tsvector @@ v_tsquery_simple THEN 450 + ts_rank_cd(gp.name_tsvector, v_tsquery_simple) * 100
          ELSE 0
        END,
        -- Brand FTS
        CASE
          WHEN gp.brand_tsvector @@ v_tsquery_simple THEN 350 + ts_rank_cd(gp.brand_tsvector, v_tsquery_simple) * 100
          ELSE 0
        END,
        -- Ingredients FTS
        CASE
          WHEN gp.ingredients_tsvector @@ v_ingredients_tsquery THEN 200 + ts_rank_cd(gp.ingredients_tsvector, v_ingredients_tsquery) * 50
          ELSE 0
        END,
        -- Substring local_name
        CASE
          WHEN sp.local_name ILIKE '%' || v_query || '%' THEN 300
          ELSE 0
        END,
        -- Substring name / name_kz
        CASE
          WHEN gp.name ILIKE '%' || v_query || '%' OR gp.name_kz ILIKE '%' || v_query || '%' THEN 250
          ELSE 0
        END,
        -- Full-field trigram similarity
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
        END,
        -- Word similarity (single call, fast)
        CASE
          WHEN word_similarity(coalesce(gp.name, ''), v_query) >= 0.35 THEN 140 + word_similarity(coalesce(gp.name, ''), v_query) * 80
          ELSE 0
        END,
        -- Category intent boost via scalar subquery (no duplicate rows)
        COALESCE(
          (SELECT MAX(ck.intent_boost)
           FROM public.search_category_keywords ck
           WHERE gp.category = ck.category
             AND v_normalized ILIKE '%' || ck.keyword || '%'),
          0
        ),
        -- Brand + product combo boost
        CASE
          WHEN gp.brand ILIKE '%' || split_part(v_query, ' ', 1) || '%'
            AND (gp.name_tsvector @@ v_tsquery_russian OR gp.name_tsvector @@ v_tsquery_simple)
            THEN 250
          ELSE 0
        END,
        -- Quantity regex boost with normalization (1л ↔ 1000мл)
        CASE
          WHEN gp.quantity IS NOT NULL
            AND v_query_qty.base_value IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.normalize_search_quantity(gp.quantity) pq
              WHERE pq.unit_type = v_query_qty.unit_type
                AND pq.base_value = v_query_qty.base_value
            )
            THEN 200
          ELSE 0
        END,
        -- Alias ILIKE boost
        CASE
          WHEN gp.name ILIKE '%молок%' AND v_normalized ILIKE '%молок%' THEN 100
          WHEN gp.name_kz ILIKE '%сүт%' AND v_normalized ILIKE '%сүт%' THEN 100
          WHEN gp.name ILIKE '%milk%' AND v_normalized ILIKE '%milk%' THEN 100
          WHEN gp.name ILIKE '%шоколад%' AND v_normalized ILIKE '%шоколад%' THEN 100
          WHEN gp.name ILIKE '%сок%' AND v_normalized ILIKE '%сок%' THEN 100
          WHEN gp.name_kz ILIKE '%су%' AND v_normalized ILIKE '%су%' THEN 100
          ELSE 0
        END,
        -- Halal attribute boost
        CASE
          WHEN gp.halal_status = 'yes' AND v_normalized ILIKE '%халал%' THEN 200
          WHEN gp.halal_status = 'yes' AND v_normalized ILIKE '%halal%' THEN 200
          ELSE 0
        END
      )::NUMERIC AS search_rank,
      CASE
        WHEN sp.ean = v_query OR gp.ean = v_query OR gp.alternate_eans @> ARRAY[v_query]::TEXT[] THEN 'ean_exact'
        WHEN gp.name_tsvector @@ v_tsquery_russian THEN 'fts_name'
        WHEN gp.name_tsvector @@ v_tsquery_simple THEN 'fts_name_simple'
        WHEN gp.brand_tsvector @@ v_tsquery_simple THEN 'fts_brand'
        WHEN gp.ingredients_tsvector @@ v_ingredients_tsquery THEN 'fts_ingredients'
        WHEN sp.local_name ILIKE '%' || v_query || '%' OR gp.name ILIKE '%' || v_query || '%' OR gp.name_kz ILIKE '%' || v_query || '%' THEN 'substring'
        WHEN similarity(coalesce(sp.local_name, ''), v_query) >= 0.22
          OR similarity(coalesce(gp.name, ''), v_query) >= 0.22
          OR similarity(coalesce(gp.name_kz, ''), v_query) >= 0.22
          OR similarity(coalesce(gp.brand, ''), v_query) >= 0.25 THEN 'fuzzy'
        WHEN word_similarity(coalesce(gp.name, ''), v_query) >= 0.35 THEN 'word_match'
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
        OR gp.ingredients_tsvector @@ v_ingredients_tsquery
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
