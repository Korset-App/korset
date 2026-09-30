-- ═══════════════════════════════════════════════════════════════════════════
-- 078 — Storage Security Hardening (Этап 5)
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Ограничение размера файлов и MIME-типов для public-assets (5MB, jpeg/png/webp).
-- 2. Ограничение размера файлов и MIME-типов для avatars (2MB, jpeg/png/webp).
-- 3. Удаление открытой политики "Public submissions update", позволявшей анонимную
--    перезапись чужих фотографий отсутствующих товаров в submissions/*.
-- 4. Изоляция хранилища аватаров: пользователи могут загружать, обновлять и удалять
--    только аватары внутри своей собственной папки (<user_id>/*).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. ОГРАНИЧЕНИЯ ХРАНИЛИЩА (FILE SIZE & MIME TYPES)
-- ──────────────────────────────────────────────────────────────────────────

UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'public-assets';

UPDATE storage.buckets
SET file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';


-- ──────────────────────────────────────────────────────────────────────────
-- 2. УДАЛЕНИЕ ОПАСНОЙ ПОЛИТИКИ UPDATE ДЛЯ АНОНИМНЫХ ЗАГРУЗОК
-- ──────────────────────────────────────────────────────────────────────────

-- Запрещаем анонимную перезапись чужих отправленных фотографий
DROP POLICY IF EXISTS "Public submissions update" ON storage.objects;


-- ──────────────────────────────────────────────────────────────────────────
-- 3. ИЗОЛЯЦИЯ ПАПОК ПОЛЬЗОВАТЕЛЕЙ В BUCKET AVATARS
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow authenticated uploads 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads 1oj01fe_2" ON storage.objects;

-- Публичное чтение аватаров (для отображения профилей)
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
CREATE POLICY "Avatars public read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Загрузка аватара только в папку своего user_id
DROP POLICY IF EXISTS "Avatars user upload" ON storage.objects;
CREATE POLICY "Avatars user upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Обновление аватара только в папке своего user_id
DROP POLICY IF EXISTS "Avatars user update" ON storage.objects;
CREATE POLICY "Avatars user update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Удаление аватара только в папке своего user_id
DROP POLICY IF EXISTS "Avatars user delete" ON storage.objects;
CREATE POLICY "Avatars user delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
