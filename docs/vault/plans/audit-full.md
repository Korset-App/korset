# Полный аудит Körset — баги, статус, что осталось

> Домен: plans / audit-full
> Дата: 2026-04-17 (обновлено)
> Связи: [[p0-security]] · [[session-2026-04-17]] · [[data-moat-strategy]] · [[offline-resilience]]

---

## Roadmap: заявлено vs реальность

| Фича                         | Статус                             |
| ---------------------------- | ---------------------------------- |
| Лендинг Glassmorphism        | Частично — работает, но техдолг    |
| Supabase Auth (Google OAuth) | Да                                 |
| Онбординг 2-шаговый          | Да, но SVG + хардкод RU            |
| ProfileAvatar                | Да                                 |
| Сканер штрихкодов            | Да, был stale closure (исправлен)  |
| AIScreen (чат с ИИ)          | Да + RAG через pgvector            |
| Push-уведомления             | Да, теперь с auth                  |
| Rapid-Scan Admin             | НЕ РАБОТАЕТ — экран не существует  |
| История + Избранное          | Да                                 |
| Smart Merge                  | Да, UI кривой                      |
| Retail Cabinet               | Да, базово                         |
| Fit-Check Red (аллергены)    | Частично — нет хард-блока фруктозы |
| Fit-Check Orange (следы)     | Да                                 |
| Fit-Check Yellow (Халал/AI)  | НЕТ LLM для Е-добавок              |
| Сравнение (Split-Screen)     | Частично — UI есть, логика сырая   |
| Offline Sync                 | ДА — реализовано (6 слоёв)         |
| /join/:code QR-роутинг       | НЕТ                                |
| Apple ID авторизация         | НЕТ                                |
| Импорт прайс-листа           | НЕТ — RetailImportScreen пустой   |

---

## Исправленные баги (сессия 2026-04-17)

### Критические баги экранов — ИСПРАВЛЕНЫ

- UnifiedProductScreen.jsx:171 — Runtime crash без импорта buildAuthNavigateState
- HomeScreen.jsx — onActive (Ionic) вместо pointer-событий
- RetailSettingsScreen.jsx:648 — мёртвая кнопка без onClick
- ScanScreen.jsx — stale closure на currentStore

### P0 Безопасность — ИСПРАВЛЕНО

- RLS на 13 таблицах (миграция 003, запущена)
- API auth + rate limit на /api/ai (30 auth/8 anon req/min)
- CORS whitelist (korset.app, localhost)
- Push API auth (JWT на subscribe/unsubscribe/send-test)
- DB indexes + constraints (миграция 004, запущена)
- OFF API CORS whitelist

### P1 Контексты — ИСПРАВЛЕНО

- StoreContext: abort-флаг при смене slug, updateStoreSettings в useCallback
- AuthContext: 8с timeout на getSession()
- ProfileContext: updateProfile в useCallback + try/catch cloud-write
- UserDataContext: toggleFavorite race через togglingRef, убран window.alert()
- services/ai.js: halal===false → 'no' вместо 'unknown'
- utils/supabase.js: Proxy вместо noOpLock + сломанного mock

### P2 Частично — ОШИБКА: откатано

- React.lazy — добавлен, затем ОТКАТАН (появилась задержка при переходах)
- BottomNav SVG → Material — заменён, затем ОТКАТАН (хозяин подбирал вручную)
- ErrorBoundary CSS — оставлен (не влияет на навигацию)

---

## Офлайн-режим — РЕАЛИЗОВАНО (сессия 2026-04-17, продолжение)

Подробно → [[offline-resilience]]

### 6 слоёв офлайн-устойчивости

