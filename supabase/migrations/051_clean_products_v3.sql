-- Migration 051: Clean Products v3
-- Production-grade, pristine catalog table with strict EAN uniqueness,
-- granular physical attributes (flavor, fat %, packaging, exact quantity),
-- factory traceability (TNVED, producer BIN), and RLS security.

CREATE TABLE IF NOT EXISTS public.clean_products_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean text UNIQUE NOT NULL,
  name text NOT NULL,
  name_kz text,
  brand text,
  category text NOT NULL,
  subcategory text,
  quantity text,
  quantity_value numeric,
  quantity_unit text,
  fat_percent numeric,
  flavor text,
  package_type text,
  tnved text,
  producer_name text,
  producer_bin text,
  country_of_origin text,
  description text,
  storage_conditions text,
  shelf_life text,
  cooking_instructions text,
  ingredients_raw text,
  ingredients_json jsonb DEFAULT '[]'::jsonb,
  nutriments_json jsonb DEFAULT '{}'::jsonb,
  halal_status text DEFAULT 'unknown',
  halal_certifier text,
  allergens_json jsonb DEFAULT '[]'::jsonb,
  image_url text,
  secondary_image_url text,
  images_json jsonb DEFAULT '[]'::jsonb,
  data_quality_score integer DEFAULT 0,
  audit_status text DEFAULT 'verified_npc_ai',
  raw_source_name text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clean_products_v3_ean ON public.clean_products_v3 (ean);
CREATE INDEX IF NOT EXISTS idx_clean_products_v3_brand ON public.clean_products_v3 (brand);
CREATE INDEX IF NOT EXISTS idx_clean_products_v3_category ON public.clean_products_v3 (category);
CREATE INDEX IF NOT EXISTS idx_clean_products_v3_flavor ON public.clean_products_v3 (flavor);

ALTER TABLE public.clean_products_v3 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clean_products_v3' AND policyname = 'Allow public read clean_products_v3'
  ) THEN
    CREATE POLICY "Allow public read clean_products_v3"
      ON public.clean_products_v3
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clean_products_v3' AND policyname = 'Allow service role full access clean_products_v3'
  ) THEN
    CREATE POLICY "Allow service role full access clean_products_v3"
      ON public.clean_products_v3
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
