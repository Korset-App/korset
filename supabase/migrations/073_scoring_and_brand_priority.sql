-- 073_scoring_and_brand_priority.sql
-- Fixes search ranking priorities:
-- 1. Separates specific sub-brands (Bounty, Snickers, Twix, Milky Way, Skittles) from parent corporation MARS
--    so searching "баунти" shows Bounty bars first rather than Rondo or Skittles candies.
-- 2. Adds "pep" / "пеп" -> Pepsi brand alias with soda intent boost.
-- 3. In fn_search_store_products scoring:
--    - Direct product name containing brand alias gets +5000 pts (vs +2500 for broad parent corporation).
--    - Word prefix in product name (e.g. "Pepsi" starting with "pep") gets +5000 pts.
--    - Core grocery categories get +1000 pts over non-food items (e.g. colored pencils).

BEGIN;

-- 1. Clean up umbrella corporation assignments for specific product lines
DELETE FROM public.search_brand_aliases 
WHERE alias IN ('баунти', 'bounty', 'сникерс', 'snickers', 'твикс', 'twix', 'милки вей', 'милкивей', 'milky way', 'скитлс', 'skittles', 'орбит', 'orbit')
  AND brand = 'MARS';

-- 2. Ensure specific product line aliases exist with strong intent boost
INSERT INTO public.search_brand_aliases (alias, brand, category, subcategory, intent_boost) VALUES
  ('баунти', 'Bounty', 'sweets', 'chocolate', 3000),
  ('bounty', 'Bounty', 'sweets', 'chocolate', 3000),
  ('сникерс', 'Snickers', 'sweets', 'chocolate', 3000),
  ('snickers', 'Snickers', 'sweets', 'chocolate', 3000),
  ('твикс', 'Twix', 'sweets', 'chocolate', 3000),
  ('twix', 'Twix', 'sweets', 'chocolate', 3000),
  ('милки вей', 'Milky Way', 'sweets', 'chocolate', 3000),
  ('милкивей', 'Milky Way', 'sweets', 'chocolate', 3000),
  ('milky way', 'Milky Way', 'sweets', 'chocolate', 3000),
  ('скитлс', 'Skittles', 'sweets', 'candy', 3000),
  ('skittles', 'Skittles', 'sweets', 'candy', 3000),
  ('орбит', 'Orbit', 'sweets', 'candy', 3000),
  ('orbit', 'Orbit', 'sweets', 'candy', 3000),
  ('pep', 'Pepsi', 'water_beverages', 'soda', 3500),
  ('пеп', 'Pepsi', 'water_beverages', 'soda', 3500),
  ('pepsi', 'Pepsi', 'water_beverages', 'soda', 3500),
  ('пепси', 'Pepsi', 'water_beverages', 'soda', 3500)
ON CONFLICT (alias, brand) DO UPDATE SET 
  intent_boost = EXCLUDED.intent_boost,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory;

-- 3. Upgrade fn_search_store_products scoring
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
  
  v_normalized TEXT;
  v_escaped TEXT;
  
  v_layout_normalized TEXT;
  v_layout_escaped TEXT;

  v_kz_norm TEXT;
  v_kz_norm_escaped TEXT;
  
  v_is_barcode BOOLEAN := FALSE;
  v_tsquery_russian TSQUERY;
  v_tsquery_simple TSQUERY;
  v_query_qty RECORD;

  v_matched_categories TEXT[] := ARRAY[]::TEXT[];
  v_matched_subcategories TEXT[] := ARRAY[]::TEXT[];
  v_category_boost INTEGER := 0;

  v_matched_brands TEXT[] := ARRAY[]::TEXT[];
  v_brand_boost INTEGER := 0;
