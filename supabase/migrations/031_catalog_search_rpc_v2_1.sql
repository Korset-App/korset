-- ═══════════════════════════════════════════════════════════════════════════════
-- 031 — catalog search RPC v2.1: quantity normalization, category lookup table,
--       token-level matching, and index recommendations
-- ═══════════════════════════════════════════════════════════════════════════════
-- Upgrades v2 (migration 030) with:
--   1. normalize_search_quantity() — converts 1л↔1000мл, 1кг↔1000г
--   2. search_category_keywords lookup table synced with categoryMap.js NAME_KEYWORDS
--   3. Token-level word_similarity for order-independent matching
--   4. Index recommendations for performance
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

SET LOCAL search_path = public, extensions, pg_temp;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Quantity normalization helper
--    Extracts quantity from text and normalizes to base units:
--      1л   → 1000 ml (volume)
--      1кг  → 1000 g  (weight)
--      500г → 500 g   (weight)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.normalize_search_quantity(p_text TEXT)
RETURNS TABLE (base_value NUMERIC, unit_type TEXT)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  WITH extracted AS (
    SELECT (regexp_matches(
      coalesce(p_text, ''),
      '(\d+[.,]?\d*)\s*(мл|л|гр|г|кг|ml|l|g|kg)',
      'i'
    )) AS m
    LIMIT 1
  )
  SELECT
    CASE
      WHEN lower(m[2]) IN ('л', 'l') THEN (replace(m[1], ',', '.')::NUMERIC) * 1000
      WHEN lower(m[2]) IN ('кг', 'kg') THEN (replace(m[1], ',', '.')::NUMERIC) * 1000
      ELSE replace(m[1], ',', '.')::NUMERIC
    END,
    CASE
      WHEN lower(m[2]) IN ('мл', 'л', 'ml', 'l') THEN 'volume'
      WHEN lower(m[2]) IN ('г', 'гр', 'кг', 'g', 'kg') THEN 'weight'
      ELSE 'other'
    END
  FROM extracted
  WHERE m IS NOT NULL;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Category keywords lookup table
