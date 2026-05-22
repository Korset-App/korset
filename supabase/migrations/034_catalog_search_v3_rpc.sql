BEGIN;

SET LOCAL search_path = public, extensions, pg_temp;

-- ═══════════════════════════════════════════════════════════════
-- 034b — Search v3: RPC with additive scoring + performance fix
-- ═══════════════════════════════════════════════════════════════

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
  v_escaped TEXT;
  v_query_qty RECORD;
BEGIN
  IF p_store_id IS NULL THEN RAISE EXCEPTION 'p_store_id is required'; END IF;
  IF length(v_query) < 2 THEN RETURN; END IF;

  v_tsquery_russian := websearch_to_tsquery('russian', v_query);
  v_tsquery_simple := websearch_to_tsquery('simple', v_query);
  v_ingredients_tsquery := websearch_to_tsquery('russian', v_query);

  v_escaped := replace(replace(replace(v_normalized, '\', '\\'), '%', '\%'), '_', '\_');

  SELECT * INTO v_query_qty FROM public.normalize_search_quantity(v_normalized);

  RETURN QUERY
  WITH candidates AS (
    SELECT
      sp.id, sp.ean, sp.local_name, sp.price_kzt,
      sp.shelf_zone, sp.shelf_position, sp.stock_status,
      gp.ean AS gp_ean, gp.alternate_eans, gp.name, gp.name_kz, gp.brand,
      gp.category, gp.subcategory, gp.quantity,
      gp.name_tsvector, gp.brand_tsvector, gp.ingredients_tsvector,
      gp.halal_status, to_jsonb(gp) AS global_products
    FROM public.store_products sp
    JOIN public.global_products gp ON gp.id = sp.global_product_id
    WHERE sp.store_id = p_store_id
      AND sp.is_active = TRUE
      AND gp.is_active = TRUE
      AND (
        sp.ean = v_query
        OR gp.ean = v_query
        OR coalesce(gp.alternate_eans, '[]'::jsonb) ? v_query
        OR gp.name_tsvector @@ v_tsquery_russian
        OR gp.name_tsvector @@ v_tsquery_simple
        OR gp.brand_tsvector @@ v_tsquery_simple
        OR gp.ingredients_tsvector @@ v_ingredients_tsquery
        OR sp.local_name ILIKE '%' || v_escaped || '%' ESCAPE '\'
        OR gp.name ILIKE '%' || v_escaped || '%' ESCAPE '\'
        OR gp.name_kz ILIKE '%' || v_escaped || '%' ESCAPE '\'
        OR EXISTS (
          SELECT 1 FROM public.search_brand_aliases ba
          WHERE v_normalized ILIKE '%' || ba.alias || '%'
            AND gp.brand ILIKE '%' || ba.brand || '%'
        )
        OR EXISTS (
          SELECT 1 FROM public.search_category_keywords ck
          WHERE gp.category = ck.category
            AND v_normalized ILIKE '%' || ck.keyword || '%'
        )
      )
  ),
  scored AS (
    SELECT
      c.id, c.ean, c.local_name, c.price_kzt,
      c.shelf_zone, c.shelf_position, c.stock_status, c.global_products,
      (
        -- EAN exact (2000)
        CASE WHEN c.ean = v_query OR c.gp_ean = v_query OR coalesce(c.alternate_eans, '[]'::jsonb) ? v_query THEN 2000 ELSE 0 END
        -- Name FTS Russian (up to 750)
        + CASE WHEN c.name_tsvector @@ v_tsquery_russian THEN 600 + ts_rank_cd(c.name_tsvector, v_tsquery_russian) * 150 ELSE 0 END
        -- Name FTS Simple (up to 700)
        + CASE WHEN c.name_tsvector @@ v_tsquery_simple THEN 550 + ts_rank_cd(c.name_tsvector, v_tsquery_simple) * 150 ELSE 0 END
        -- Brand FTS (up to 500)
        + CASE WHEN c.brand_tsvector @@ v_tsquery_simple THEN 400 + ts_rank_cd(c.brand_tsvector, v_tsquery_simple) * 100 ELSE 0 END
        -- Substring local_name (350)
        + CASE WHEN c.local_name ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 350 ELSE 0 END
        -- Substring name/name_kz (300)
        + CASE WHEN c.name ILIKE '%' || v_escaped || '%' ESCAPE '\' OR c.name_kz ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 300 ELSE 0 END
        -- Brand alias match (600)
        + COALESCE(
          (SELECT MAX(ba.intent_boost) FROM public.search_brand_aliases ba
           WHERE v_normalized ILIKE '%' || ba.alias || '%'
             AND c.brand ILIKE '%' || ba.brand || '%'),
          0
        )
        -- Category intent boost (0-500)
        + COALESCE(
          (SELECT MAX(ck.intent_boost) FROM public.search_category_keywords ck
           WHERE c.category = ck.category
             AND v_normalized ILIKE '%' || ck.keyword || '%'),
          0
        )
        -- Brand+product combo (300)
        + CASE
          WHEN c.brand ILIKE '%' || split_part(v_query, ' ', 1) || '%'
            AND (c.name_tsvector @@ v_tsquery_russian OR c.name_tsvector @@ v_tsquery_simple)
          THEN 300 ELSE 0 END
        -- Quantity match (250)
        + CASE
          WHEN c.quantity IS NOT NULL AND v_query_qty.base_value IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.normalize_search_quantity(c.quantity) pq
              WHERE pq.unit_type = v_query_qty.unit_type AND pq.base_value = v_query_qty.base_value
            )
          THEN 250 ELSE 0 END
        -- Trigram name (up to 250, threshold raised to 0.3)
        + CASE WHEN similarity(coalesce(c.name, ''), v_query) >= 0.3
          THEN (100 + similarity(coalesce(c.name, ''), v_query) * 150)::NUMERIC ELSE 0 END
        -- Trigram brand (up to 200, threshold 0.3)
        + CASE WHEN similarity(coalesce(c.brand, ''), v_query) >= 0.3
          THEN (80 + similarity(coalesce(c.brand, ''), v_query) * 120)::NUMERIC ELSE 0 END
        -- Trigram local_name (up to 250, threshold 0.3)
        + CASE WHEN similarity(coalesce(c.local_name, ''), v_query) >= 0.3
          THEN (100 + similarity(coalesce(c.local_name, ''), v_query) * 150)::NUMERIC ELSE 0 END
        -- Halal attribute (200)
        + CASE WHEN c.halal_status = 'yes' AND (v_normalized ILIKE '%халал%' OR v_normalized ILIKE '%halal%')
          THEN 200 ELSE 0 END
        -- Ingredients FTS — only when combined with name/brand/category match (up to 130)
        + CASE
          WHEN c.ingredients_tsvector @@ v_ingredients_tsquery
            AND (
              c.name_tsvector @@ v_tsquery_russian OR c.name_tsvector @@ v_tsquery_simple
              OR c.brand_tsvector @@ v_tsquery_simple
              OR c.name ILIKE '%' || v_escaped || '%' ESCAPE '\'
              OR EXISTS (SELECT 1 FROM public.search_category_keywords ck WHERE c.category = ck.category AND v_normalized ILIKE '%' || ck.keyword || '%')
            )
          THEN 100 + ts_rank_cd(c.ingredients_tsvector, v_ingredients_tsquery) * 30
          ELSE 0 END
        -- Intent mismatch penalty (-300)
        + CASE
          WHEN EXISTS (SELECT 1 FROM public.search_category_keywords ck WHERE v_normalized ILIKE '%' || ck.keyword || '%')
            AND NOT EXISTS (SELECT 1 FROM public.search_category_keywords ck WHERE c.category = ck.category AND v_normalized ILIKE '%' || ck.keyword || '%')
            AND c.ean != v_query AND c.gp_ean != v_query
            AND NOT coalesce(c.alternate_eans, '[]'::jsonb) ? v_query
          THEN -300 ELSE 0 END
        -- Ingredient-only penalty (-200)
        + CASE
          WHEN c.ingredients_tsvector @@ v_ingredients_tsquery
            AND NOT (c.name_tsvector @@ v_tsquery_russian OR c.name_tsvector @@ v_tsquery_simple)
            AND NOT (c.brand_tsvector @@ v_tsquery_simple)
            AND NOT (c.name ILIKE '%' || v_escaped || '%' ESCAPE '\' OR c.name_kz ILIKE '%' || v_escaped || '%' ESCAPE '\')
          THEN -200 ELSE 0 END
      )::NUMERIC AS search_rank,
      CASE
        WHEN c.ean = v_query OR c.gp_ean = v_query OR coalesce(c.alternate_eans, '[]'::jsonb) ? v_query THEN 'ean_exact'
        WHEN EXISTS (SELECT 1 FROM public.search_brand_aliases ba WHERE v_normalized ILIKE '%' || ba.alias || '%' AND c.brand ILIKE '%' || ba.brand || '%') THEN 'brand_alias'
        WHEN c.brand ILIKE '%' || split_part(v_query, ' ', 1) || '%' AND (c.name_tsvector @@ v_tsquery_russian OR c.name_tsvector @@ v_tsquery_simple) THEN 'brand_product'
        WHEN EXISTS (SELECT 1 FROM public.search_category_keywords ck WHERE c.category = ck.category AND ck.subcategory IS NOT NULL AND v_normalized ILIKE '%' || ck.keyword || '%') THEN 'intent_subcategory'
        WHEN EXISTS (SELECT 1 FROM public.search_category_keywords ck WHERE c.category = ck.category AND v_normalized ILIKE '%' || ck.keyword || '%') THEN 'intent_category'
        WHEN c.name_tsvector @@ v_tsquery_russian THEN 'fts_name'
        WHEN c.name_tsvector @@ v_tsquery_simple THEN 'fts_name_simple'
        WHEN c.brand_tsvector @@ v_tsquery_simple THEN 'fts_brand'
        WHEN c.local_name ILIKE '%' || v_escaped || '%' ESCAPE '\' OR c.name ILIKE '%' || v_escaped || '%' ESCAPE '\' OR c.name_kz ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 'substring'
        WHEN similarity(coalesce(c.name, ''), v_query) >= 0.3 OR similarity(coalesce(c.local_name, ''), v_query) >= 0.3 OR similarity(coalesce(c.brand, ''), v_query) >= 0.3 THEN 'fuzzy'
        WHEN c.ingredients_tsvector @@ v_ingredients_tsquery THEN 'fts_ingredients'
        WHEN c.halal_status = 'yes' AND (v_normalized ILIKE '%халал%' OR v_normalized ILIKE '%halal%') THEN 'attribute_tag'
        ELSE 'unknown'
      END AS match_type
    FROM candidates c
  )
  SELECT
    s.id, s.ean, s.local_name, s.price_kzt,
    s.shelf_zone, s.shelf_position, s.stock_status, s.global_products,
    s.search_rank, s.match_type
  FROM scored s
  WHERE s.search_rank >= 50
  ORDER BY s.search_rank DESC, s.price_kzt NULLS LAST, s.id
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_search_store_products(UUID, TEXT, INTEGER, INTEGER)
  TO anon, authenticated;

-- ═══════ GIN trigram indexes for performance ═══════

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_global_products_name_trgm
  ON public.global_products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_global_products_brand_trgm
  ON public.global_products USING gin (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_global_products_name_kz_trgm
  ON public.global_products USING gin (name_kz gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_store_products_local_name_trgm
  ON public.store_products USING gin (local_name gin_trgm_ops);

COMMIT;
