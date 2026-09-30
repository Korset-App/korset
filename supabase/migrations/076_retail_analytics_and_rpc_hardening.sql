-- ═══════════════════════════════════════════════════════════════════════════
-- 076 — Retail Analytics and RPC Hardening (Этап 3 Плана Безопасности)
-- ═══════════════════════════════════════════════════════════════════════════
-- Защищает коммерческую аналитику магазинов:
--   1. get_lost_revenue, get_unique_customers, get_scan_coverage,
--      get_top_scanned_products, get_missed_opportunities:
--      добавление проверки is_store_owner_by_id / is_superadmin_user,
--      фиксация search_path, отзыв прав EXECUTE у anon.
--   2. bulk_update_store_products, stage_unknown_eans, resolve_unknown_eans,
--      fn_admin_get_stores_with_metrics: отзыв прав EXECUTE у anon.
--   3. Фиксация search_path для normalize_search_query, normalize_search_quantity,
--      calc_data_quality_score.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. ФУНКЦИИ АНАЛИТИКИ МАГАЗИНА С ПРОВЕРКОЙ ВЛАДЕНИЯ
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_lost_revenue(p_store_id uuid, p_days_back int)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_out_of_stock numeric := 0;
  v_not_in_catalog_count bigint := 0;
  v_median_price numeric := 0;
BEGIN
  IF NOT public.is_store_owner_by_id(p_store_id) 
     AND NOT public.is_superadmin_user(auth.uid()) 
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Store owner or superadmin credentials required.';
  END IF;

  -- Часть 1: товары out_of_stock (точная цена известна)
  SELECT COALESCE(SUM(sp.price_kzt), 0)
  INTO v_out_of_stock
  FROM scan_events se
  JOIN store_products sp
    ON sp.ean = se.ean
    AND sp.store_id = se.store_id
    AND sp.is_active = true
    AND sp.price_kzt > 0
    AND sp.stock_status = 'out_of_stock'
  WHERE se.store_id = p_store_id
    AND se.scanned_at >= NOW() - (p_days_back || ' days')::interval;

  -- Часть 2: товары отсутствующие в каталоге (count distinct EAN)
  SELECT COUNT(DISTINCT se2.ean)
  INTO v_not_in_catalog_count
  FROM scan_events se2
  LEFT JOIN store_products sp2
    ON sp2.ean = se2.ean AND sp2.store_id = se2.store_id AND sp2.is_active = true
  WHERE se2.store_id = p_store_id
    AND se2.scanned_at >= NOW() - (p_days_back || ' days')::interval
    AND sp2.id IS NULL;

  -- Медианная цена каталога магазина (fallback 1500 ₸ если каталог пустой)
  SELECT COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_kzt), 1500)
  INTO v_median_price
  FROM store_products
  WHERE store_id = p_store_id
    AND is_active = true
    AND price_kzt > 0;

  RETURN v_out_of_stock + (v_not_in_catalog_count * v_median_price);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unique_customers(p_store_id uuid, p_days_back integer)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_store_owner_by_id(p_store_id) 
     AND NOT public.is_superadmin_user(auth.uid()) 
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Store owner or superadmin credentials required.';
  END IF;

  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM scan_events
    WHERE store_id = p_store_id
      AND scanned_at >= NOW() - (p_days_back || ' days')::interval
      AND user_id IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_scan_coverage(p_store_id uuid, p_days_back integer)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total bigint;
  v_found bigint;
