-- 033 — product alternatives RPC
-- Returns same-store alternatives for a source product with scenario-aware base ranking.
-- Security: default SECURITY INVOKER, so table RLS continues to apply to anon/authenticated callers.

BEGIN;

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
      AND (
        sp.ean = p_ean
        OR gp.ean = p_ean
        OR coalesce(gp.alternate_eans, '[]'::jsonb) ? p_ean
      )
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
