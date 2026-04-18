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
    'halal_damu',
    'npc',
    'arbuz',
    'usda'
  ));
