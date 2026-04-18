# KÖRSET — БЫСТРЫЙ КОНТЕКСТ

> Для ИИ-ассистента. Единственный файл для ручной загрузки в начале чата.
> Глубокая архитектура → `ARCHITECTURE.md`. Аудит → `docs/vault/plans/audit-full.md`. Правила → `AGENTS.md`.

---

## Что такое Körset

Store-context AI assistant (mobile-first PWA) для офлайн-магазинов Казахстана.
Сканирует штрихкод → Fit-Check (аллергии, Халал, диеты). B2B2C: платят магазины (~15 000 тг/мес SaaS).

**Стек:** React 18 + Vite + Supabase + Vercel Serverless + OpenAI
**Код:** JavaScript (не TypeScript), Vanilla CSS (не Tailwind)
**Стиль:** Dark Premium Glassmorphism, Advent Pro + Manrope, Material Symbols Only

---

## Маршруты

```
/                           → Лендинг
/s/:storeSlug               → Главный экран магазина
/s/:storeSlug/scan          → Сканер
/s/:storeSlug/catalog       → Каталог
/s/:storeSlug/product/:ean  → Карточка товара
/s/:storeSlug/history       → История
/s/:storeSlug/profile       → Профиль
/retail/:storeSlug/...      → Retail Cabinet
```

---

## Что работает

- Supabase Auth (Google OAuth), онбординг 2-шаговый
- Сканер штрихкодов, AIScreen (чат с ИИ + RAG)
- Fit-Check (Red/Orange — детерминированный, Yellow — AI)
- Push-уведомления, История + Избранное, Smart Merge
- Retail Cabinet (Dashboard, Products, Settings)
- Офлайн: App Shell + IndexedDB каталог + очередь сканов + OfflineBanner
- RAG через Supabase pgvector (301 чанк, 20 файлов)
- RLS на 13 таблицах, JWT auth на API

---

## Железные правила (кратко)

0. **Vault Protocol:** НАЧАЛО чата → прочитай CONTEXT.md. КОНЕЦ чата → сохрани в Vault + embed. → `AGENTS.md`
1. Сначала анализ → потом код. Предложи план → получи апрув.
2. Не ломать работающее.
3. Экраны покупателя → только внутри `/s/:storeSlug/`.
4. Иконки: Качественные SVG для премиального вида. Material Symbols — опционально.
5. Аватары только `<ProfileAvatar />`.
6. Не переписывать стили на светлые.
7. Новый текст → через `useI18n` (RU/KZ обязательно).
8. Оценивай через B2B: «Помогает ли это продать подписку?»

---

## Текущий фокус

| Фокус | Статус |
|-------|--------|
| **Data Moat Pipeline** | 🔧 РЕАЛИЗАЦИЯ — NPC ✅, Arbuz ✅, USDA ⏳ |
| **Kaspi Import Pipeline** | ✅ РАБОТАЕТ — Chocolate bars загружены |
| **Импорт прайс-листа** (RetailImportScreen) | 🔜 |
| **БД-фиксы** (UNIQUE, CASCADE, триггеры, GIN) | 🔜 |
| **Метрики в тенге** | 🔜 |

**Data Moat Pipeline — УТВЕРЖДЁННАЯ СТРАТЕГИЯ:**

```
Шаг 0: EAN-13 валидация (контрольная сумма) ✅
Шаг 1: NPC Search API → GTIN + NTIN + nameRu/KK + ОКТРУ ✅ (288/289, 164 GTIN)
Шаг 2: Arbuz.kz API v1 → СОСТАВ (RU) + КБЖУ + Халал + цена ✅ (190/190, 75% found)
Шаг 3: USDA FoodData → состав (EN) + КБЖУ — ⏳ (API unreachable from KZ, needs Vercel proxy)
Шаг 4: Kaspi HTML → состав (RU) + цена — fallback 🔜
Шаг 5: OFF → аллергены + NutriScore 🔜
```

**⚠️ ARBUZ API v1 — ГЛАВНОЕ ОТКРЫТИЕ:**

- **API `/api/v1/`** полностью открыт (v2=401, v3=404)
- **Auth:** `POST /api/v1/auth/token` с consumer `arbuz-kz.web.mobile` → JWT (10мин TTL)
- **Search:** `GET /api/v1/shop/search/products?where[name][c]=QUERY&limit=20`
- **Detail:** `GET /api/v1/shop/product/{id}` → nutrition, ingredients, characteristics (халал!), price
- **Халал:** characteristics содержит `{name: "Халал"}` → товар халяльный
- **Поиск по штрихкоду НЕ работает** — только по названию/бренду

**⚠️ DB CONSTRAINTS — НУЖНЫ ФИКСЫ:**

1. `source_primary_check` — `'npc'`/`'arbuz'`/`'usda'` не в списке. Скрипты используют `'kz_verified'`
   - **Миграция 007 написана** (`007_add_pipeline_sources.sql`) — **нужно применить через Supabase Dashboard**
2. `halal_status_check` — допустимые: `'unknown'`, `'yes'`, `'no'`. `'certified'` — НЕ проходит (исправлено в скрипте)
3. `global_products_ean_key` — UNIQUE на EAN. Duplicate conflict при одинаковых GTIN для разных вариантов товаров

**API ключи (в .env.local):**
- NPC_API_KEY ✅
- USDA_API_KEY ✅ (но API unreachable напрямую из KZ)

**СКРИПТЫ PIPELINE:**
1. `scripts/validate-ean.cjs` — ✅ РАБОТАЕТ
2. `scripts/npc-enrich.cjs` — ✅ ПРОД ЗАПУСК: 288/289 matched, 164 GTIN, 288 NTIN, 130+ DB updates
3. `scripts/arbuz-enrich.cjs` — ✅ ПРОД ЗАПУСК: 190 processed, 143 found (75%), 127 comp, 124 КБЖУ, 23 халал
4. `scripts/usda-enrich.cjs` — ✅ написан, ⏳ API unreachable (нужен Vercel proxy)
5. `api/usda.js` — ✅ написан, ⏳ НЕ задеплоен (нет VERCEL_TOKEN)
6. `api/ean-search.js` — ✅ написан

**ТЕКУЩИЕ СТАТИСТИКИ БД:**
- 685 active global_products
- Без состава: 81 (было ~190)
- Без КБЖУ: 110
- С халал=yes: 35
- С source kz_verified (NPC): 115
- С kaspi_ EAN (ещё нужно): 155
- С реальным GTIN EAN: ~530

**МИГРАЦИИ:**
- 006 (`alternate_eans`): ✅ ВЫПОЛНЕНА
- 007 (`add_pipeline_sources`): ⚠️ НАПИСАНА, НУЖНО ПРИМЕНИТЬ ЧЕРЕЗ DASHBOARD

**ПОРЯДОК ЗАДАЧ (следующий чат):**
1. Применить миграцию 007 через Supabase Dashboard (добавить 'npc','arbuz','usda' в source_primary)
2. Задеплоить api/usda.js на Vercel (нужен VERCEL_TOKEN)
3. Запустить usda-enrich.cjs через Vercel proxy
4. Обработать duplicate EAN conflict (same GTIN для вариантов → alternate_eans)
5. Миграция БД: колонки ntin, oktru_code, halal_certified, kbju
6. Объединить pipeline: NPC → Arbuz → USDA → Kaspi → OFF

Офлайн-режим: ✅ ГОТОВО (6 слоёв, 85/100)

---

*Подробно: ARCHITECTURE.md | Аудит: docs/vault/plans/audit-full.md | Память: docs/vault/*
