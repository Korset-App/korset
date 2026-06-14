-- ═══════════════════════════════════════════════════════════════════════════════
-- 054 — store_publication_and_metadata: Add publication and CRM columns
-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds is_published, owner_private_phone, owner_private_notes to stores.
-- Sets RLS draft mode security and updates catalog & admin RPC metrics functions.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. ADD COLUMNS TO STORES
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS owner_private_phone text,
  ADD COLUMN IF NOT EXISTS owner_private_notes text;

COMMENT ON COLUMN public.stores.is_published IS
  'Visibility flag. If false, only store owners and superadmins can view.';
COMMENT ON COLUMN public.stores.owner_private_phone IS
  'Confidential owner phone number, visible only to superadmins (B2B CRM).';
COMMENT ON COLUMN public.stores.owner_private_notes IS
  'Private notes about the B2B store agreement, visible only to superadmins.';

-- ──────────────────────────────────────────────────────────────────────────
-- 2. UPDATE ROW LEVEL SECURITY (RLS) POLICIES
-- ──────────────────────────────────────────────────────────────────────────

-- Modify stores RLS to hide draft stores from non-owners/non-superadmins
DROP POLICY IF EXISTS "stores_read_public" ON public.stores;
CREATE POLICY "stores_read_public" ON public.stores
  FOR SELECT
  USING (
    is_published = true
    OR owner_id = auth.uid()
    OR public.is_superadmin_user(auth.uid())
  );

-- Modify store_products RLS to hide draft store products
DROP POLICY IF EXISTS "store_products_read_public" ON public.store_products;
CREATE POLICY "store_products_read_public" ON public.store_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = store_products.store_id
        AND (
          is_published = true
          OR owner_id = auth.uid()
          OR public.is_superadmin_user(auth.uid())
        )
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 3. UPDATE fn_get_store_catalog RPC FUNCTION
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_store_catalog(
  p_store_id UUID
)
RETURNS TABLE (
  ean           TEXT,
  gp_ean        TEXT,
  local_name    TEXT,
  price_kzt     INTEGER,
  shelf_zone    TEXT,
  stock_status  TEXT,
  store_product_id  UUID,
  global_product_id UUID,
  name          TEXT,
  name_kz       TEXT,
  brand         TEXT,
  category      TEXT,
  subcategory   TEXT,
  quantity      TEXT,
  image_url     TEXT,
  allergens_json    JSONB,
  diet_tags_json    JSONB,
  halal_status  TEXT,
  packaging_type TEXT,
  fat_percent   NUMERIC,
  nutriscore    TEXT,
  product_group TEXT,
  alternate_eans JSONB,
  ingredients_raw TEXT,
  nutriments_json JSONB,
  traces_json    JSONB
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    sp.ean,
    gp.ean              AS gp_ean,
    sp.local_name,
    sp.price_kzt,
    sp.shelf_zone,
    sp.stock_status,
    sp.id               AS store_product_id,
    gp.id               AS global_product_id,
    gp.name,
    gp.name_kz,
    gp.brand,
    gp.category,
    gp.subcategory,
    gp.quantity,
    gp.image_url,
    gp.allergens_json,
    gp.diet_tags_json,
    gp.halal_status,
    gp.packaging_type,
    gp.fat_percent,
    gp.nutriscore,
    gp."group"          AS product_group,
    gp.alternate_eans,
    gp.ingredients_raw,
    gp.nutriments_json,
    gp.traces_json
  FROM public.store_products sp
  JOIN public.global_products gp ON gp.id = sp.global_product_id
  WHERE sp.store_id    = p_store_id
    AND sp.is_active   = TRUE
    AND gp.is_active   = TRUE
    AND sp.stock_status IS DISTINCT FROM 'out_of_stock'
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = p_store_id
        AND (
          is_published = true
          OR owner_id = auth.uid()
          OR public.is_superadmin_user(auth.uid())
        )
    )
  ORDER BY gp.category NULLS LAST, gp.name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_store_catalog(UUID) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. UPDATE fn_admin_get_stores_with_metrics RPC FUNCTION (WITH SECURITY GUARD)
-- ──────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_admin_get_stores_with_metrics();

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
  is_published BOOLEAN,
  owner_private_phone TEXT,
  owner_private_notes TEXT,
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
  -- Security guard: verify that client has superadmin status or is service_role
  IF NOT public.is_superadmin_user(auth.uid()) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Superadmin credentials required.';
  END IF;

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
    s.is_published,
    s.owner_private_phone,
    s.owner_private_notes,
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

GRANT EXECUTE ON FUNCTION public.fn_admin_get_stores_with_metrics() TO authenticated, service_role;

COMMIT;
