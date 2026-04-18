# Лог сессий разработки Körset

> Домен: changelog
> Дата начала: 2026-04-17

---

## 2026-04-17 — Сессия 1: Полный аудит + RAG + P0/P1

**Выполнено:**
- Полный аудит: 26 экранов, 8 компонентов, 4 контекста, 15 утилит, 5 API, SQL-схема
- 4 критических бага экранов — исправлены
- 6 HIGH багов контекстов — исправлены
- 6 CRITICAL уязвимостей безопасности — исправлены (RLS 13 таблиц, JWT auth, CORS, rate limit)
- RAG-система через Supabase pgvector (216 чанков, 14 файлов)
- База знаний: e-additives (~60 добавок), halal-certification, allergen-cross-contamination
- Миграции 002-004 запущены

**Откатано (ошибка):**
- React.lazy — добавлен → откатан (задержка при переходах)
- BottomNav SVG → Material — заменён → откатан (хозяин подбирал вручную)
- УРОК: не менять дизайн без разрешения хозяина

---

## 2026-04-17 — Сессия 2: Офлайн + Архитектурный аудит

**Выполнено:**
- Архитектурный аудит — 6 слабых мест (оценки 25-85/100)
- Офлайн-режим полностью реализован (6 слоёв, 85/100)
  - Слой 0: App Shell (Workbox Precache)
  - Слой 1: IndexedDB каталог (~3000 товаров, ~9MB)
  - Слой 2: Resolver с IndexedDB lookup
  - Слой 3: Очередь сканов (100 FIFO + Background Sync)
  - Слой 4: Картинки — НЕТ в V1 (placeholder)
  - Слой 5: OfflineContext + OfflineBanner
- 7 багов найдено и исправлено при самопроверке
- Документация обновлена (ARCHITECTURE.md, ROADMAP, CONTEXT.md)
- Vault RAG: +55 чанков (offline-resilience, data-moat-strategy, обновлённый audit-full)

**Не выполнено:**
- Data Moat — СЛЕДУЮЩИЙ ФОКУС
- Импорт прайс-листа (P0 блокер)
- БД-фиксы (UNIQUE, CASCADE, триггеры, GIN)
- Метрики в тенге

---

## 2026-04-17 — Сессия 3: Оптимизация инфраструктуры ассистента

**Выполнено:**
- AGENTS.md создан — Vault Protocol (CONTEXT.md + RAG при старте, сохранение при конце)
- Vault консолидирован: 20 файлов → 12, 301 чанков → 239
- Skills установлены: supabase-postgres-best-practices, supabase
- MCP подключены: Context7 (документации), Grep (GitHub код)
- Custom Tools созданы: vault-query.ts, vault-embed.ts
- opencode.json создан (MCP конфиг)
- CONTEXT.md упрощён — убраны дубли с audit

---

## 2026-04-18/19 — Сессия 4-5: Data Moat Pipeline — NPC + Arbuz + USDA

**Выполнено:**
- Arbuz API v1 обнаружен и документирован — полностью открытый API (auth + search + detail)
- `scripts/arbuz-enrich.cjs` — полностью переписан с HTML scraper на API v1
  - Прод запуск: 190/190 processed, 143 found (75%), 127 comp, 124 КБЖУ, 23 халал
- `scripts/npc-enrich.cjs` — прод запуск: 288/289 matched (99.7%), 164 GTIN, 288 NTIN
  - ~130 DB updates (rest blocked by source_primary_check constraint)
- `scripts/usda-enrich.cjs` — написан, но USDA API unreachable из KZ (нужен Vercel proxy)
- `api/usda.js` — написан, не задеплоен (нет VERCEL_TOKEN)
- halal_status fix: `'certified'` → `'yes'` (valid values: unknown/yes/no)
- Миграция 007 написана (add 'npc','arbuz','usda' to source_primary) — НЕ применена (нет psql/MCP)

**Проблемы:**
- `source_primary_check` — 'npc' не в списке. Скрипт использует 'kz_verified' как обход
- `global_products_ean_key` — UNIQUE конфликт при одинаковых GTIN для вариантов товаров
- USDA API unreachable напрямую из KZ (ETIMEDOUT) — нужен Vercel proxy
- 155 товаров ещё с kaspi_ EAN (NPC не смог матчить — дубли EAN)

**Статистика БД:**
- 685 active products
- Без состава: 81 (было ~190), Без КБЖУ: 110
- С халал=yes: 35, С kz_verified: 115
- С kaspi_ EAN: 155