--    Synced with src/domain/product/categoryMap.js NAME_KEYWORDS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.search_category_keywords (
  keyword TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  intent_boost NUMERIC DEFAULT 400,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.search_category_keywords TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_search_category_keywords_category
  ON public.search_category_keywords (category);

-- Populate with core grocery keywords (mirrors categoryMap.js NAME_KEYWORDS)
INSERT INTO public.search_category_keywords (keyword, category, subcategory, intent_boost)
VALUES
  -- dairy_eggs
  ('молок', 'dairy_eggs', 'milk', 500),
  ('кефир', 'dairy_eggs', 'fermented', 400),
  ('ряженк', 'dairy_eggs', 'fermented', 400),
  ('йогурт', 'dairy_eggs', 'fermented', 400),
  ('снежок', 'dairy_eggs', 'fermented', 400),
  ('кумыс', 'dairy_eggs', 'fermented', 400),
  ('тан ', 'dairy_eggs', 'fermented', 400),
  ('айран', 'dairy_eggs', 'fermented', 400),
  ('курт', 'dairy_eggs', 'fermented', 400),
  ('сыр ', 'dairy_eggs', 'cheese', 500),
  ('сырок', 'dairy_eggs', 'cottage', 400),
  ('творог', 'dairy_eggs', 'cottage', 500),
  ('сметан', 'dairy_eggs', 'cream', 400),
  ('сливк', 'dairy_eggs', 'cream', 400),
  ('сливочное масло', 'dairy_eggs', 'butter', 500),
  ('масло сливочное', 'dairy_eggs', 'butter', 500),
  ('сгущенк', 'dairy_eggs', 'condensed_milk', 400),
  ('сгущёнк', 'dairy_eggs', 'condensed_milk', 400),
  ('яйц', 'dairy_eggs', 'eggs', 400),
  ('спред', 'dairy_eggs', 'spread', 400),
  ('маргарин', 'dairy_eggs', 'spread', 400),
  -- sweets
  ('шоколад', 'sweets', 'chocolate', 500),
  ('chocolate', 'sweets', 'chocolate', 500),
  ('печенье', 'sweets', 'cookies', 400),
  ('крекер', 'sweets', 'cookies', 400),
  ('пряник', 'sweets', 'cookies', 400),
  ('вафл', 'sweets', 'pastries', 400),
  ('конфет', 'sweets', 'candy', 400),
  ('карамел', 'sweets', 'candy', 400),
  ('мармелад', 'sweets', 'candy', 400),
  ('зефир', 'sweets', 'candy', 400),
  ('халв', 'sweets', 'halva', 400),
  ('козинак', 'sweets', 'halva', 400),
  ('рахат-лукум', 'sweets', 'halva', 400),
  ('щербет', 'sweets', 'halva', 400),
  ('чак-чак', 'sweets', 'halva', 400),
  ('мёд', 'sweets', 'honey_jam', 400),
  ('варень', 'sweets', 'honey_jam', 400),
  ('джем', 'sweets', 'honey_jam', 400),
  -- water_beverages
  ('сок', 'water_beverages', 'juice', 500),
  ('нектар', 'water_beverages', 'juice', 400),
  ('вода', 'water_beverages', 'water', 500),
  ('газировк', 'water_beverages', 'soda', 400),
  ('лимонад', 'water_beverages', 'lemonade', 400),
  ('квас', 'water_beverages', 'lemonade', 400),
  ('комбуч', 'water_beverages', 'lemonade', 400),
  ('энергетик', 'water_beverages', 'energy', 400),
  ('кисель', 'water_beverages', 'lemonade', 400),
  ('компот', 'water_beverages', 'lemonade', 400),
  ('морс', 'water_beverages', 'lemonade', 400),
  ('coca-cola', 'water_beverages', 'soda', 400),
  ('coca cola', 'water_beverages', 'soda', 400),
  ('pepsi', 'water_beverages', 'soda', 400),
  ('fanta', 'water_beverages', 'soda', 400),
  ('sprite', 'water_beverages', 'soda', 400),
  -- tea_coffee
  ('чай', 'tea_coffee', 'tea', 500),
  ('кофе', 'tea_coffee', 'coffee', 500),
  -- snacks
  ('чипс', 'snacks', 'chips', 500),
  ('доритос', 'snacks', 'chips', 400),
  ('chips', 'snacks', 'chips', 400),
  ('сухарик', 'snacks', 'crackers', 400),
  ('орех', 'snacks', 'nuts', 400),
  ('арахис', 'snacks', 'nuts', 400),
  ('миндаль', 'snacks', 'nuts', 400),
  -- grocery
  ('гречк', 'grocery', 'cereals', 400),
  ('рис', 'grocery', 'rice', 400),
  ('макарон', 'grocery', 'pasta', 400),
  ('спагетти', 'grocery', 'pasta', 400),
  ('паста', 'grocery', 'pasta', 400),
  ('pasta', 'grocery', 'pasta', 400),
  ('мук', 'grocery', 'flour', 400),
  ('сахар', 'grocery', 'sugar', 400),
  ('соль', 'grocery', 'salt', 400),
  ('масло подсолнеч', 'grocery', 'cooking_oil', 500),
  ('оливковое масло', 'grocery', 'cooking_oil', 500),
  ('растительное масло', 'grocery', 'cooking_oil', 500),
  -- frozen
  ('пельмен', 'frozen', 'semi_finished', 400),
  ('вареник', 'frozen', 'semi_finished', 400),
  ('наггетс', 'frozen', 'semi_finished', 400),
  ('котлет', 'frozen', 'semi_finished', 400),
  ('морожен', 'frozen', 'ice_cream', 500),
  ('пломбир', 'frozen', 'ice_cream', 400),
  ('эскимо', 'frozen', 'ice_cream', 400),
  -- deli
  ('колбас', 'deli', 'sausage', 500),
  ('сосиск', 'deli', 'sausage', 400),
  ('сардельк', 'deli', 'sausage', 400),
  ('шпикачк', 'deli', 'sausage', 400),
  ('паштет', 'deli', 'pate', 400),
  ('ветчин', 'deli', 'deli_meat', 400),
  ('балык', 'deli', 'deli_meat', 400),
  ('нарезк', 'deli', 'deli_meat', 400),
  ('салями', 'deli', 'smoked', 400),
  ('копчён', 'deli', 'smoked', 400),
  ('копчен', 'deli', 'smoked', 400),
  ('тушёнк', 'deli', 'canned_meat', 400),
  ('тушенк', 'deli', 'canned_meat', 400),
  ('мясные консерв', 'deli', 'canned_meat', 400),
  -- fish
  ('рыб', 'fish', 'fish', 500),
  ('креветк', 'fish', 'seafood', 400),
  ('кальмар', 'fish', 'seafood', 400),
  ('миди', 'fish', 'seafood', 400),
  ('крабов', 'fish', 'seafood', 400),
  ('морепродукт', 'fish', 'seafood', 400),
  ('икр', 'fish', 'seafood', 400),
  ('нори', 'fish', 'seafood', 400),
  ('тунец', 'fish', 'canned_fish', 400),
  ('сайр', 'fish', 'canned_fish', 400),
  ('сардин', 'fish', 'canned_fish', 400),
  -- meat
  ('куриц', 'meat', 'poultry', 400),
  ('индейк', 'meat', 'poultry', 400),
  ('говядин', 'meat', 'beef', 400),
  ('свинин', 'meat', 'pork', 400),
  ('баранин', 'meat', 'lamb', 400),
  -- healthy / attributes
  ('без сахар', 'healthy', 'sugar_free', 300),
  ('сахарозаменитель', 'healthy', 'sugar_free', 300),
  ('без глютен', 'healthy', 'gluten_free', 300),
  ('безглютен', 'healthy', 'gluten_free', 300),
  ('протеин', 'healthy', 'protein', 300),
  ('белковый батончик', 'healthy', 'protein', 300)
ON CONFLICT (keyword) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Update RPC v2 → v2.1
--    - Uses lookup table for category intent boost
--    - Uses normalize_search_quantity for 1л↔1000мл, 1кг↔1000г
--    - Adds per-token word_similarity for order-independent matching
-- ═══════════════════════════════════════════════════════════════════════════════

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
  WITH
    -- Tokenize query for per-token matching
    query_tokens AS (
      SELECT t AS token
      FROM unnest(string_to_array(v_normalized, ' ')) AS t
      WHERE length(t) >= 3
    ),
    matched AS (
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
          -- Token-level word_similarity boost (order-independent)
          CASE
            WHEN EXISTS (
              SELECT 1 FROM query_tokens qt
              WHERE EXISTS (
                SELECT 1 FROM unnest(string_to_array(coalesce(gp.name, ''), ' ')) AS pt
                WHERE length(pt) >= 3 AND word_similarity(qt.token, pt) >= 0.35
              )
            ) THEN 140
            ELSE 0
          END,
          -- Category / subcategory intent boost via lookup table
          COALESCE(ck.intent_boost, 0),
          -- Brand + product combo boost
          CASE
            WHEN gp.brand ILIKE '%' || split_part(v_query, ' ', 1) || '%'
              AND (gp.name_tsvector @@ v_tsquery_russian OR gp.name_tsvector @@ v_tsquery_simple)
              THEN 250
            ELSE 0
          END,
          -- Quantity regex boost with normalization (1л ↔ 1000мл, 1кг ↔ 1000г)
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
          WHEN EXISTS (
            SELECT 1 FROM query_tokens qt
            WHERE EXISTS (
              SELECT 1 FROM unnest(string_to_array(coalesce(gp.name, ''), ' ')) AS pt
              WHERE length(pt) >= 3 AND word_similarity(qt.token, pt) >= 0.35
            )
          ) THEN 'word_match'
          ELSE 'unknown'
        END AS match_type
      FROM public.store_products sp
      JOIN public.global_products gp ON gp.id = sp.global_product_id
      LEFT JOIN public.search_category_keywords ck
        ON gp.category = ck.category
        AND v_normalized ILIKE '%' || ck.keyword || '%'
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

GRANT EXECUTE ON FUNCTION public.normalize_search_quantity(TEXT)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_search_store_products(UUID, TEXT, INTEGER, INTEGER)
  TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Performance index recommendations
--    Apply these IF EXPLAIN ANALYZE shows seq scans or high latency.
-- ═══════════════════════════════════════════════════════════════════════════════

-- GIN trigram index on product name for faster ILIKE/substring matching
-- (only if catalog has >5000 active products and query latency >200ms)
-- CREATE INDEX IF NOT EXISTS idx_gp_name_trgm
--   ON public.global_products USING gin (name gin_trgm_ops)
--   WHERE is_active = true;

-- GIN trigram index on product name_kz
-- CREATE INDEX IF NOT EXISTS idx_gp_name_kz_trgm
--   ON public.global_products USING gin (name_kz gin_trgm_ops)
--   WHERE is_active = true;

-- GIN trigram index on local_name
-- CREATE INDEX IF NOT EXISTS idx_sp_local_name_trgm
--   ON public.store_products USING gin (local_name gin_trgm_ops)
--   WHERE is_active = true;

COMMIT;