- Слой 0: App Shell (Workbox Precache, vite-plugin-pwa injectManifest) — HTML/JS/CSS офлайн
- Слой 1: Каталог (IndexedDB via idb) — ~3000 товаров текущего магазина (~9MB, без картинок)
- Слой 2: Резолвер (resolver.js) — IndexedDB lookup + ранний выход при offline
- Слой 3: Очередь сканов (IndexedDB pending_scans) — 100 FIFO + Background Sync
- Слой 4: Картинки — НЕТ в V1 (серые placeholder'ы)
- Слой 5: UI (OfflineContext + OfflineBanner) — индикация, SWR, свежесть кэша (7 дней)

### 7 багов найдено и исправлено

1. CatalogScreen пустой офлайн → IndexedDB fallback через useEffect
2. AIScreen не блокировался офлайн → offline-экран с cloud_off иконкой
3. ScanScreen "не найден" без контекста офлайн → "Офлайн. Данных нет"
4. Background Sync не регистрировался → reg.sync.register() в addPendingScan
5. Хардкод RU в OfflineBanner + ProductScreen → i18n ключи RU+KZ
6. navigator.onLine без SSR-guard в logScan → typeof navigator !== 'undefined'
7. StoreContext кэш не фильтровал неактивные global_products → !inner join

### Созданные файлы

- src/utils/offlineDB.js — IndexedDB wrapper: catalog, pending_scans, store_meta, flushPendingScans
- src/contexts/OfflineContext.jsx — React Context: isOnline, cacheAge, cacheStale, pendingCount
- src/sw.js — Service Worker: Workbox precache + Background Sync + push + fetch
- src/components/OfflineBanner.jsx — жёлтая/оранжевая полоса офлайн-индикации (i18n)

### Модифицированные файлы

- resolver.js, StoreContext.jsx, localHistory.js, vite.config.js, App.jsx, main.jsx
- ProductScreen.jsx, AIScreen.jsx, ScanScreen.jsx, CatalogScreen.jsx, i18n.js, index.html

### Пакеты добавлены

- idb (IndexedDB wrapper)
- vite-plugin-pwa (Workbox + PWA manifest generation)

---

## АРХИТЕКТУРНЫЙ АУДИТ — 6 слабых мест (оценки /100)

### 1. Data Moat (25/100) ← СЛЕДУЮЩИЙ ФОКУС

Подробно → [[data-moat-strategy]]

База штрихкодов ЕАЭС практически пуста. Open Food Facts покрывает ~30% рынка КЗ. Ни одного казахстанского источника.

Конкретные баги:
- `data_quality_score` объявлен в схеме, но НИГДЕ не используется — нет логики расчёта, нет фильтрации
- `external_product_cache` БЕЗ TTL — закэшированные данные из OFF никогда не инвалидируются
- AI-enriched данные НЕ маркируются как ненадёжные — покупатель видит Fit-Check без указания достоверности
- Нет структурированного каскада источников: магазин → подтверждённая база КЗ → OFF → AI
- Нет механики обратной связи от магазинов для обогащения базы
- OFF — волонтёрская база, хрупкий фундамент
- AI-зависимость убивает Data Moat: если AI генерирует данные для любого штрихкода, зачем строить базу?

Что нужно:
- Реализовать data_quality_score логику (магазин=100, подтверждённый КЗ=80, OFF=50, AI=20)
- Добавить TTL в external_product_cache (30д OFF, 7д AI)
- Добавить source_type и confidence поля в global_products
- Построить каскад resolver с приоритетом источников
- Маркировать AI-данные в UI как "предположительно" / "не проверено"
- Исследовать казахстанские источники: ЕАЭС реестры, API магазинов (Магнум, Меломан)
- Сплит-тест: данные с качеством >=80 показывают полный Fit-Check, <80 — с предупреждением

### 2. Офлайн-режим (10/100 → ИСПРАВЛЕНО, 85/100)

Реализовано — см. выше и [[offline-resilience]].

### 3. Масштабирование (40/100) — НЕ НАЧАТО

- scan_events без партицирования — при росте таблица станет узким местом
- RLS-субзапросы на каждую строку — EXISTS (SELECT 1 FROM stores WHERE...) на каждый SELECT
- scan_count race condition — инкремент без блокировки, concurrent сканы теряют данные
- Rate limiting in-memory — мёртвый в serverless (Vercel), каждый cold start сбрасывает
- stores_update_owner позволяет менять plan/expires — владелец может поднять себе тариф

### 4. B2B2C модель (30/100) — НЕ НАЧАТО

- RetailImportScreen — ПУСТАЯ ОБОЛОЧКА — P0 блокер первой продажи
- Дашборд в штуках сканов, не в тенге — не продаёт подписку
- Нет плана/биллинг-энфорсмента — нет ограничения по тарифу
- Нет договора/оферты — юридически не оформлено

### 5. Стратегические тупики (45/100) — НЕ НАЧАТО

- AI-зависимость убивает Data Moat (см. #1)
- Feature creep: 20+ незавершённых фич в коде
- OFF — хрупкий фундамент (волонтёрская база, нет SLA)
- Supabase lock-in — миграция будет болезненной

### 6. БД в Supabase (55/100) — НЕ НАЧАТО

- Невалидный SQL в global_products.images — TEXT[] с невалидным литералом
- Нет UNIQUE на store_products(store_id, ean) — дубликаты товаров
- Нет ON DELETE CASCADE — осиротевшие записи при удалении магазина
- Нет updated_at триггеров — невозможно отследить свежесть
- Нет GIN на JSONB колонках — медленный поиск по allergens, diets, nutrients
- missing_products INSERT с WITH CHECK (true) — RLS дыра

### Общая оценка проекта: 35/100 (до) → ~50/100 (после офлайн)

---

## Приоритеты на следующие сессии

1. **Data Moat** — качество данных, каскад источников, TTL, data_quality_score
2. **Импорт прайс-листа** — P0 блокер первой продажи (RetailImportScreen пустой)
3. **БД-фиксы** — UNIQUE, триггеры, GIN, RLS column whitelist, ON DELETE CASCADE
4. **Метрики в тенге** — дашборд не продаёт подписку без денег
5. **Масштабирование** — партицирование scan_events, денормализация RLS

---

## НЕ исправлено (техдолг)

### P2 — Tech Debt

- SVG → Material Symbols: ~85 SVG в 15 файлах (СПРАШИВАТЬ перед заменой!)
- Хардкод RU → i18n: ~475 строк в 30+ файлах
- Inline styles → CSS: ~1,184 объекта в 30+ файлах
- Удалить products.json, stores.js, storeInventories.js (Phase 8)
- RapidScan экран — не существует, нужно создать

### MEDIUM — Безопасность

- Prompt injection в /api/ai — messages без санитизации
- SQL injection в send-event.js — storeSlug в .or()
- 500 ответы утекают error.message
