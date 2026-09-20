-- 057_submissions_storage_policy.sql
-- Allow anonymous and authenticated uploads to public-assets/submissions/*
-- for shopper product submissions and photo corrections.

BEGIN;

DROP POLICY IF EXISTS "Public submissions upload" ON storage.objects;
CREATE POLICY "Public submissions upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'public-assets'
    AND (storage.foldername(name))[1] = 'submissions'
  );

COMMIT;
