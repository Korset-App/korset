-- 068_upgrade_catalog_search_engine.sql
-- Upgrades fn_search_store_products with:
-- 1. Keyboard layout conversion (QWERTY -> Cyrillic: vjkjrj -> молоко)
-- 2. Kazakh diacritics tolerance and bilingual category intent fallback
-- 3. Robust word-level typo & fuzzy search via pg_trgm word_similarity
-- 4. Elimination of junk category-pollution: category boost only applies when text matches
-- 5. Fallback category/subcategory retrieval ONLY when zero text candidates match
-- 6. Strict precision ranking hierarchy: EAN > Exact Name > Prefix > FTS > Brand > Fuzzy > Fallback

BEGIN;

-- 1. Insert core Kazakh category keywords so search immediately understands Kazakh queries
INSERT INTO public.search_category_keywords (keyword, category, subcategory, intent_boost) VALUES
  ('сүт', 'dairy_eggs', 'milk', 600),
  ('сут', 'dairy_eggs', 'milk', 600),
  ('қаймақ', 'dairy_eggs', 'cream', 600),
  ('каймак', 'dairy_eggs', 'cream', 600),
  ('май', 'dairy_eggs', 'butter', 500),
  ('сары май', 'dairy_eggs', 'butter', 600),
  ('ірімшік', 'dairy_eggs', 'cheese', 600),
  ('иримшик', 'dairy_eggs', 'cheese', 600),
  ('сүзбе', 'dairy_eggs', 'cottage', 600),
  ('сузбе', 'dairy_eggs', 'cottage', 600),
  ('жұмыртқа', 'dairy_eggs', 'eggs', 600),
  ('жумыртка', 'dairy_eggs', 'eggs', 600),
  ('нан', 'bread', 'bread', 600),
  ('ет', 'meat', 'raw', 600),
  ('құс еті', 'meat', 'poultry', 600),
  ('кус ети', 'meat', 'poultry', 600),
  ('балық', 'fish', 'fish', 600),
  ('балык', 'fish', 'fish', 600),
  ('су', 'water_beverages', 'water', 500),
  ('сусындар', 'water_beverages', 'soda', 500),
  ('шырын', 'water_beverages', 'juice', 600),
  ('шай', 'tea_coffee', 'tea', 600),
  ('шәй', 'tea_coffee', 'tea', 600),
  ('кофе', 'tea_coffee', 'coffee', 600),
  ('қант', 'grocery', 'sugar', 600),
  ('кант', 'grocery', 'sugar', 600),
  ('күріш', 'grocery', 'grains', 600),
  ('куриш', 'grocery', 'grains', 600),
  ('ұн', 'grocery', 'flour', 600),
  ('ун', 'grocery', 'flour', 600),
  ('макарон', 'grocery', 'pasta', 600),
  ('шұжық', 'deli', 'sausage', 600),
  ('шужык', 'deli', 'sausage', 600),
  ('тәттілер', 'sweets', 'candy', 500),
  ('таттилер', 'sweets', 'candy', 500),
  ('шоколад', 'sweets', 'chocolate', 600),
  ('кәмпит', 'sweets', 'candy', 600),
  ('кампит', 'sweets', 'candy', 600),
  ('алма', 'fruits_veg', 'fruits', 600),
  ('картоп', 'fruits_veg', 'vegetables', 600),
  ('пияз', 'fruits_veg', 'vegetables', 600),
  ('сәбіз', 'fruits_veg', 'vegetables', 600),
  ('сабиз', 'fruits_veg', 'vegetables', 600)
ON CONFLICT (keyword) DO UPDATE SET 
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  intent_boost = EXCLUDED.intent_boost;

