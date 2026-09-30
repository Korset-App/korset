-- ═══════════════════════════════════════════════════════════════════════════
-- 077 — Store CRM Isolation and Catalog Publication Hardening (Этап 4)
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Создает отдельную таблицу store_private_crm для конфиденциальных B2B CRM данных
--    (owner_private_phone, owner_private_notes) с доступом ТОЛЬКО для superadmin и service_role.
-- 2. Переносит существующие CRM данные из stores и удаляет эти колонки из stores,
--    устраняя утечку конфиденциальных номеров при select('*') в клиентском StoreContext.
-- 3. Обновляет fn_admin_get_stores_with_metrics с JOIN на store_private_crm (сохраняя контракт).
-- 4. Удаляет устаревшие открытые политики stores_read_active, stores_update, sp_read, sp_write.
-- 5. Обновляет stores_read_public и store_products_read_public для строгой защиты черновиков.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. ТАБЛИЦА STORE_PRIVATE_CRM С RLS
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_private_crm (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_private_phone text,
  owner_private_notes text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.store_private_crm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_private_crm_superadmin" ON public.store_private_crm;
CREATE POLICY "store_private_crm_superadmin" ON public.store_private_crm
  FOR ALL
  TO authenticated
  USING (public.is_superadmin_user(auth.uid()))
  WITH CHECK (public.is_superadmin_user(auth.uid()));

REVOKE ALL ON TABLE public.store_private_crm FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_private_crm TO authenticated, service_role;

-- Перенос существующих данных перед удалением колонок
INSERT INTO public.store_private_crm (store_id, owner_private_phone, owner_private_notes)
SELECT id, owner_private_phone, owner_private_notes
FROM public.stores
WHERE owner_private_phone IS NOT NULL OR owner_private_notes IS NOT NULL
ON CONFLICT (store_id) DO UPDATE
  SET owner_private_phone = EXCLUDED.owner_private_phone,
      owner_private_notes = EXCLUDED.owner_private_notes,
      updated_at = now();


-- ──────────────────────────────────────────────────────────────────────────
-- 2. ОБНОВЛЕНИЕ FN_ADMIN_GET_STORES_WITH_METRICS
-- ──────────────────────────────────────────────────────────────────────────

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
    crm.owner_private_phone,
    crm.owner_private_notes,
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
  LEFT JOIN public.store_private_crm crm ON crm.store_id = s.id
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

REVOKE ALL ON FUNCTION public.fn_admin_get_stores_with_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_get_stores_with_metrics() TO authenticated, service_role;


-- ──────────────────────────────────────────────────────────────────────────
-- 3. УДАЛЕНИЕ КОНФИДЕНЦИАЛЬНЫХ КОЛОНОК ИЗ STORES
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.stores
  DROP COLUMN IF EXISTS owner_private_phone,
  DROP COLUMN IF EXISTS owner_private_notes;


-- ──────────────────────────────────────────────────────────────────────────
-- 4. УДАЛЕНИЕ УСТАРЕВШИХ ПОЛИТИК И ЗАЩИТА ЧЕРНОВИКОВ В STORES
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "stores_read_active" ON public.stores;
DROP POLICY IF EXISTS "stores_update" ON public.stores;
DROP POLICY IF EXISTS "stores_read_public" ON public.stores;

CREATE POLICY "stores_read_public" ON public.stores
  FOR SELECT
  USING (
    (is_published = true AND is_active = true)
    OR owner_id = auth.uid()
    OR public.is_superadmin_user(auth.uid())
  );


-- ──────────────────────────────────────────────────────────────────────────
-- 5. УДАЛЕНИЕ УСТАРЕВШИХ ПОЛИТИК И ЗАЩИТА ЧЕРНОВИКОВ В STORE_PRODUCTS
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "sp_read" ON public.store_products;
DROP POLICY IF EXISTS "sp_write" ON public.store_products;
DROP POLICY IF EXISTS "store_products_read_public" ON public.store_products;

CREATE POLICY "store_products_read_public" ON public.store_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_products.store_id
        AND (
          (stores.is_published = true AND stores.is_active = true AND store_products.is_active = true)
          OR stores.owner_id = auth.uid()
          OR public.is_superadmin_user(auth.uid())
        )
    )
  );

COMMIT;
