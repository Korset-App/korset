-- ═══════════════════════════════════════════════════════════════════════════
-- 075 — Policy Cleanup and Event Guards (Этап 2 Плана Безопасности)
-- ═══════════════════════════════════════════════════════════════════════════
-- Закрывает критические лазейки в основных таблицах:
--   1. scan_events: удаляет утечку OR true (scans_read_device), удаляет открытый
--      scans_insert, добавляет scan_events_delete_own для очистки истории.
--   2. external_product_cache: удаляет открытый cache_update и cache_insert.
--      Ограничивает вызов RPC upsert_external_cache (запрет для anon).
--   3. missing_products: удаляет открытый missing_insert.
--   4. users: удаляет открытый users_insert (разрешая только users_insert_own).
--   5. user_favorites & product_reviews: удаляет устаревшие дубликаты политик.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. SCAN_EVENTS — Закрытие утечки данных сканирований
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "scans_read_device" ON public.scan_events;
DROP POLICY IF EXISTS "scans_insert" ON public.scan_events;
DROP POLICY IF EXISTS "scans_read" ON public.scan_events;
DROP POLICY IF EXISTS "scans_read_user" ON public.scan_events;
DROP POLICY IF EXISTS "scan_events_read_owner" ON public.scan_events;

-- Добавляем возможность пользователю удалять свои собственные сканы (кнопка в настройках)
DROP POLICY IF EXISTS "scan_events_delete_own" ON public.scan_events;
CREATE POLICY "scan_events_delete_own" ON public.scan_events
  FOR DELETE TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────────────────
-- 2. EXTERNAL_PRODUCT_CACHE — Защита от порчи состава и аллергенов
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cache_update" ON public.external_product_cache;
DROP POLICY IF EXISTS "cache_insert" ON public.external_product_cache;
DROP POLICY IF EXISTS "cache_select" ON public.external_product_cache;

-- Чтение кэша остаётся публичным через external_product_cache_read_public
-- Ограничиваем RPC upsert_external_cache: анонимы не могут напрямую менять кэш
REVOKE ALL ON FUNCTION public.upsert_external_cache(
  text, text, text, text, text, text, text, text,
  jsonb, jsonb, jsonb, jsonb, jsonb, text, text, smallint, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_external_cache(
  text, text, text, text, text, text, text, text,
  jsonb, jsonb, jsonb, jsonb, jsonb, text, text, smallint, jsonb
) TO authenticated, service_role;


-- ──────────────────────────────────────────────────────────────────────────
-- 3. MISSING_PRODUCTS — Удаление открытого INSERT
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "missing_insert" ON public.missing_products;
DROP POLICY IF EXISTS "missing_read" ON public.missing_products;


-- ──────────────────────────────────────────────────────────────────────────
-- 4. USERS — Удаление открытого INSERT/UPDATE/SELECT
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_read" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;


-- ──────────────────────────────────────────────────────────────────────────
-- 5. ОЧИСТКА ДУБЛИКАТОВ ПОЛИТИК (FAVORITES & REVIEWS)
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "fav_own" ON public.user_favorites;
DROP POLICY IF EXISTS "rev_read" ON public.product_reviews;
DROP POLICY IF EXISTS "rev_write" ON public.product_reviews;

COMMIT;