BEGIN
  IF p_store_id IS NULL THEN RAISE EXCEPTION 'p_store_id is required'; END IF;
  IF length(v_query) < 2 THEN RETURN; END IF;

  -- 1. Normalization
  v_normalized := public.normalize_search_query(v_query);
  v_escaped := replace(replace(replace(v_normalized, '\', '\\'), '%', '\%'), '_', '\_');
  v_is_barcode := (v_query ~ '^\d{4,14}$');

  -- 2. Layout variation (e.g. vjkjrj -> молоко)
  v_layout_normalized := public.normalize_search_query(public.fn_search_convert_keyboard_layout(v_query));
  IF v_layout_normalized = v_normalized THEN
    v_layout_escaped := '';
  ELSE
    v_layout_escaped := replace(replace(replace(v_layout_normalized, '\', '\\'), '%', '\%'), '_', '\_');
  END IF;

  -- 3. Kazakh diacritics variation
  v_kz_norm := public.fn_normalize_kazakh_letters(v_normalized);
  IF v_kz_norm = v_normalized THEN
    v_kz_norm_escaped := '';
  ELSE
    v_kz_norm_escaped := replace(replace(replace(v_kz_norm, '\', '\\'), '%', '\%'), '_', '\_');
  END IF;

  -- 4. Text-search queries
  v_tsquery_russian := websearch_to_tsquery('russian', v_query);
  v_tsquery_simple := websearch_to_tsquery('simple', v_query);

  IF (v_tsquery_russian IS NULL OR v_tsquery_russian = ''::tsquery) AND v_layout_normalized != '' AND v_layout_normalized != v_normalized THEN
    v_tsquery_russian := websearch_to_tsquery('russian', v_layout_normalized);
  END IF;

  SELECT * INTO v_query_qty FROM public.normalize_search_quantity(v_normalized);

  -- 5. Pre-compute matched categories and subcategories from category keywords
  SELECT COALESCE(array_agg(DISTINCT ck.category), ARRAY[]::TEXT[]),
         COALESCE(array_agg(DISTINCT ck.subcategory) FILTER (WHERE ck.subcategory IS NOT NULL), ARRAY[]::TEXT[]),
         COALESCE(MAX(ck.intent_boost), 0)
  INTO v_matched_categories, v_matched_subcategories, v_category_boost
  FROM public.search_category_keywords ck
  WHERE 
    CASE 
      WHEN length(ck.keyword) <= 3 THEN 
        (v_normalized = ck.keyword OR v_normalized ~* ('(^|\s)' || ck.keyword || '($|\s)'))
        OR (v_kz_norm != '' AND (v_kz_norm = ck.keyword OR v_kz_norm ~* ('(^|\s)' || ck.keyword || '($|\s)')))
      ELSE
        v_normalized ILIKE '%' || ck.keyword || '%'
        OR (v_layout_normalized != '' AND v_layout_normalized ILIKE '%' || ck.keyword || '%')
        OR (v_kz_norm != '' AND v_kz_norm ILIKE '%' || ck.keyword || '%')
    END;

  -- 6. Pre-compute matched brands
  SELECT COALESCE(array_agg(DISTINCT ba.brand), ARRAY[]::TEXT[]),
         COALESCE(MAX(ba.intent_boost), 0)
  INTO v_matched_brands, v_brand_boost
  FROM public.search_brand_aliases ba
  WHERE 
    CASE 
      WHEN length(ba.alias) <= 3 THEN 
        (v_normalized = ba.alias OR v_normalized ~* ('(^|\s)' || ba.alias || '($|\s)'))
        OR (v_layout_normalized != '' AND (v_layout_normalized = ba.alias OR v_layout_normalized ~* ('(^|\s)' || ba.alias || '($|\s)')))
      ELSE
        v_normalized ILIKE '%' || ba.alias || '%'
        OR (v_layout_normalized != '' AND v_layout_normalized ILIKE '%' || ba.alias || '%')
    END;

  -- Enrich category intent with brand's known categories
  IF cardinality(v_matched_brands) > 0 THEN
    SELECT 
      COALESCE(v_matched_categories || array_agg(DISTINCT ba.category) FILTER (WHERE ba.category IS NOT NULL), v_matched_categories),
      COALESCE(v_matched_subcategories || array_agg(DISTINCT ba.subcategory) FILTER (WHERE ba.subcategory IS NOT NULL), v_matched_subcategories)
    INTO v_matched_categories, v_matched_subcategories
    FROM public.search_brand_aliases ba
    WHERE ba.brand = ANY(v_matched_brands);
  END IF;

  RETURN QUERY
  WITH candidate_ids AS (
    -- Branch 1: Barcode match (only if numeric)
    SELECT gp.id
    FROM public.global_products gp
    WHERE v_is_barcode
      AND gp.is_active = TRUE
      AND (gp.ean = v_query OR coalesce(gp.alternate_eans, '[]'::jsonb) ? v_query)

    UNION ALL

    SELECT sp.global_product_id AS id
    FROM public.store_products sp
    WHERE v_is_barcode
      AND sp.store_id = p_store_id
      AND sp.is_active = TRUE
      AND sp.ean = v_query

    UNION ALL

    -- Branch 2: Russian FTS (index: idx_global_products_name_tsvector)
    SELECT gp.id
    FROM public.global_products gp
    WHERE NOT v_is_barcode
      AND gp.is_active = TRUE
      AND v_tsquery_russian IS NOT NULL
      AND gp.name_tsvector @@ v_tsquery_russian

    UNION ALL

    -- Branch 3: Simple FTS (Russian/English names & brands)
    SELECT gp.id
    FROM public.global_products gp
    WHERE NOT v_is_barcode
      AND gp.is_active = TRUE
      AND v_tsquery_simple IS NOT NULL
      AND (gp.name_tsvector @@ v_tsquery_simple OR gp.brand_tsvector @@ v_tsquery_simple)

    UNION ALL

    -- Branch 4: Substring ILIKE in name or local_name (index: idx_gp_name_trgm)
    SELECT gp.id
    FROM public.global_products gp
    WHERE NOT v_is_barcode
      AND gp.is_active = TRUE
      AND (
        gp.name ILIKE '%' || v_escaped || '%' ESCAPE '\'
        OR (v_layout_escaped != '' AND gp.name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\')
        OR (v_kz_norm_escaped != '' AND gp.name_kz ILIKE '%' || v_kz_norm_escaped || '%' ESCAPE '\')
      )

    UNION ALL

    -- Branch 5: Brand alias match (index: idx_global_products_brand_trgm)
    SELECT gp.id
    FROM public.global_products gp
    WHERE NOT v_is_barcode
      AND gp.is_active = TRUE
      AND (
        (cardinality(v_matched_brands) > 0 AND (
          replace(replace(replace(gp.brand, '’', ''''), '‘', ''''), '&#039;', '''') = ANY(v_matched_brands)
          OR gp.brand = ANY(v_matched_brands)
          OR EXISTS (
            SELECT 1 FROM unnest(v_matched_brands) b 
            WHERE replace(replace(replace(gp.name, '’', ''''), '‘', ''''), '&#039;', '''') ILIKE '%' || b || '%'
          )
        ))
        OR (gp.brand IS NOT NULL AND gp.brand ILIKE '%' || v_escaped || '%' ESCAPE '\')
      )
  ),
  unique_candidates AS (
    SELECT DISTINCT cid.id FROM candidate_ids cid
    LIMIT 120
  ),
  store_candidates AS (
    SELECT
      sp.id, sp.ean, sp.local_name, sp.price_kzt,
      sp.shelf_zone, sp.shelf_position, sp.stock_status,
      gp.ean AS gp_ean, gp.alternate_eans, gp.name, gp.name_kz, gp.brand,
      gp.category, gp.subcategory, gp.quantity,
      gp.name_tsvector, gp.brand_tsvector, gp.ingredients_tsvector,
      gp.halal_status, to_jsonb(gp) AS global_products,
      FALSE AS is_category_fallback
    FROM unique_candidates uc
    JOIN public.global_products gp ON gp.id = uc.id
    JOIN public.store_products sp ON sp.global_product_id = gp.id
    WHERE sp.store_id = p_store_id
      AND sp.is_active = TRUE
      AND sp.stock_status IS DISTINCT FROM 'out_of_stock'

    UNION ALL

    -- Fallback ONLY if zero text candidates matched AND user query matches category/subcategory
    SELECT
      sp.id, sp.ean, sp.local_name, sp.price_kzt,
      sp.shelf_zone, sp.shelf_position, sp.stock_status,
      gp.ean AS gp_ean, gp.alternate_eans, gp.name, gp.name_kz, gp.brand,
      gp.category, gp.subcategory, gp.quantity,
      gp.name_tsvector, gp.brand_tsvector, gp.ingredients_tsvector,
      gp.halal_status, to_jsonb(gp) AS global_products,
      TRUE AS is_category_fallback
    FROM public.store_products sp
    JOIN public.global_products gp ON gp.id = sp.global_product_id
    WHERE NOT EXISTS (SELECT 1 FROM unique_candidates)
      AND sp.store_id = p_store_id
      AND sp.is_active = TRUE
      AND gp.is_active = TRUE
      AND sp.stock_status IS DISTINCT FROM 'out_of_stock'
      AND (
        (cardinality(v_matched_subcategories) > 0 AND gp.subcategory = ANY(v_matched_subcategories))
        OR (cardinality(v_matched_subcategories) = 0 AND cardinality(v_matched_categories) > 0 AND gp.category = ANY(v_matched_categories))
      )
    LIMIT 60
  ),
  scored AS (
    SELECT
      c.id, c.ean, c.local_name, c.price_kzt,
      c.shelf_zone, c.shelf_position, c.stock_status, c.global_products,
      (
        CASE 
          WHEN c.is_category_fallback THEN 
            CASE 
              WHEN cardinality(v_matched_subcategories) > 0 AND c.subcategory = ANY(v_matched_subcategories) THEN 1200 
              ELSE 800 
            END
          ELSE
            -- 1. Exact EAN: 20000 points
            CASE WHEN c.ean = v_query OR c.gp_ean = v_query OR coalesce(c.alternate_eans, '[]'::jsonb) ? v_query THEN 20000 ELSE 0 END

            -- 2. Exact full name match: 8000 points
            + CASE WHEN lower(c.name) = v_normalized OR lower(coalesce(c.local_name, '')) = v_normalized THEN 8000 ELSE 0 END

            -- 3. Prefix match: 5000 points (starts of full string or word in name)
            + CASE 
                WHEN c.name ILIKE v_escaped || '%' ESCAPE '\' OR c.local_name ILIKE v_escaped || '%' ESCAPE '\' THEN 5000 
                WHEN c.name ILIKE '% ' || v_escaped || '%' ESCAPE '\' OR c.local_name ILIKE '% ' || v_escaped || '%' ESCAPE '\' THEN 4800
                WHEN (c.brand IS NOT NULL AND c.brand ILIKE v_escaped || '%' ESCAPE '\') THEN 4500
                WHEN v_layout_escaped != '' AND (c.name ILIKE v_layout_escaped || '%' ESCAPE '\' OR c.name ILIKE '% ' || v_layout_escaped || '%' ESCAPE '\') THEN 4200
                ELSE 0 
              END

            -- 4. Full-text search match (Russian): up to 4000 points
            + CASE WHEN v_tsquery_russian IS NOT NULL AND c.name_tsvector @@ v_tsquery_russian 
                   THEN 3000 + ts_rank_cd(c.name_tsvector, v_tsquery_russian) * 800 ELSE 0 END

            -- 5. Full-text search match (Simple): up to 3000 points
            + CASE WHEN v_tsquery_simple IS NOT NULL AND c.name_tsvector @@ v_tsquery_simple 
                   THEN 2200 + ts_rank_cd(c.name_tsvector, v_tsquery_simple) * 600 ELSE 0 END

            -- 6. Substring match in name or local_name: 2500 points
            + CASE 
                WHEN length(v_normalized) <= 4 THEN
                  CASE WHEN c.name ILIKE v_escaped || '%' OR c.name ILIKE '% ' || v_escaped || '%'
                            OR c.local_name ILIKE v_escaped || '%' OR c.local_name ILIKE '% ' || v_escaped || '%'
                       THEN 2500 ELSE 0 END
                ELSE
                  CASE WHEN c.name ILIKE '%' || v_escaped || '%' ESCAPE '\' OR c.local_name ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 2500 ELSE 0 END
              END

            -- 7. Substring match in Kazakh name: 2500 points
            + CASE 
                WHEN c.name_kz IS NOT NULL THEN
                  CASE 
                    WHEN length(v_normalized) <= 4 THEN
                      CASE WHEN c.name_kz ILIKE v_escaped || '%' OR c.name_kz ILIKE '% ' || v_escaped || '%' THEN 2500 ELSE 0 END
                    ELSE
                      CASE WHEN c.name_kz ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 2500 ELSE 0 END
                  END
                ELSE 0 
              END

            -- 8. Brand match: specific product line / brand match up to 6500 points
            + CASE 
                WHEN cardinality(v_matched_brands) > 0 AND (
                  -- Direct product match: product name contains the specific sub-brand (e.g. Bounty, Snickers, Pepsi)
                  EXISTS (
                    SELECT 1 FROM unnest(v_matched_brands) b 
                    WHERE replace(replace(replace(c.name, '’', ''''), '‘', ''''), '&#039;', '''') ILIKE '%' || b || '%'
                       OR replace(replace(replace(coalesce(c.local_name, ''), '’', ''''), '‘', ''''), '&#039;', '''') ILIKE '%' || b || '%'
                  )
                  OR c.brand = ANY(v_matched_brands)
                ) THEN 5000 + v_brand_boost 
                WHEN cardinality(v_matched_brands) > 0 AND (
                  replace(replace(replace(c.brand, '’', ''''), '‘', ''''), '&#039;', '''') = ANY(v_matched_brands)
                ) THEN 2500 + v_brand_boost
                WHEN c.brand IS NOT NULL AND c.brand ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 3000
                ELSE 0 
              END
            + CASE WHEN v_tsquery_simple IS NOT NULL AND c.brand_tsvector @@ v_tsquery_simple THEN 1500 ELSE 0 END

            -- 9. Grocery core category boost: food & beverage items prioritized over stationary & chemicals
            + CASE 
                WHEN c.category IN ('water_beverages', 'dairy_eggs', 'sweets', 'grocery', 'snacks', 'meat_poultry', 'bakery', 'fruits_vegetables', 'frozen', 'tea_coffee', 'ready_meals') 
                THEN 1000 
                ELSE 0 
              END

            -- 10. Layout converted substring: 2000 points
            + CASE WHEN v_layout_escaped != '' AND (c.name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\' OR c.local_name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\') THEN 2000 ELSE 0 END

            -- 11. Kazakh diacritics normalized substring: 2000 points
            + CASE WHEN v_kz_norm_escaped != '' AND c.name ILIKE '%' || v_kz_norm_escaped || '%' ESCAPE '\' THEN 2000 ELSE 0 END

            -- 12. Word similarity (fuzzy for typos): 600 to 1800 points
            + CASE 
                WHEN length(v_normalized) >= 4 AND word_similarity(v_normalized, c.name) >= 0.4
                THEN (600 + word_similarity(v_normalized, c.name) * 1200)::NUMERIC 
                ELSE 0 
              END

            -- 13. Category boost: +400 points
            + CASE WHEN cardinality(v_matched_categories) > 0 AND c.category = ANY(v_matched_categories) THEN 400 + least(v_category_boost, 200) ELSE 0 END

            -- 14. Quantity match boost: +300 points
            + CASE
              WHEN c.quantity IS NOT NULL AND v_query_qty.base_value IS NOT NULL
                AND EXISTS (
                  SELECT 1 FROM public.normalize_search_quantity(c.quantity) pq
                  WHERE pq.unit_type = v_query_qty.unit_type AND pq.base_value = v_query_qty.base_value
                )
              THEN 300 ELSE 0 END

            -- 15. Stock status bonus: +200 points
            + CASE WHEN c.stock_status = 'in_stock' THEN 200 ELSE 0 END

            -- 16. Halal match: +300 points
            + CASE WHEN c.halal_status = 'yes' AND (v_normalized ILIKE '%халал%' OR v_normalized ILIKE '%halal%') THEN 300 ELSE 0 END
        END
      )::NUMERIC AS search_rank,
      CASE
        WHEN c.is_category_fallback THEN 'intent_category_fallback'
        WHEN c.ean = v_query OR c.gp_ean = v_query OR coalesce(c.alternate_eans, '[]'::jsonb) ? v_query THEN 'ean_exact'
        WHEN lower(c.name) = v_normalized THEN 'name_exact'
        WHEN c.name ILIKE v_escaped || '%' ESCAPE '\' THEN 'name_prefix'
        WHEN v_layout_escaped != '' AND c.name ILIKE v_layout_escaped || '%' ESCAPE '\' THEN 'layout_prefix'
        WHEN cardinality(v_matched_brands) > 0 AND (
          EXISTS (
            SELECT 1 FROM unnest(v_matched_brands) b 
            WHERE replace(replace(replace(c.name, '’', ''''), '‘', ''''), '&#039;', '''') ILIKE '%' || b || '%'
               OR replace(replace(replace(coalesce(c.local_name, ''), '’', ''''), '‘', ''''), '&#039;', '''') ILIKE '%' || b || '%'
          )
          OR c.brand = ANY(v_matched_brands)
        ) THEN 'brand_match'
        WHEN v_tsquery_russian IS NOT NULL AND c.name_tsvector @@ v_tsquery_russian THEN 'fts_russian'
        WHEN v_tsquery_simple IS NOT NULL AND c.name_tsvector @@ v_tsquery_simple THEN 'fts_simple'
        WHEN c.name ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 'substring'
        WHEN v_layout_escaped != '' AND c.name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\' THEN 'layout_converted'
        WHEN length(v_normalized) >= 4 AND word_similarity(v_normalized, c.name) >= 0.4 THEN 'fuzzy_typo'
        ELSE 'text_match'
      END AS match_type
    FROM store_candidates c
  )
  SELECT
    s.id, s.ean, s.local_name, s.price_kzt,
    s.shelf_zone, s.shelf_position, s.stock_status, s.global_products,
    s.search_rank, s.match_type
  FROM scored s
  WHERE s.search_rank >= 300
  ORDER BY s.search_rank DESC, s.price_kzt NULLS LAST, s.id
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_search_store_products(UUID, TEXT, INTEGER, INTEGER)
  TO anon, authenticated;

COMMIT;
