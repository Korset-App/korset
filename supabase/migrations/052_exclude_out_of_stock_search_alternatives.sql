-- ═══════════════════════════════════════════════════════════════════════════════
-- 052 — exclude_out_of_stock_search_alternatives: Exclude out_of_stock items
-- ═══════════════════════════════════════════════════════════════════════════════
-- Extends fn_search_store_products (Search v3) and fn_get_product_alternatives 
-- to filter out out_of_stock items. This prevents out-of-stock items from 
-- showing up in search and recommended lists for buyers.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. UPDATE fn_search_store_products
-- ──────────────────────────────────────────────────────────────────────────
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
      AND sp.stock_status IS DISTINCT FROM 'out_of_stock'
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

-- ──────────────────────────────────────────────────────────────────────────
-- 2. UPDATE fn_get_product_alternatives
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_product_alternatives(
  p_store_id UUID,
  p_ean TEXT,
  p_scenario TEXT DEFAULT 'similar',
  p_limit INTEGER DEFAULT 24
)
RETURNS TABLE (
  ean TEXT,
  gp_ean TEXT,
  local_name TEXT,
  price_kzt INTEGER,
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
  ingredients_raw TEXT,
  ingredients_kz TEXT,
  allergens_json JSONB,
  diet_tags_json JSONB,
  traces_json JSONB,
  nutriments_json JSONB,
  halal_status TEXT,
  packaging_type TEXT,
  fat_percent NUMERIC,
  nutriscore TEXT,
  product_group TEXT,
  alternate_eans JSONB,
  relation_rank INTEGER,
  price_delta_kzt INTEGER,
  has_composition BOOLEAN,
  data_completeness INTEGER,
  availability_rank INTEGER,
  base_rank NUMERIC,
  rank_reason TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public, pg_temp
AS $$
  WITH source_product AS (
    SELECT
      sp.id AS source_store_product_id,
      sp.ean AS source_store_ean,
      sp.price_kzt AS source_price_kzt,
      gp.id AS source_global_product_id,
      gp.ean AS source_gp_ean,
      gp.category AS source_category,
      gp.subcategory AS source_subcategory,
      gp."group" AS source_group,
      gp.alternate_eans AS source_alternate_eans
    FROM public.store_products sp
    JOIN public.global_products gp ON gp.id = sp.global_product_id
    WHERE sp.store_id = p_store_id
      AND sp.is_active = TRUE
      AND gp.is_active = TRUE
    ORDER BY
      CASE
        WHEN sp.ean = p_ean THEN 0
        WHEN gp.ean = p_ean THEN 1
        ELSE 2
      END
    LIMIT 1
  ),
  candidates AS (
    SELECT
      sp.ean,
      gp.ean AS gp_ean,
      sp.local_name,
      sp.price_kzt,
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
      gp.ingredients_raw,
      gp.ingredients_kz,
      gp.allergens_json,
      gp.diet_tags_json,
      gp.traces_json,
      gp.nutriments_json,
      gp.halal_status,
      gp.packaging_type,
      gp.fat_percent,
      gp.nutriscore::TEXT AS nutriscore,
      gp."group" AS product_group,
      gp.alternate_eans,
      CASE
        WHEN src.source_group IS NOT NULL AND gp."group" = src.source_group THEN 0
        WHEN src.source_subcategory IS NOT NULL AND gp.subcategory = src.source_subcategory THEN 1
        WHEN src.source_category IS NOT NULL AND gp.category = src.source_category THEN 2
        ELSE 99
      END AS relation_rank,
      CASE
        WHEN src.source_price_kzt IS NULL OR sp.price_kzt IS NULL THEN NULL
        ELSE sp.price_kzt - src.source_price_kzt
      END AS price_delta_kzt,
      (gp.ingredients_raw IS NOT NULL OR gp.ingredients_kz IS NOT NULL) AS has_composition,
      (
        CASE WHEN gp.ingredients_raw IS NOT NULL OR gp.ingredients_kz IS NOT NULL THEN 2 ELSE 0 END
        + CASE WHEN gp.nutriments_json IS NOT NULL AND gp.nutriments_json <> '{}'::jsonb THEN 1 ELSE 0 END
        + CASE WHEN gp.allergens_json IS NOT NULL AND gp.allergens_json <> '[]'::jsonb THEN 1 ELSE 0 END
        + CASE WHEN gp.halal_status IS NOT NULL AND gp.halal_status <> 'unknown' THEN 1 ELSE 0 END
        + CASE WHEN gp.image_url IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN gp.brand IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN gp.quantity IS NOT NULL THEN 1 ELSE 0 END
      ) AS data_completeness,
      CASE sp.stock_status
        WHEN 'in_stock' THEN 3
        WHEN 'low_stock' THEN 2
        WHEN 'out_of_stock' THEN 0
        ELSE 1
      END AS availability_rank,
      src.source_price_kzt
    FROM source_product src
    JOIN public.store_products sp ON sp.store_id = p_store_id
    JOIN public.global_products gp ON gp.id = sp.global_product_id
    WHERE sp.is_active = TRUE
      AND gp.is_active = TRUE
      AND sp.stock_status IS DISTINCT FROM 'out_of_stock'
      AND sp.id <> src.source_store_product_id
      AND gp.id <> src.source_global_product_id
      AND sp.ean <> p_ean
      AND gp.ean <> p_ean
      AND NOT coalesce(gp.alternate_eans, '[]'::jsonb) ? p_ean
      AND (
        (src.source_group IS NOT NULL AND gp."group" = src.source_group)
        OR (src.source_subcategory IS NOT NULL AND gp.subcategory = src.source_subcategory)
        OR (src.source_category IS NOT NULL AND gp.category = src.source_category)
      )
  ),
  scored AS (
    SELECT
      candidates.*,
      CASE
        WHEN coalesce(p_scenario, 'similar') = 'cheaper' THEN
          CASE WHEN price_delta_kzt < 0 THEN 700 ELSE 0 END
          + greatest(0, 250 - abs(price_delta_kzt))
          + (3 - relation_rank) * 90
          + availability_rank * 40
        WHEN coalesce(p_scenario, 'similar') = 'better_composition' THEN
          data_completeness * 120
          + CASE WHEN has_composition THEN 160 ELSE 0 END
          + (3 - relation_rank) * 80
          + availability_rank * 35
        WHEN coalesce(p_scenario, 'similar') = 'fits_me' THEN
          data_completeness * 90
          + CASE WHEN has_composition THEN 120 ELSE 0 END
          + (3 - relation_rank) * 100
          + availability_rank * 45
        ELSE
          (3 - relation_rank) * 180
          + availability_rank * 50
          + data_completeness * 20
          + CASE
              WHEN price_delta_kzt IS NULL THEN 0
              ELSE greatest(0, 200 - abs(price_delta_kzt))
            END
      END::NUMERIC AS base_rank,
      CASE
        WHEN relation_rank = 0 THEN 'same_group'
        WHEN relation_rank = 1 THEN 'same_subcategory'
        WHEN relation_rank = 2 THEN 'same_category'
        ELSE 'related'
      END AS rank_reason
    FROM candidates
    WHERE relation_rank < 99
      AND (
        coalesce(p_scenario, 'similar') <> 'cheaper'
        OR price_delta_kzt < 0
      )
  )
  SELECT
    scored.ean,
    scored.gp_ean,
    scored.local_name,
    scored.price_kzt,
    scored.shelf_zone,
    scored.stock_status,
    scored.store_product_id,
    scored.global_product_id,
    scored.name,
    scored.name_kz,
    scored.brand,
    scored.category,
    scored.subcategory,
    scored.quantity,
    scored.image_url,
    scored.ingredients_raw,
    scored.ingredients_kz,
    scored.allergens_json,
    scored.diet_tags_json,
    scored.traces_json,
    scored.nutriments_json,
    scored.halal_status,
    scored.packaging_type,
    scored.fat_percent,
    scored.nutriscore,
    scored.product_group,
    scored.alternate_eans,
    scored.relation_rank,
    scored.price_delta_kzt,
    scored.has_composition,
    scored.data_completeness,
    scored.availability_rank,
    scored.base_rank,
    scored.rank_reason
  FROM scored
  ORDER BY scored.base_rank DESC, scored.name NULLS LAST, scored.ean
  LIMIT greatest(1, least(coalesce(p_limit, 24), 48));
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_product_alternatives(UUID, TEXT, TEXT, INTEGER)
  TO anon, authenticated;

COMMIT;
