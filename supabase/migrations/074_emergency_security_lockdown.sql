-- ═══════════════════════════════════════════════════════════════════════════
-- 074 — Emergency Security Lockdown (Этап 1 Плана Безопасности)
-- ═══════════════════════════════════════════════════════════════════════════
-- Закрывает критические бреши прямого доступа:
--   1. Включение RLS на таблицах поддержки (support_tickets, support_messages).
--      Telegram-бот и api/webhooks.js работают через service_role key и не затронуты.
--   2. Отзыв публичных прав EXECUTE на batch_update_product_names (защита каталога).
--   3. Отзыв прав EXECUTE на триггерные функции из публичного PostgREST RPC.
--   4. Изоляция векторной базы знаний (match_vault_chunks, vault_embeddings).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. СЛУЖБА ПОДДЕРЖКИ — Включение Row Level Security
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Удаляем любые случайные публичные политики (если существовали)
DROP POLICY IF EXISTS "allow_public_support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "allow_public_support_messages" ON public.support_messages;

-- По умолчанию при включенном RLS и отсутствии политик для anon/authenticated
-- доступ открыт ТОЛЬКО для service_role (Telegram-бот и вебхуки работают штатно).


-- ──────────────────────────────────────────────────────────────────────────
-- 2. ЗАЩИТА КАТАЛОГА — Отзыв прав на batch_update_product_names
-- ──────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.batch_update_product_names(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.batch_update_product_names(jsonb) TO service_role;


-- ──────────────────────────────────────────────────────────────────────────
-- 3. ТРИГГЕРНЫЕ ФУНКЦИИ — Закрытие от публичного RPC-вызова
-- ──────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.protect_admin_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_stores_billing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_stores() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_vault_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_admin_to_app_metadata() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_stores_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;


-- ──────────────────────────────────────────────────────────────────────────
-- 4. ВЕКТОРНАЯ БАЗА ЗНАНИЙ (VAULT RAG) — Изоляция только для service_role
-- ──────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.match_vault_chunks(vector, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_vault_chunks(vector, integer, jsonb) TO service_role;

DROP POLICY IF EXISTS "vault_read_authenticated" ON public.vault_embeddings;
DROP POLICY IF EXISTS "vault_read_anon" ON public.vault_embeddings;

COMMIT;
