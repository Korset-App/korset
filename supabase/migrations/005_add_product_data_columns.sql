-- Migration 005: Add product data columns for full product cards
-- Required for: Data Moat strategy, EAN-DB import, Kaspi enrichment, 1С import

-- ══════════════════════════════════════════════════════════════
-- 1. global_products — new columns
-- ══════════════════════════════════════════════════════════════

-- AI description (was generated but never persisted)
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS description text;

-- Structured E-additives (replaces fragile regex on ingredients_raw)
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS additives_tags_json jsonb DEFAULT '[]'::jsonb;

-- Trace allergens from OFF (traces_tags) — critical for celiac/severe allergy
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS traces_json jsonb DEFAULT '[]'::jsonb;

-- Alcohol content — CRITICAL for halal determination
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS alcohol_100g numeric;

-- Saturated fat for cardiovascular diet checks
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS saturated_fat_100g numeric;

-- Ultra-processing level (1=unprocessed, 4=ultra-processed)
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS nova_group smallint CHECK (nova_group >= 1 AND nova_group <= 4);

-- Photo of ingredients label (helps user trust + OCR fallback)
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS image_ingredients_url text;

-- Photo of nutrition table
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS image_nutrition_url text;

-- Structured category tags from OFF (better than free-text category)
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS categories_tags_json jsonb DEFAULT '[]'::jsonb;

-- Tags for search/alternatives grouping
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS tags_json jsonb DEFAULT '[]'::jsonb;

-- Group key for alternatives engine (e.g. 'chocolate_bar', 'cola')
ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS "group" text;

-- ══════════════════════════════════════════════════════════════
-- 2. Expand source_primary CHECK — add new sources
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.global_products
  DROP CONSTRAINT IF EXISTS global_products_source_primary_check;

ALTER TABLE public.global_products
  ADD CONSTRAINT global_products_source_primary_check
  CHECK (source_primary IN (
    'manual',
    'openfoodfacts',
    'store_import',
    'ai_enriched',
    'eandb',
    'kz_verified',
    'kaspi',
    'halal_damu'
  ));

-- ══════════════════════════════════════════════════════════════
-- 3. external_product_cache — add missing columns
-- ══════════════════════════════════════════════════════════════

-- Description from AI enrichment (was lost on cache save)
ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS normalized_description text;

-- E-additives from OFF
ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS normalized_additives_tags_json jsonb DEFAULT '[]'::jsonb;

-- Trace allergens from OFF
ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS normalized_traces_json jsonb DEFAULT '[]'::jsonb;

-- Category from OFF
ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS normalized_category text;

-- Quantity from OFF
ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS normalized_quantity text;

-- Nova group from OFF
ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS nova_group smallint CHECK (nova_group >= 1 AND nova_group <= 4);

-- TTL for cache invalidation
ALTER TABLE public.external_product_cache
  ADD COLUMN IF NOT EXISTS ttl_expires_at timestamp with time zone;

-- Expand source CHECK
ALTER TABLE public.external_product_cache
  DROP CONSTRAINT IF EXISTS external_product_cache_source_check;

ALTER TABLE public.external_product_cache
  ADD CONSTRAINT external_product_cache_source_check
  CHECK (source IN (
    'openfoodfacts',
    'kazfood',
    'manual',
    'eandb',
    'kaspi'
  ));

-- ══════════════════════════════════════════════════════════════
-- 4. store_products — add unit pricing for weight-based items
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS unit_type text
  CHECK (unit_type IN ('piece', 'kg', 'liter', '100g'));

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS price_per_unit_kzt integer CHECK (price_per_unit_kzt >= 0);

-- Prevent duplicate store_products (same store + same EAN)
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_unique_ean
  ON public.store_products (store_id, ean);

-- ══════════════════════════════════════════════════════════════
-- 5. GIN indexes for JSONB columns (fast search)
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_global_products_allergens_gin
  ON public.global_products USING gin (allergens_json);

CREATE INDEX IF NOT EXISTS idx_global_products_diet_tags_gin
  ON public.global_products USING gin (diet_tags_json);

CREATE INDEX IF NOT EXISTS idx_global_products_additives_gin
  ON public.global_products USING gin (additives_tags_json);

CREATE INDEX IF NOT EXISTS idx_global_products_traces_gin
  ON public.global_products USING gin (traces_json);

CREATE INDEX IF NOT EXISTS idx_global_products_categories_gin
  ON public.global_products USING gin (categories_tags_json);

CREATE INDEX IF NOT EXISTS idx_global_products_tags_gin
  ON public.global_products USING gin (tags_json);

CREATE INDEX IF NOT EXISTS idx_global_products_nutriments_gin
  ON public.global_products USING gin (nutriments_json);

-- ══════════════════════════════════════════════════════════════
-- 6. updated_at auto-trigger for global_products
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.global_products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.global_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.store_products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.external_product_cache;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.external_product_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ══════════════════════════════════════════════════════════════
-- 7. ON DELETE CASCADE for store_products → global_products
-- ══════════════════════════════════════════════════════════════

-- When a store is deleted, delete its store_products
ALTER TABLE public.store_products
  DROP CONSTRAINT IF EXISTS store_products_store_id_fkey;

ALTER TABLE public.store_products
  ADD CONSTRAINT store_products_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.stores(id)
  ON DELETE CASCADE;

-- When a global_product is deleted, unlink store_products (keep them orphaned)
ALTER TABLE public.store_products
  DROP CONSTRAINT IF EXISTS store_products_global_product_id_fkey;

ALTER TABLE public.store_products
  ADD CONSTRAINT store_products_global_product_id_fkey
  FOREIGN KEY (global_product_id) REFERENCES public.global_products(id)
  ON DELETE SET NULL;
