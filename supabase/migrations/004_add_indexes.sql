-- Migration: Add critical indexes, constraints, and schema fixes
-- Run this in Supabase SQL Editor

-- ══════════════════════════════════════════════════════════════
-- 1. Missing unique constraint on missing_products
-- Without this, upsert in resolver.js creates duplicate rows
-- ══════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_missing_products_store_ean
  ON public.missing_products (store_id, ean);

-- ══════════════════════════════════════════════════════════════
-- 2. store_products indexes
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_store_products_store_ean
  ON public.store_products (store_id, ean);

CREATE INDEX IF NOT EXISTS idx_store_products_store_active
  ON public.store_products (store_id, is_active);

CREATE INDEX IF NOT EXISTS idx_store_products_global_product
  ON public.store_products (global_product_id);

-- ══════════════════════════════════════════════════════════════
-- 3. scan_events indexes (analytics queries)
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_scan_events_ean
  ON public.scan_events (ean);

CREATE INDEX IF NOT EXISTS idx_scan_events_user_scanned
  ON public.scan_events (user_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_events_store_scanned
  ON public.scan_events (store_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_events_scanned
  ON public.scan_events (scanned_at);

-- ══════════════════════════════════════════════════════════════
-- 4. user_favorites unique constraint
-- Prevents duplicate favorites
-- ══════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_user_ean
  ON public.user_favorites (user_id, ean);

-- ══════════════════════════════════════════════════════════════
-- 5. push_subscriptions indexes
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_auth_active
  ON public.push_subscriptions (auth_user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_active
  ON public.push_subscriptions (device_id, is_active);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_store_active
  ON public.push_subscriptions (store_slug, is_active);

-- ══════════════════════════════════════════════════════════════
-- 6. notification_deliveries index
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_event
  ON public.notification_deliveries (event_id);

-- ══════════════════════════════════════════════════════════════
-- 7. product_reviews index
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_product_reviews_global_product
  ON public.product_reviews (global_product_id);

-- ══════════════════════════════════════════════════════════════
-- 8. product_matches index
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_product_matches_store_product
  ON public.product_matches (store_product_id);

-- ══════════════════════════════════════════════════════════════
-- 9. global_products indexes
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_global_products_category
  ON public.global_products (category, subcategory);

CREATE INDEX IF NOT EXISTS idx_global_products_halal
  ON public.global_products (halal_status) WHERE halal_status = 'yes';

CREATE INDEX IF NOT EXISTS idx_global_products_active_review
  ON public.global_products (is_active, needs_review);

-- ══════════════════════════════════════════════════════════════
-- 10. Fix global_products.images column syntax
-- Original: `images ARRAY DEFAULT '{}'::text[]` — invalid PostgreSQL
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'global_products'
    AND column_name = 'images' AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE public.global_products
      ALTER COLUMN images TYPE text[] USING images::text[];
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 11. FK on push_subscriptions.auth_user_id
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'push_subscriptions_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 12. product_reviews unique per user per product
-- ══════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reviews_user_product
  ON public.product_reviews (user_id, global_product_id);
