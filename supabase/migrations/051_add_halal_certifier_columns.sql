-- Migration 051: Add halal_certifier, halal_notes, cooking and storage attributes

ALTER TABLE public.clean_products_v2
  ADD COLUMN IF NOT EXISTS halal_certifier TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS halal_notes TEXT DEFAULT NULL;

ALTER TABLE public.global_products
  ADD COLUMN IF NOT EXISTS halal_certifier TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS halal_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cooking_instructions TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storage_conditions TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shelf_life TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_clean_products_v2_halal_certifier ON public.clean_products_v2(halal_certifier);
CREATE INDEX IF NOT EXISTS idx_global_products_halal_certifier ON public.global_products(halal_certifier);
