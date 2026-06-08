-- 047 - Product EAN aliases trusted data model
-- Stage 2 of the product EAN integrity recovery plan.
--
-- Purpose:
-- - Move from uncontrolled global_products.alternate_eans toward a reviewed alias model.
-- - Preserve multi-EAN support without allowing one scannable EAN to be trusted for many SKUs.
-- - Keep review/quarantine/rejected evidence private; buyer resolution will use a controlled RPC in Stage 4.

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_ean_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean text NOT NULL,
  global_product_id uuid NOT NULL REFERENCES public.global_products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'review',
  source text NOT NULL DEFAULT 'unknown',
  confidence smallint NOT NULL DEFAULT 0,
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by_auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_ean_aliases_ean_format_check
    CHECK (ean ~ '^\d{8,14}$'),
  CONSTRAINT product_ean_aliases_status_check
    CHECK (status IN ('trusted', 'review', 'quarantined', 'rejected')),
  CONSTRAINT product_ean_aliases_source_check
    CHECK (source IN (
      'global_primary',
      'store_import',
      'manual_admin',
      'audit_scan',
      'shopper_report',
      'external_exact_barcode',
      'npc_search',
      'legacy_alternate_eans',
      'arbuz_barcode',
      'arbuz_search',
      'kaspi',
      'korzinavdom',
      'openfoodfacts',
      'unknown'
    )),
  CONSTRAINT product_ean_aliases_confidence_check
    CHECK (confidence BETWEEN 0 AND 100),
  CONSTRAINT product_ean_aliases_trusted_confidence_check
    CHECK (status <> 'trusted' OR confidence >= 80),
  CONSTRAINT product_ean_aliases_evidence_object_check
    CHECK (jsonb_typeof(evidence_json) = 'object')
);

COMMENT ON TABLE public.product_ean_aliases IS
  'Reviewed EAN-to-product alias model. Only trusted active aliases may be used for buyer-visible scan resolution.';

COMMENT ON COLUMN public.product_ean_aliases.status IS
  'trusted = scan-resolvable after strict review; review = candidate; quarantined = conflict/suspicious; rejected = known wrong.';

COMMENT ON COLUMN public.product_ean_aliases.source IS
  'Source/evidence class for the alias. Broad name-search sources such as npc_search must not become trusted without additional review.';

COMMENT ON COLUMN public.product_ean_aliases.evidence_json IS
  'Machine-readable evidence for why this EAN is linked to this product: source payload, audit scan metadata, matching signals, reviewer notes references.';

CREATE UNIQUE INDEX IF NOT EXISTS product_ean_aliases_active_pair_key
  ON public.product_ean_aliases (ean, global_product_id)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS product_ean_aliases_one_trusted_active_ean_key
  ON public.product_ean_aliases (ean)
  WHERE is_active = true AND status = 'trusted';

CREATE INDEX IF NOT EXISTS idx_product_ean_aliases_ean_status
  ON public.product_ean_aliases (ean, status)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_ean_aliases_product_status
  ON public.product_ean_aliases (global_product_id, status)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_ean_aliases_review_queue
  ON public.product_ean_aliases (status, updated_at DESC)
  WHERE is_active = true AND status IN ('review', 'quarantined');

DROP TRIGGER IF EXISTS set_product_ean_aliases_updated_at ON public.product_ean_aliases;
CREATE TRIGGER set_product_ean_aliases_updated_at
  BEFORE UPDATE ON public.product_ean_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_ean_aliases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.product_ean_aliases FROM anon, public;
GRANT SELECT, INSERT, UPDATE ON TABLE public.product_ean_aliases TO authenticated;
GRANT ALL ON TABLE public.product_ean_aliases TO service_role;

DROP POLICY IF EXISTS "product_ean_aliases_admin_read" ON public.product_ean_aliases;
CREATE POLICY "product_ean_aliases_admin_read" ON public.product_ean_aliases
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "product_ean_aliases_admin_insert" ON public.product_ean_aliases;
CREATE POLICY "product_ean_aliases_admin_insert" ON public.product_ean_aliases
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_user((SELECT auth.uid()))));

DROP POLICY IF EXISTS "product_ean_aliases_admin_update" ON public.product_ean_aliases;
CREATE POLICY "product_ean_aliases_admin_update" ON public.product_ean_aliases
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_user((SELECT auth.uid()))))
  WITH CHECK ((SELECT public.is_admin_user((SELECT auth.uid()))));

COMMIT;
