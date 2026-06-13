-- 048 - Product correction events
-- Stage 5A of the product EAN integrity recovery plan.
-- Metadata-only shopper/admin reports about wrong product identity or product facts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_correction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean text NOT NULL,
  shown_ean text,
  shown_global_product_id uuid REFERENCES public.global_products(id) ON DELETE SET NULL,
  shown_store_product_id uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  reason text NOT NULL,
  context text NOT NULL DEFAULT 'product_card',
  comment text,
  client_token uuid NOT NULL,
  status text NOT NULL DEFAULT 'new',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by_auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_correction_events_ean_check
    CHECK (ean ~ '^\d{8,14}$'),
  CONSTRAINT product_correction_events_shown_ean_check
    CHECK (shown_ean IS NULL OR shown_ean ~ '^\d{8,14}$'),
  CONSTRAINT product_correction_events_reason_check
    CHECK (reason IN (
      'wrong_product',
      'wrong_weight_or_volume',
      'wrong_fat_percent',
      'wrong_flavor',
      'wrong_package',
      'wrong_brand',
      'wrong_price',
      'wrong_stock',
      'wrong_ingredients',
      'wrong_allergens',
      'wrong_halal',
      'wrong_nutrition',
      'wrong_image',
      'other'
    )),
  CONSTRAINT product_correction_events_context_check
    CHECK (context IN ('product_card', 'scan_result', 'catalog', 'admin_audit')),
  CONSTRAINT product_correction_events_status_check
    CHECK (status IN ('new', 'reviewing', 'fixed', 'rejected', 'duplicate')),
  CONSTRAINT product_correction_events_comment_length_check
    CHECK (comment IS NULL OR char_length(comment) <= 500),
  CONSTRAINT product_correction_events_metadata_object_check
    CHECK (jsonb_typeof(metadata_json) = 'object'),
  CONSTRAINT product_correction_events_resolution_object_check
    CHECK (jsonb_typeof(resolution_json) = 'object')
);

COMMENT ON TABLE public.product_correction_events IS
  'Metadata-only correction reports for product identity/facts. Does not store shopper profile, allergens, ingredients, AI messages, email, phone, or IP.';

COMMENT ON COLUMN public.product_correction_events.client_token IS
  'Per-device UUID used for anonymous insert anti-spam consistency with scan_events. Not a user id.';

CREATE INDEX IF NOT EXISTS idx_product_correction_events_store_created
  ON public.product_correction_events (store_id, created_at DESC)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_correction_events_ean_created
  ON public.product_correction_events (ean, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_correction_events_status_created
  ON public.product_correction_events (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_correction_events_client_created
  ON public.product_correction_events (client_token, created_at DESC);

DROP TRIGGER IF EXISTS set_product_correction_events_updated_at ON public.product_correction_events;
CREATE TRIGGER set_product_correction_events_updated_at
  BEFORE UPDATE ON public.product_correction_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_correction_events ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON TABLE public.product_correction_events TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.product_correction_events TO authenticated;
GRANT ALL ON TABLE public.product_correction_events TO service_role;

DROP POLICY IF EXISTS "product_correction_events_insert_anon_safe" ON public.product_correction_events;
CREATE POLICY "product_correction_events_insert_anon_safe" ON public.product_correction_events
  FOR INSERT TO anon
  WITH CHECK (
    client_token IS NOT NULL
    AND ean ~ '^\d{8,14}$'
    AND (shown_ean IS NULL OR shown_ean ~ '^\d{8,14}$')
    AND reason IN (
      'wrong_product', 'wrong_weight_or_volume', 'wrong_fat_percent', 'wrong_flavor',
      'wrong_package', 'wrong_brand', 'wrong_price', 'wrong_stock', 'wrong_ingredients',
      'wrong_allergens', 'wrong_halal', 'wrong_nutrition', 'wrong_image', 'other'
    )
    AND context IN ('product_card', 'scan_result', 'catalog', 'admin_audit')
    AND status = 'new'
    AND (comment IS NULL OR char_length(comment) <= 500)
  );

DROP POLICY IF EXISTS "product_correction_events_insert_authenticated_safe" ON public.product_correction_events;
CREATE POLICY "product_correction_events_insert_authenticated_safe" ON public.product_correction_events
  FOR INSERT TO authenticated
  WITH CHECK (
    client_token IS NOT NULL
    AND ean ~ '^\d{8,14}$'
    AND (shown_ean IS NULL OR shown_ean ~ '^\d{8,14}$')
    AND reason IN (
      'wrong_product', 'wrong_weight_or_volume', 'wrong_fat_percent', 'wrong_flavor',
      'wrong_package', 'wrong_brand', 'wrong_price', 'wrong_stock', 'wrong_ingredients',
      'wrong_allergens', 'wrong_halal', 'wrong_nutrition', 'wrong_image', 'other'
    )
    AND context IN ('product_card', 'scan_result', 'catalog', 'admin_audit')
    AND status = 'new'
    AND (comment IS NULL OR char_length(comment) <= 500)
  );

DROP POLICY IF EXISTS "product_correction_events_read_owner_or_admin" ON public.product_correction_events;
CREATE POLICY "product_correction_events_read_owner_or_admin" ON public.product_correction_events
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin_user((SELECT auth.uid())))
    OR store_id IN (SELECT id FROM public.stores WHERE owner_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "product_correction_events_update_admin" ON public.product_correction_events;
CREATE POLICY "product_correction_events_update_admin" ON public.product_correction_events
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_user((SELECT auth.uid()))))
  WITH CHECK ((SELECT public.is_admin_user((SELECT auth.uid()))));

COMMIT;
