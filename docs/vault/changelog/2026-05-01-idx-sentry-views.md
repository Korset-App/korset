# 2026-05-01 — Быстрые победы: idx_users_auth_id + Sentry + SECURITY DEFINER views

> Связи: [[monitoring-runbook]] · [[auth-system]]

## Сделано

1. **Миграция 022** — `idx_users_auth_id` на `public.users(auth_id)`.
   - Проблема: RLS-политики (is_store_owner, users_update_own и др.) делали full table scan на users без индекса.
   - Решение: B-tree index, idempotent (IF NOT EXISTS).
   - Статус: применена через Supabase SQL Editor.

2. **Sentry интеграция** — `@sentry/react` + `@sentry/vite-plugin`.
   - `src/main.jsx`: инициализация с `browserTracingIntegration` + `replayIntegration`.
   - `vite.config.js`: `sentryVitePlugin` для source maps upload (только при `SENTRY_AUTH_TOKEN`).
   - Source maps включены в production build.
   - DSN безопасен для клиентского бандла.
   - Статус: build прошёл, DSN нужно добавить в Vercel env.

3. **Миграция 023** — fix `SECURITY DEFINER` на 4 analytics views.
   - Views: `store_top_scans`, `store_missing_unresolved`, `product_rating_summary`, `store_week_summary`.
   - Риск: LOW (все читают public-данные: scan_events, global_products, product_reviews, missing_products).
   - Фикс: `ALTER VIEW ... SET (security_invoker = on)` — RLS применяется с правами вызывающего.
   - Статус: применена, Security Advisor больше не предупреждает.

4. **CONTEXT.md** обновлён: оценка проекта 50→70, миграции 022/023 добавлены.

## Оценка проекта после фиксов

- Безопасность: 80/100
- БД фундамент: 80/100 (idx_users_auth_id + atomic RPC + CHECK constraints)
- Тесты + CI: 70/100 (fitCheck 35+ кейсов, GitHub Actions, /api/health)
- Офлайн: 90/100 (DB_VERSION 2, client_token, SW Background Sync)
- Фронтенд архитектура: 55/100 (lazy routes есть, ProductScreen-монолит + i18n хардкод остались)
- Data Quality: 40/100 (357 категорий — в работе у другой нейросети)
- Функционал: 85/100
- Документация: 80/100
- Мониторинг: 70/100 (Sentry добавлен, но DSN не настроен в prod)

**Итого: ~70/100** (было ~50/100).

## Что осталось

- Применить миграцию 022 (idx_users_auth_id) — если ещё не сделано.
- Добавить `VITE_SENTRY_DSN` в Vercel Environment Variables.
- Проверить миграцию 016 (profile avatar_id + banner_url) — ручная проверка.
- ProductScreen рефакторинг (1315 строк → разбить на компоненты, name_kz, i18n) — отложено.
- Категории — делаются в другой среде.
