-- Migration 050: Clean Products v2
-- Isolated pristine catalog table with strict unique EAN constraint and enriched specifications.

CREATE TABLE IF NOT EXISTS public.clean_products_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean text UNIQUE NOT NULL,
  name text NOT NULL,
  name_kz text,
  brand text,
  category text,
  subcategory text,
  quantity text,
  quantity_value numeric,
  quantity_unit text,
  fat_percent numeric,
  flavor text,
  package_type text,
  storage_conditions text,
  shelf_life text,
  cooking_instructions text,
  description text,
  ingredients_raw text,
  ingredients_json jsonb DEFAULT '[]'::jsonb,
  nutriments_json jsonb DEFAULT '{}'::jsonb,
  halal_status text DEFAULT 'unknown',
  allergens_json jsonb DEFAULT '[]'::jsonb,
  image_url text,
  secondary_image_url text,
  images_json jsonb DEFAULT '[]'::jsonb,
  country_of_origin text,
  producer_name text,
  producer_bin text,
  quality_score integer DEFAULT 0,
  match_source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clean_products_v2_ean ON public.clean_products_v2 (ean);
CREATE INDEX IF NOT EXISTS idx_clean_products_v2_brand ON public.clean_products_v2 (brand);
CREATE INDEX IF NOT EXISTS idx_clean_products_v2_category ON public.clean_products_v2 (category);

ALTER TABLE public.clean_products_v2 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clean_products_v2' AND policyname = 'Allow public read clean_products_v2'
  ) THEN
    CREATE POLICY "Allow public read clean_products_v2"
      ON public.clean_products_v2
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clean_products_v2' AND policyname = 'Allow service role full access clean_products_v2'
  ) THEN
    CREATE POLICY "Allow service role full access clean_products_v2"
      ON public.clean_products_v2
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
