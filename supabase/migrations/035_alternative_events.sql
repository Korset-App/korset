-- 035 — Alternative events analytics
-- Metadata-only analytics for the product alternatives flow.
-- No raw profile, allergens, ingredients, AI messages, email, phone, IP, or user_id are stored.

CREATE TABLE IF NOT EXISTS public.alternative_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source_ean text NOT NULL,
  candidate_ean text,
  scenario text,
  event_type text NOT NULL,
  alternatives_count integer,
  client_token uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT alternative_events_source_ean_check
    CHECK (source_ean ~ '^\d{8,14}$'),
  CONSTRAINT alternative_events_candidate_ean_check
    CHECK (candidate_ean IS NULL OR candidate_ean ~ '^\d{8,14}$'),
  CONSTRAINT alternative_events_scenario_check
    CHECK (
      scenario IS NULL OR scenario IN ('similar', 'fits_me', 'cheaper', 'better_composition')
    ),
  CONSTRAINT alternative_events_type_check
    CHECK (
      event_type IN (
        'alternatives_scenario_selected',
        'alternatives_product_opened',
        'alternatives_compare_clicked',
        'alternatives_ai_help_clicked'
      )
    ),
  CONSTRAINT alternative_events_count_check
    CHECK (alternatives_count IS NULL OR alternatives_count >= 0)
);

COMMENT ON TABLE public.alternative_events IS
  'Metadata-only product alternatives analytics. Does not store profile, allergens, ingredients, AI messages, or PII.';

COMMENT ON COLUMN public.alternative_events.client_token IS
  'Per-device UUID used for anonymous insert anti-spam consistency with scan_events. Not a user id.';

CREATE INDEX IF NOT EXISTS idx_alternative_events_store_created
  ON public.alternative_events (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alternative_events_source_created
  ON public.alternative_events (source_ean, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alternative_events_client_created
  ON public.alternative_events (client_token, created_at DESC);

ALTER TABLE public.alternative_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alternative_events_insert_anon_safe" ON public.alternative_events;
CREATE POLICY "alternative_events_insert_anon_safe" ON public.alternative_events
  FOR INSERT TO anon
  WITH CHECK (
    client_token IS NOT NULL
    AND source_ean ~ '^\d{8,14}$'
    AND (candidate_ean IS NULL OR candidate_ean ~ '^\d{8,14}$')
    AND event_type IN (
      'alternatives_scenario_selected',
      'alternatives_product_opened',
      'alternatives_compare_clicked',
      'alternatives_ai_help_clicked'
    )
    AND (
      scenario IS NULL OR scenario IN ('similar', 'fits_me', 'cheaper', 'better_composition')
    )
  );

DROP POLICY IF EXISTS "alternative_events_insert_authenticated_safe" ON public.alternative_events;
CREATE POLICY "alternative_events_insert_authenticated_safe" ON public.alternative_events
  FOR INSERT TO authenticated
  WITH CHECK (
    client_token IS NOT NULL
    AND source_ean ~ '^\d{8,14}$'
    AND (candidate_ean IS NULL OR candidate_ean ~ '^\d{8,14}$')
    AND event_type IN (
      'alternatives_scenario_selected',
      'alternatives_product_opened',
      'alternatives_compare_clicked',
      'alternatives_ai_help_clicked'
    )
    AND (
      scenario IS NULL OR scenario IN ('similar', 'fits_me', 'cheaper', 'better_composition')
    )
  );

DROP POLICY IF EXISTS "alternative_events_read_owner" ON public.alternative_events;
CREATE POLICY "alternative_events_read_owner" ON public.alternative_events
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );
