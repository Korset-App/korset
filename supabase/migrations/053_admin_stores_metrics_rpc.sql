-- ═══════════════════════════════════════════════════════════════════════════════
-- 053 — admin_stores_metrics_rpc: Create store metrics aggregation function
-- ═══════════════════════════════════════════════════════════════════════════════
-- Creates fn_admin_get_stores_with_metrics which fetches all stores along with
-- computed counts for catalog size, total scans, and unresolved corrections (EAN recovery).
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_admin_get_stores_with_metrics()
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  code TEXT,
  name TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  type TEXT,
  plan TEXT,
  plan_expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  notify_oos_enabled BOOLEAN,
  notify_daily_enabled BOOLEAN,
  description TEXT,
  logo_url TEXT,
  short_description TEXT,
  instagram_url TEXT,
  whatsapp_number TEXT,
  twogis_url TEXT,
  website_url TEXT,
  ai_store_notes TEXT,
  opening_hours TEXT,
  catalog_count BIGINT,
  scan_count BIGINT,
  ean_recovery_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.owner_id,
    s.code,
    s.name,
    s.city,
    s.address,
    s.phone,
    s.email,
    s.type,
    s.plan,
    s.plan_expires_at,
    s.is_active,
    s.created_at,
    s.updated_at,
    s.notify_oos_enabled,
    s.notify_daily_enabled,
    s.description,
    s.logo_url,
    s.short_description,
    s.instagram_url,
    s.whatsapp_number,
    s.twogis_url,
    s.website_url,
    s.ai_store_notes,
    s.opening_hours,
    COALESCE(sp.cnt, 0)::BIGINT as catalog_count,
    COALESCE(se.cnt, 0)::BIGINT as scan_count,
    COALESCE(pc.cnt, 0)::BIGINT as ean_recovery_count
  FROM public.stores s
  LEFT JOIN (
    SELECT store_id, COUNT(*) as cnt 
    FROM public.store_products 
    GROUP BY store_id
  ) sp ON sp.store_id = s.id
  LEFT JOIN (
    SELECT store_id, COUNT(*) as cnt 
    FROM public.scan_events 
    GROUP BY store_id
  ) se ON se.store_id = s.id
  LEFT JOIN (
    SELECT store_id, COUNT(*) as cnt 
    FROM public.product_correction_events 
    WHERE status IN ('new', 'reviewing') 
    GROUP BY store_id
  ) pc ON pc.store_id = s.id
  ORDER BY s.created_at DESC;
END;
$$;

-- Grant execute rights to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.fn_admin_get_stores_with_metrics() TO authenticated, service_role;

COMMIT;