BEGIN
  IF NOT public.is_store_owner_by_id(p_store_id) 
     AND NOT public.is_superadmin_user(auth.uid()) 
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Store owner or superadmin credentials required.';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM scan_events
  WHERE store_id = p_store_id
    AND scanned_at >= NOW() - (p_days_back || ' days')::interval;

  IF v_total = 0 THEN RETURN 0; END IF;

  SELECT COUNT(se.id) INTO v_found
  FROM scan_events se
  JOIN store_products sp
    ON sp.ean = se.ean
    AND sp.store_id = se.store_id
    AND sp.is_active = true
    AND sp.stock_status != 'out_of_stock'
  WHERE se.store_id = p_store_id
    AND se.scanned_at >= NOW() - (p_days_back || ' days')::interval;

  RETURN ROUND((v_found::numeric / v_total::numeric) * 100, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_scanned_products(
  p_store_id uuid,
  p_days_back integer DEFAULT 30,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  ean text,
  scan_count bigint,
  name text,
  image_url text,
  price_kzt integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_store_owner_by_id(p_store_id) 
     AND NOT public.is_superadmin_user(auth.uid()) 
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Store owner or superadmin credentials required.';
  END IF;

  RETURN QUERY
  SELECT
    se.ean,
    count(*)::bigint AS scan_count,
    g.name,
    g.image_url,
    sp.price_kzt
  FROM public.scan_events se
  LEFT JOIN public.global_products g ON g.id = se.global_product_id AND g.is_active = true
  LEFT JOIN public.store_products sp ON sp.ean = se.ean AND sp.store_id = se.store_id AND sp.is_active = true
  WHERE se.store_id = p_store_id
    AND se.scanned_at >= now() - (p_days_back || ' days')::interval
  GROUP BY se.ean, g.name, g.image_url, sp.price_kzt
  ORDER BY scan_count DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_missed_opportunities(
  p_store_id uuid,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  ean text,
  scan_count bigint,
  name text,
  image_url text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_store_owner_by_id(p_store_id) 
     AND NOT public.is_superadmin_user(auth.uid()) 
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Store owner or superadmin credentials required.';
  END IF;

  RETURN QUERY
  SELECT
    se.ean,
    COUNT(se.id)::bigint AS scan_count,
    gp.name,
    gp.image_url,
    CASE
      WHEN sp.id IS NULL THEN 'not_in_catalog'
      ELSE 'out_of_stock'
    END AS reason
  FROM scan_events se
  LEFT JOIN global_products gp ON gp.ean = se.ean
  LEFT JOIN store_products sp
    ON sp.store_id = p_store_id
    AND sp.ean = se.ean
    AND sp.is_active = true
  WHERE se.store_id = p_store_id
    AND se.scanned_at >= NOW() - (p_days_back || ' days')::interval
    AND (sp.id IS NULL OR sp.stock_status = 'out_of_stock')
  GROUP BY se.ean, gp.name, gp.image_url, sp.id, sp.stock_status
  ORDER BY scan_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_missed_opportunities(
  p_store_id uuid,
  p_days_back integer DEFAULT 30,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  ean text,
  miss_count bigint,
  name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_store_owner_by_id(p_store_id) 
     AND NOT public.is_superadmin_user(auth.uid()) 
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Store owner or superadmin credentials required.';
  END IF;

  RETURN QUERY
  SELECT
    se.ean,
    count(*)::bigint AS miss_count,
    g.name
  FROM public.scan_events se
  LEFT JOIN public.global_products g ON g.id = se.global_product_id AND g.is_active = true
  LEFT JOIN public.store_products sp ON sp.ean = se.ean AND sp.store_id = se.store_id AND sp.is_active = true
  WHERE se.store_id = p_store_id
    AND se.scanned_at >= now() - (p_days_back || ' days')::interval
    AND (sp.id IS NULL OR sp.stock_status = 'out_of_stock')
  GROUP BY se.ean, g.name
  ORDER BY miss_count DESC
  LIMIT p_limit;
END;
$$;


-- ──────────────────────────────────────────────────────────────────────────
-- 2. ФИКС SEARCH_PATH ДЛЯ ОСТАЛЬНЫХ ФУНКЦИЙ
-- ──────────────────────────────────────────────────────────────────────────

ALTER FUNCTION public.calc_data_quality_score(public.global_products) SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_search_quantity(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_search_query(text) SET search_path = public, pg_temp;


-- ──────────────────────────────────────────────────────────────────────────
-- 3. ОТЗЫВ ПРАВ НА ВЫЗОВ RPC У АНОНИМОВ
-- ──────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_lost_revenue(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lost_revenue(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_unique_customers(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unique_customers(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_scan_coverage(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_scan_coverage(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_top_scanned_products(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_top_scanned_products(uuid, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_missed_opportunities(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_missed_opportunities(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_missed_opportunities(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_missed_opportunities(uuid, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.bulk_update_store_products(uuid, text[], integer[], text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_store_products(uuid, text[], integer[], text[], text[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolve_unknown_eans(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_unknown_eans(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.stage_unknown_eans(uuid, text[], text[], integer[], text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stage_unknown_eans(uuid, text[], text[], integer[], text[], text[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_admin_get_stores_with_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_stores_with_metrics() TO authenticated, service_role;

COMMIT;
