-- Migration: Enable Row Level Security on all tables
-- Run this in Supabase SQL Editor
-- CRITICAL: Without RLS, anyone with the anon key has full CRUD on all tables

-- ══════════════════════════════════════════════════════════════
-- Helper: check if current user is owner of a store
-- Used by store_products, scan_events, missing_products policies
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_store_owner(store_row public.stores)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT store_row.owner_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_store_owner_by_id(check_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = check_store_id AND owner_id = auth.uid()
  );
$$;

-- ══════════════════════════════════════════════════════════════
-- 1. users
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT TO authenticated USING (auth_id = auth.uid());

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth_id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- service_role has full access (implicit, no policy needed — bypasses RLS)

-- ══════════════════════════════════════════════════════════════
-- 2. stores
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_read_public" ON public.stores
  FOR SELECT USING (true);

CREATE POLICY "stores_update_owner" ON public.stores
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "stores_delete_owner" ON public.stores
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- 3. store_products
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_products_read_public" ON public.store_products
  FOR SELECT USING (true);

CREATE POLICY "store_products_insert_owner" ON public.store_products
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_products.store_id AND owner_id = auth.uid())
  );

CREATE POLICY "store_products_update_owner" ON public.store_products
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_products.store_id AND owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_products.store_id AND owner_id = auth.uid())
  );

CREATE POLICY "store_products_delete_owner" ON public.store_products
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_products.store_id AND owner_id = auth.uid())
  );

-- ══════════════════════════════════════════════════════════════
-- 4. global_products
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.global_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_products_read_public" ON public.global_products
  FOR SELECT USING (true);

-- Write only via service_role (admin pipeline, enrichment scripts)

-- ══════════════════════════════════════════════════════════════
-- 5. scan_events
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scan_events_insert_authenticated" ON public.scan_events
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id IN (
    SELECT id FROM public.users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "scan_events_insert_anon" ON public.scan_events
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

CREATE POLICY "scan_events_read_own" ON public.scan_events
  FOR SELECT TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "scan_events_read_owner" ON public.scan_events
  FOR SELECT TO authenticated USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

-- No UPDATE or DELETE for non-service roles

-- ══════════════════════════════════════════════════════════════
-- 6. user_favorites
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_favorites_read_own" ON public.user_favorites
  FOR SELECT TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "user_favorites_insert_own" ON public.user_favorites
  FOR INSERT TO authenticated WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "user_favorites_update_own" ON public.user_favorites
  FOR UPDATE TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  ) WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "user_favorites_delete_own" ON public.user_favorites
  FOR DELETE TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ══════════════════════════════════════════════════════════════
-- 7. product_reviews
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_reviews_read_public" ON public.product_reviews
  FOR SELECT USING (true);

CREATE POLICY "product_reviews_insert_authenticated" ON public.product_reviews
  FOR INSERT TO authenticated WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "product_reviews_update_own" ON public.product_reviews
  FOR UPDATE TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  ) WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "product_reviews_delete_own" ON public.product_reviews
  FOR DELETE TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ══════════════════════════════════════════════════════════════
-- 8. missing_products
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.missing_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "missing_products_insert_authenticated" ON public.missing_products
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "missing_products_insert_anon" ON public.missing_products
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "missing_products_read_owner" ON public.missing_products
  FOR SELECT TO authenticated USING (
    store_id IS NULL OR store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

-- No UPDATE or DELETE for non-service roles

-- ══════════════════════════════════════════════════════════════
-- 9. push_subscriptions
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_read_own" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth_user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- 10. notification_events
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_events_read_owner" ON public.notification_events
  FOR SELECT TO authenticated USING (
    meta->>'store_id' IN (
      SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- Write only via service_role (push pipeline)

-- ══════════════════════════════════════════════════════════════
-- 11. notification_deliveries
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Read/write only via service_role (internal tracking)

-- ══════════════════════════════════════════════════════════════
-- 12. product_matches
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.product_matches ENABLE ROW LEVEL SECURITY;

-- Read/write only via service_role (matching pipeline)

-- ══════════════════════════════════════════════════════════════
-- 13. external_product_cache
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.external_product_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_product_cache_read_public" ON public.external_product_cache
  FOR SELECT USING (true);

-- Write only via service_role (OFF fetch pipeline)
