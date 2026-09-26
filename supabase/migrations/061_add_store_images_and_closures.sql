-- Migration 061: Add store-images bucket, images jsonb, coordinates and temporary closures
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Create store-images bucket in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-images',
  'store-images',
  true,
  10485760, -- 10MB limit per image (after client WebP compression it is ~150KB)
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- 2. Storage RLS policies for store-images
DROP POLICY IF EXISTS "Public store images read" ON storage.objects;
CREATE POLICY "Public store images read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'store-images');

DROP POLICY IF EXISTS "Store owners and admins can upload store images" ON storage.objects;
CREATE POLICY "Store owners and admins can upload store images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-images'
    AND (
      split_part(name, '/', 1) IN (
        SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
      )
      OR (coalesce((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true)
      OR (coalesce((auth.jwt()->'app_metadata'->>'is_superadmin')::boolean, false) = true)
    )
  );

DROP POLICY IF EXISTS "Store owners and admins can update store images" ON storage.objects;
CREATE POLICY "Store owners and admins can update store images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'store-images'
    AND (
      split_part(name, '/', 1) IN (
        SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
      )
      OR (coalesce((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true)
      OR (coalesce((auth.jwt()->'app_metadata'->>'is_superadmin')::boolean, false) = true)
    )
  );

DROP POLICY IF EXISTS "Store owners and admins can delete store images" ON storage.objects;
CREATE POLICY "Store owners and admins can delete store images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'store-images'
    AND (
      split_part(name, '/', 1) IN (
        SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
      )
      OR (coalesce((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true)
      OR (coalesce((auth.jwt()->'app_metadata'->>'is_superadmin')::boolean, false) = true)
    )
  );

-- 3. Add columns to public.stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS temporary_closure jsonb DEFAULT NULL;

COMMENT ON COLUMN public.stores.images IS 'Structured array of store photos categorized by store zones (facade, checkout, interior, produce, bakery, grocery, custom).';
COMMENT ON COLUMN public.stores.latitude IS 'GPS latitude coordinates for map display and local search.';
COMMENT ON COLUMN public.stores.longitude IS 'GPS longitude coordinates for map display and local search.';
COMMENT ON COLUMN public.stores.temporary_closure IS 'Temporary planned closure details: { date, reason, is_active }.';

-- 4. Seed fallback photos for pilot demo stores if their images array is currently empty
UPDATE public.stores
SET images = '[
  {"id":"photo_mars_1","url":"https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80","category":"facade","label":"Фасад и главный вход"},
  {"id":"photo_mars_2","url":"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80","category":"interior","label":"Торговый зал и ряды"},
  {"id":"photo_mars_3","url":"https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80","category":"produce","label":"Отдел свежих овощей и фруктов"},
  {"id":"photo_mars_4","url":"https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80","category":"grocery","label":"Бакалея и напитки"}
]'::jsonb
WHERE code = 'mars' AND (images IS NULL OR images = '[]'::jsonb);

UPDATE public.stores
SET images = '[
  {"id":"photo_nurly_1","url":"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80","category":"facade","label":"Фасад и вход"},
  {"id":"photo_nurly_2","url":"https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80","category":"interior","label":"Торговый зал"},
  {"id":"photo_nurly_3","url":"https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80","category":"grocery","label":"Бакалея и напитки"}
]'::jsonb
WHERE code = 'nurly' AND (images IS NULL OR images = '[]'::jsonb);

UPDATE public.stores
SET images = '[
  {"id":"photo_kalina_1","url":"https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80","category":"facade","label":"Главный вход"},
  {"id":"photo_kalina_2","url":"https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80","category":"interior","label":"Торговый зал"},
  {"id":"photo_kalina_3","url":"https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80","category":"grocery","label":"Бакалея и напитки"}
]'::jsonb
WHERE code = 'kalina' AND (images IS NULL OR images = '[]'::jsonb);

COMMIT;
