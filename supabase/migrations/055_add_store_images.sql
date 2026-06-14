-- Migration 055: Add store images, coordinates columns and store-images bucket
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Add coordinates and images columns to stores table
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

COMMENT ON COLUMN public.stores.images IS 'URLs of store interior and exterior photos.';
COMMENT ON COLUMN public.stores.latitude IS 'GPS latitude coordinates for local SEO.';
COMMENT ON COLUMN public.stores.longitude IS 'GPS longitude coordinates for local SEO.';

-- 2. Storage bucket for store interior/exterior photos (public, max 5MB, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-images',
  'store-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated store owners can manage images in their store folder
DROP POLICY IF EXISTS "Store owners can upload images" ON storage.objects;
CREATE POLICY "Store owners can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-images'
    AND auth.uid() IN (SELECT owner_id FROM public.stores WHERE is_active = true)
    AND split_part(name, '/', 1) IN (
      SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can update images" ON storage.objects;
CREATE POLICY "Store owners can update images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'store-images'
    AND split_part(name, '/', 1) IN (
      SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can delete images" ON storage.objects;
CREATE POLICY "Store owners can delete images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'store-images'
    AND split_part(name, '/', 1) IN (
      SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public images read" ON storage.objects;
CREATE POLICY "Public images read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'store-images');

COMMIT;
