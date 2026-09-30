-- ═══════════════════════════════════════════════════════════════════════════
-- 079 — Fix Remaining Mutable Search Paths (Этап 6 Финализация)
-- ═══════════════════════════════════════════════════════════════════════════
-- Фиксирует search_path = public, pg_temp для оставшихся функций,
-- устраняя предупреждения function_search_path_mutable из Supabase Advisors.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER FUNCTION public.batch_update_product_names(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_stores_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;

COMMIT;
