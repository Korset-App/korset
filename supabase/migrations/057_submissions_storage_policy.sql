-- 057_submissions_storage_policy.sql
-- Allow anonymous and authenticated uploads to public-assets/submissions/*
-- for shopper product submissions and photo corrections.

BEGIN;

DROP POLICY IF EXISTS "Public submissions upload" ON storage.objects;
DROP POLICY IF EXISTS "Public submissions update" ON storage.objects;
DROP POLICY IF EXISTS "Public assets select" ON storage.objects;

CREATE POLICY "Public submissions upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (
    bucket_id = 'public-assets'
    AND (name LIKE 'submissions/%' OR (storage.foldername(name))[1] = 'submissions')
  );

CREATE POLICY "Public submissions update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated, service_role
  USING (
    bucket_id = 'public-assets'
    AND (name LIKE 'submissions/%' OR (storage.foldername(name))[1] = 'submissions')
  )
  WITH CHECK (
    bucket_id = 'public-assets'
    AND (name LIKE 'submissions/%' OR (storage.foldername(name))[1] = 'submissions')
  );

CREATE POLICY "Public assets select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'public-assets');

COMMIT;