-- 2. Helper: Convert keyboard layout from QWERTY to Cyrillic
CREATE OR REPLACE FUNCTION public.fn_search_convert_keyboard_layout(p_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lower TEXT := lower(coalesce(p_text, ''));
  v_en TEXT := 'qwertyuiop[]asdfghjkl;''zxcvbnm,.`';
  v_ru TEXT := 'йцукенгшщзхъфывапролджэячсмитьбюё';
  v_has_en BOOLEAN;
  v_has_ru BOOLEAN;
BEGIN
  IF v_lower IS NULL OR v_lower = '' THEN RETURN ''; END IF;
  v_has_en := (v_lower ~ '[a-z]');
  v_has_ru := (v_lower ~ '[а-яё]');
  -- Only convert English keyboard input to Cyrillic
  IF v_has_en AND NOT v_has_ru THEN
    RETURN translate(v_lower, v_en, v_ru);
  END IF;
  RETURN v_lower;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_search_convert_keyboard_layout(TEXT) TO anon, authenticated;

-- 3. Helper: Normalize Kazakh specific letters to standard Cyrillic
CREATE OR REPLACE FUNCTION public.fn_normalize_kazakh_letters(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT translate(lower(coalesce(p_text, '')), 'әіңғүұқөһ', 'аингүүкох');
$$;

GRANT EXECUTE ON FUNCTION public.fn_normalize_kazakh_letters(TEXT) TO anon, authenticated;

-- 4. Main search RPC function
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
  
  v_tsquery_russian TSQUERY;
  v_tsquery_simple TSQUERY;
  v_query_qty RECORD;

  v_matched_categories TEXT[] := ARRAY[]::TEXT[];
  v_matched_subcategories TEXT[] := ARRAY[]::TEXT[];
  v_matched_brands TEXT[] := ARRAY[]::TEXT[];
  v_category_boost NUMERIC := 0;
  v_brand_boost NUMERIC := 0;
  v_has_category_intent BOOLEAN := FALSE;
  v_text_candidate_count INTEGER := 0;
BEGIN
  IF p_store_id IS NULL THEN RAISE EXCEPTION 'p_store_id is required'; END IF;
  IF length(v_query) < 2 THEN RETURN; END IF;

  -- 1. Normalization
  v_normalized := public.normalize_search_query(v_query);
  v_escaped := replace(replace(replace(v_normalized, '\', '\\'), '%', '\%'), '_', '\_');

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

  -- 5. Pre-compute matched categories and subcategories with word boundary protection for short words
  SELECT COALESCE(array_agg(DISTINCT ck.category), ARRAY[]::TEXT[]),
         COALESCE(array_agg(DISTINCT ck.subcategory) FILTER (WHERE ck.subcategory IS NOT NULL), ARRAY[]::TEXT[]),
         COALESCE(MAX(ck.intent_boost), 0),
         COUNT(*) > 0
  INTO v_matched_categories, v_matched_subcategories, v_category_boost, v_has_category_intent
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
  WHERE v_normalized ILIKE '%' || ba.alias || '%'
     OR (v_layout_normalized != '' AND v_layout_normalized ILIKE '%' || ba.alias || '%');

  -- 7. Check if direct text candidates exist
  SELECT COUNT(*) INTO v_text_candidate_count
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
      OR (v_tsquery_russian IS NOT NULL AND gp.name_tsvector @@ v_tsquery_russian)
      OR (v_tsquery_simple IS NOT NULL AND gp.name_tsvector @@ v_tsquery_simple)
      OR (v_tsquery_simple IS NOT NULL AND gp.brand_tsvector @@ v_tsquery_simple)
      OR (cardinality(v_matched_brands) > 0 AND gp.brand = ANY(v_matched_brands))
      OR sp.local_name ILIKE '%' || v_escaped || '%' ESCAPE '\'
      OR gp.name ILIKE '%' || v_escaped || '%' ESCAPE '\'
      OR (gp.name_kz IS NOT NULL AND gp.name_kz ILIKE '%' || v_escaped || '%' ESCAPE '\')
      OR (v_layout_escaped != '' AND (
            gp.name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\'
            OR (gp.name_kz IS NOT NULL AND gp.name_kz ILIKE '%' || v_layout_escaped || '%' ESCAPE '\')
            OR sp.local_name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\'
          ))
      OR (v_kz_norm_escaped != '' AND (
            gp.name ILIKE '%' || v_kz_norm_escaped || '%' ESCAPE '\'
            OR (gp.name_kz IS NOT NULL AND gp.name_kz ILIKE '%' || v_kz_norm_escaped || '%' ESCAPE '\')
          ))
      OR (length(v_normalized) >= 4 AND word_similarity(v_normalized, gp.name) >= 0.4)
      OR (length(v_normalized) >= 4 AND gp.brand IS NOT NULL AND word_similarity(v_normalized, gp.brand) >= 0.45)
      OR (length(v_layout_normalized) >= 4 AND v_layout_escaped != '' AND word_similarity(v_layout_normalized, gp.name) >= 0.4)
    );

  RETURN QUERY
  WITH candidates AS (
    SELECT
      sp.id, sp.ean, sp.local_name, sp.price_kzt,
      sp.shelf_zone, sp.shelf_position, sp.stock_status,
      gp.ean AS gp_ean, gp.alternate_eans, gp.name, gp.name_kz, gp.brand,
      gp.category, gp.subcategory, gp.quantity,
      gp.name_tsvector, gp.brand_tsvector, gp.ingredients_tsvector,
      gp.halal_status, to_jsonb(gp) AS global_products,
      FALSE AS is_category_fallback
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
        OR (v_tsquery_russian IS NOT NULL AND gp.name_tsvector @@ v_tsquery_russian)
        OR (v_tsquery_simple IS NOT NULL AND gp.name_tsvector @@ v_tsquery_simple)
        OR (v_tsquery_simple IS NOT NULL AND gp.brand_tsvector @@ v_tsquery_simple)
        OR (cardinality(v_matched_brands) > 0 AND gp.brand = ANY(v_matched_brands))
        OR sp.local_name ILIKE '%' || v_escaped || '%' ESCAPE '\'
        OR gp.name ILIKE '%' || v_escaped || '%' ESCAPE '\'
        OR (gp.name_kz IS NOT NULL AND gp.name_kz ILIKE '%' || v_escaped || '%' ESCAPE '\')
        OR (v_layout_escaped != '' AND (
              gp.name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\'
              OR (gp.name_kz IS NOT NULL AND gp.name_kz ILIKE '%' || v_layout_escaped || '%' ESCAPE '\')
              OR sp.local_name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\'
            ))
        OR (v_kz_norm_escaped != '' AND (
              gp.name ILIKE '%' || v_kz_norm_escaped || '%' ESCAPE '\'
              OR (gp.name_kz IS NOT NULL AND gp.name_kz ILIKE '%' || v_kz_norm_escaped || '%' ESCAPE '\')
            ))
        OR (length(v_normalized) >= 4 AND word_similarity(v_normalized, gp.name) >= 0.4)
        OR (length(v_normalized) >= 4 AND gp.brand IS NOT NULL AND word_similarity(v_normalized, gp.brand) >= 0.45)
        OR (length(v_layout_normalized) >= 4 AND v_layout_escaped != '' AND word_similarity(v_layout_normalized, gp.name) >= 0.4)
      )

    UNION ALL

    -- Fallback ONLY if zero text candidates matched AND user query matches a category/subcategory keyword
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
    WHERE v_text_candidate_count = 0
      AND sp.store_id = p_store_id
      AND sp.is_active = TRUE
      AND gp.is_active = TRUE
      AND sp.stock_status IS DISTINCT FROM 'out_of_stock'
      AND (
        (cardinality(v_matched_subcategories) > 0 AND gp.subcategory = ANY(v_matched_subcategories))
        OR (cardinality(v_matched_subcategories) = 0 AND cardinality(v_matched_categories) > 0 AND gp.category = ANY(v_matched_categories))
      )
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

            -- 3. Prefix match: 5000 points
            + CASE WHEN c.name ILIKE v_escaped || '%' ESCAPE '\' OR c.local_name ILIKE v_escaped || '%' ESCAPE '\' THEN 5000 ELSE 0 END
            + CASE WHEN v_layout_escaped != '' AND c.name ILIKE v_layout_escaped || '%' ESCAPE '\' THEN 4500 ELSE 0 END

            -- 4. Full-text search match (Russian): up to 4000 points
            + CASE WHEN v_tsquery_russian IS NOT NULL AND c.name_tsvector @@ v_tsquery_russian 
                   THEN 3000 + ts_rank_cd(c.name_tsvector, v_tsquery_russian) * 800 ELSE 0 END

            -- 5. Full-text search match (Simple): up to 3000 points
            + CASE WHEN v_tsquery_simple IS NOT NULL AND c.name_tsvector @@ v_tsquery_simple 
                   THEN 2200 + ts_rank_cd(c.name_tsvector, v_tsquery_simple) * 600 ELSE 0 END

            -- 6. Substring match in name or local_name: 2500 points
            + CASE WHEN c.name ILIKE '%' || v_escaped || '%' ESCAPE '\' OR c.local_name ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 2500 ELSE 0 END

            -- 7. Substring match in Kazakh name: 2500 points
            + CASE WHEN c.name_kz IS NOT NULL AND c.name_kz ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 2500 ELSE 0 END

            -- 8. Brand match: up to 2000 points
            + CASE WHEN cardinality(v_matched_brands) > 0 AND c.brand = ANY(v_matched_brands) THEN 1500 + v_brand_boost ELSE 0 END
            + CASE WHEN v_tsquery_simple IS NOT NULL AND c.brand_tsvector @@ v_tsquery_simple THEN 1500 ELSE 0 END

            -- 9. Layout converted substring: 2000 points
            + CASE WHEN v_layout_escaped != '' AND (c.name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\' OR c.local_name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\') THEN 2000 ELSE 0 END

            -- 10. Kazakh diacritics normalized substring: 2000 points
            + CASE WHEN v_kz_norm_escaped != '' AND c.name ILIKE '%' || v_kz_norm_escaped || '%' ESCAPE '\' THEN 2000 ELSE 0 END

            -- 11. Word similarity (fuzzy for typos): 600 to 1800 points
            + CASE 
                WHEN length(v_normalized) >= 4 AND word_similarity(v_normalized, c.name) >= 0.4
                THEN (600 + word_similarity(v_normalized, c.name) * 1200)::NUMERIC 
                ELSE 0 
              END

            -- 12. Category boost: +400 points
            + CASE WHEN cardinality(v_matched_categories) > 0 AND c.category = ANY(v_matched_categories) THEN 400 + least(v_category_boost, 200) ELSE 0 END

            -- 13. Quantity match boost: +300 points
            + CASE
              WHEN c.quantity IS NOT NULL AND v_query_qty.base_value IS NOT NULL
                AND EXISTS (
                  SELECT 1 FROM public.normalize_search_quantity(c.quantity) pq
                  WHERE pq.unit_type = v_query_qty.unit_type AND pq.base_value = v_query_qty.base_value
                )
              THEN 300 ELSE 0 END

            -- 14. Stock status bonus: +200 points
            + CASE WHEN c.stock_status = 'in_stock' THEN 200 ELSE 0 END

            -- 15. Halal match: +300 points
            + CASE WHEN c.halal_status = 'yes' AND (v_normalized ILIKE '%халал%' OR v_normalized ILIKE '%halal%') THEN 300 ELSE 0 END
        END
      )::NUMERIC AS search_rank,
      CASE
        WHEN c.is_category_fallback THEN 'intent_category_fallback'
        WHEN c.ean = v_query OR c.gp_ean = v_query OR coalesce(c.alternate_eans, '[]'::jsonb) ? v_query THEN 'ean_exact'
        WHEN lower(c.name) = v_normalized THEN 'name_exact'
        WHEN c.name ILIKE v_escaped || '%' ESCAPE '\' THEN 'name_prefix'
        WHEN v_layout_escaped != '' AND c.name ILIKE v_layout_escaped || '%' ESCAPE '\' THEN 'layout_prefix'
        WHEN v_tsquery_russian IS NOT NULL AND c.name_tsvector @@ v_tsquery_russian THEN 'fts_russian'
        WHEN v_tsquery_simple IS NOT NULL AND c.name_tsvector @@ v_tsquery_simple THEN 'fts_simple'
        WHEN c.name ILIKE '%' || v_escaped || '%' ESCAPE '\' THEN 'substring'
        WHEN v_layout_escaped != '' AND c.name ILIKE '%' || v_layout_escaped || '%' ESCAPE '\' THEN 'layout_converted'
        WHEN cardinality(v_matched_brands) > 0 AND c.brand = ANY(v_matched_brands) THEN 'brand_match'
        WHEN length(v_normalized) >= 4 AND word_similarity(v_normalized, c.name) >= 0.4 THEN 'fuzzy_typo'
        ELSE 'text_match'
      END AS match_type
    FROM candidates c
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
