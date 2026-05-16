# KÖRSET — БЫСТРЫЙ КОНТЕКСТ ПРОЕКТА

> Быстрый вход для ИИ-агентов после `AGENTS.md`.
> Этот файл должен быть актуальной картой проекта, а не changelog-архивом.
> Глубокая архитектура: `docs/ARCHITECTURE.md`. Roadmap: `docs/ROADMAP_PILOT_V1.md`. Детальная память: `docs/vault/`.

---

## 1. Проект В Одном Экране

Körset — store-context AI assistant для офлайн-продуктовых магазинов Казахстана.
Это mobile-first PWA: покупатель открывает магазинный контекст, сканирует штрихкод и получает Fit-Check по аллергиям, халал-статусу, диетам, составу и фактам о товаре.

Модель: B2B2C. Платят магазины; покупатели используют consumer-приложение.
V1 scope: только продуктовые магазины.

Главная ценность:

- Покупателю: быстро понять, подходит ли продукт прямо у полки.
- Магазину: лояльность, меньше потерянных продаж, аналитика сканов, сигналы спроса по unknown EAN, цифровой слой поверх офлайн-магазина.

---

## 2. Стек И Карта Репозитория

- Frontend: React 18 + Vite SPA.
- Код: JavaScript, не TypeScript.
- Стили: Vanilla CSS, не Tailwind.
- Backend/data: Supabase PostgreSQL, Auth, Storage, RLS.
- API: Vercel Serverless.
- AI: OpenAI + RAG через Vault embeddings.
- PWA/offline: service worker, IndexedDB, очередь offline-сканов.

Важные папки:

- `src/screens/` — экраны.
- `src/components/` — общие UI-компоненты.
- `src/contexts/` — React contexts.
- `src/domain/` — доменная логика товаров.
- `src/i18n/`, `src/locales/` — RU/KZ локализация.
- `api/` — Vercel serverless endpoints.
- `scripts/` — data/import/enrichment/memory scripts.
- `supabase/` — миграции и SQL-контекст.
- `docs/vault/` — долгосрочная проектная память для RAG.

---

## 3. Актуальные Роуты

Публичные и системные:

```text
/                         -> лендинг
/stores                   -> список магазинов
/stores/:storeSlug        -> публичная страница магазина
/auth                     -> авторизация
/update-password          -> завершение сброса пароля
/setup-profile            -> настройка профиля
/qr-print                 -> печать QR
/privacy-policy           -> политика приватности
```

Consumer внутри магазина:

```text
/s/:storeSlug                         -> главный экран магазина
/s/:storeSlug/scan                    -> сканер
/s/:storeSlug/catalog                 -> каталог
/s/:storeSlug/ai                      -> общий AI assistant
/s/:storeSlug/history                 -> история
/s/:storeSlug/profile                 -> профиль
/s/:storeSlug/profile/edit            -> редактирование профиля
/s/:storeSlug/account                 -> аккаунт и методы входа
/s/:storeSlug/notifications           -> настройки уведомлений
/s/:storeSlug/privacy                 -> настройки приватности
/s/:storeSlug/sound-settings          -> настройки звука
/s/:storeSlug/faq                     -> FAQ
/s/:storeSlug/about                   -> о проекте
/s/:storeSlug/terms                   -> условия
/s/:storeSlug/product/:ean            -> карточка товара
/s/:storeSlug/product/:ean/alternatives -> альтернативы товара
/s/:storeSlug/product/:ean/ai         -> AI по товару
/s/:storeSlug/product/:ean/compare/:ean2 -> сравнение двух товаров
```

Retail:

```text
/retail                         -> вход в retail cabinet по владельцу
/retail/:storeSlug/dashboard    -> дашборд
/retail/:storeSlug/products     -> товары
/retail/:storeSlug/import       -> импорт прайс-листа
/retail/:storeSlug/ean-recovery -> EAN recovery
/retail/:storeSlug/settings     -> настройки магазина и QR
```

Правило: покупательские shopping-flows должны оставаться внутри `/s/:storeSlug/`.

---

## 4. Что Работает Сейчас

Consumer:

- Сканер штрихкодов с ручным вводом EAN.
- Product resolution через store catalog/global products, IndexedDB offline cache и enrichment paths.
- ProductScreen: Fit-Check, факты товара, цена/store overlay, unknown-EAN request flow, переходы к AI/compare/alternatives.
- CompareScreen: сравнение двух товаров через scan flow.
- AIScreen/AIAssistantScreen: product/general/compare AI modes, серверный `/api/ai.js`, RAG через `vault_embeddings`.
- CatalogScreen: 18 нормализованных категорий, bento showcase, поиск (иконка + кнопка ×), view toggle list/grid, минималистичные выпадающие панели с поддержкой мульти-выбора подкатегорий, продвинутая сортировка (по Fit-Check, цене, белку, сахару) с иконками, 4-уровневый Fit-Check badge, mix-blend-mode на изображениях, skeleton loading state, Virtuoso, offline fallback. Счётчики товаров отключены (`showCatalogMeta = false`).
- History, favorites, profile, account и service screens.

Auth/profile:

- Supabase Auth: Google OAuth, email/password, email OTP.
- Phone/WhatsApp auth UI удалён из AuthScreen; AccountScreen всё ещё может показывать существующий `user.phone`, если он есть в Supabase identity.
- Password recovery идёт через `/update-password`.
- AccountScreen показывает linked login methods и account actions.
- Profile использует `<ProfileAvatar />` для аватаров.

Retail:

- Dashboard с scan/business metrics.
- Products management: price/stock/shelf editing, barcode search, list/grid режим.
- Import: CSV/XLS/XLSX, template download, bulk update, unknown-EAN staging, auto-resolve.
- Settings: данные магазина, logo upload, QR для магазина, notification toggles, clear catalog danger-zone.
- EAN Recovery: отдельный экран + `/api/ean-recovery`.

Infrastructure:

- RLS и JWT-protected APIs для чувствительных действий.
- Sentry frontend/backend, Telegram alerts, health endpoint.
- Offline app shell, IndexedDB catalog cache, pending scan queue, OfflineBanner.
- RAG memory через Supabase pgvector и `docs/vault/`.
- Dark/light themes через semantic CSS tokens.

---

## 5. Важные Риски И Не Считать “Готовым”

- `AlternativesScreen.jsx` подключён к `StoreContext.catalogProducts`.

### Выполненные этапы импорта данных (Arbuz.kz)

- ✅ **Парсинг подкатегории «Молоко, сливки, сгущённое молоко»**: Успешно завершен боевой импорт подкатегории (113 уникальных EAN-продуктов перенесено в Supabase `global_products` без единой ошибки: 100 создано, 13 обогащено). Создан высокопроизводительный парсер `scripts/arbuz-subcategory-parser.cjs`.
- ✅ **Парсинг подкатегории «Кефир, творог, сметана»**: Успешно завершен боевой импорт (140 уникальных EAN-продуктов, включая традиционные шубат, кумыс, мацони).
- ✅ **Парсинг подкатегории «Йогурты, сырки, десерты»**: Успешно завершен боевой импорт (201 уникальный EAN-продукт, включая десерты и творожные пасты).
- ✅ **Парсинг подкатегории «Яйца, масло, маргарин»**: Успешно завершен боевой импорт (104 уникальных EAN-продукта).
- ✅ **Парсинг подкатегории «Сыры»**: Успешно завершен боевой импорт (333 уникальных EAN-продукта, включая пармезан, моцареллу, брынзу).
- ✅ **Парсинг подкатегории «Мороженое»**: Успешно завершен боевой импорт (212 уникальных EAN-продуктов, отсеяны СТМ Arbuz Select).
- ✅ **Парсинг подкатегории «Полуфабрикаты»**: Успешно завершен боевой импорт (135 уникальных EAN-продуктов).
- ✅ **Парсинг подкатегории «Самса, пирожки, чебуреки»**: Успешно завершен боевой импорт (22 уникальных EAN-продукта, 26 EAN-кодов автоматически сопоставлено через Нацкаталог РК, 21 СТМ-позиция Arbuz Select аккуратно отфильтрована).
- ✅ **Парсинг подкатегории «Хлеб, выпечка, пироги и тесто (замороженное)»**: Успешно завершен боевой импорт (103 уникальных EAN-продукта, 102 EAN-кода получено через Нацкаталог РК, 24 СТМ-позиции Arbuz Select отфильтровано).
- ✅ **Парсинг подкатегории «Вода»**: Успешно завершен боевой импорт (81 уникальный EAN-продукт, 63 EAN-кода получено через Нацкаталог РК, 70 создано с нуля, 11 обогащено полной информацией — составом, производителем и КБЖУ).
- ✅ **Парсинг подкатегории «Газировка и энергетики»**: Успешно завершен боевой импорт (118 уникальных EAN-продуктов, 147 EAN-кодов получено через Нацкаталог РК, 92 создано с нуля, 26 обогащено детальной информацией, реализована умная разбивка на категории soda / energy / lemonade).
- ✅ **Парсинг подкатегории «Холодный чай, компот, морс»**: Успешно завершен боевой импорт (91 уникальный EAN-продукт из 134 обнаруженных на глубоких страницах подкатегорий, 115 EAN-кодов получено через Нацкаталог РК, 75 создано с нуля, 72 обогащено детальной информацией, реализован мульти-URL краулер).
- ✅ **Парсинг подкатегории «Соки и нектары»**: Успешно завершен боевой импорт (116 уникальных EAN-продуктов из 164 обнаруженных, 116 EAN-кодов получено через Нацкаталог РК, 97 создано с нуля, 19 обогащено деталями, 12 СТМ-продуктов Arbuz Select отфильтровано).
- ✅ **Парсинг подкатегории «Колбасы и сосиски»**: Успешно завершен боевой импорт (184 уникальных EAN-продукта из 226 обнаруженных на глубоких страницах 8 подкатегорий, 139 EAN-кодов получено через Нацкаталог РК, 174 создано с нуля, 10 обогащено деталями, 10 СТМ-продуктов Arbuz Select отфильтровано).
- ✅ **Парсинг подкатегории «Сосиски, сардельки»**: Успешно завершен боевой импорт (60 уникальных EAN-продуктов из 71 обнаруженного на страницах подкатегории, 46 EAN-кодов получено через Нацкаталог РК, 54 создано с нуля, 6 обогащено деталями, 11 СТМ-продуктов Arbuz Select отфильтровано).
- ✅ **Парсинг подкатегории «Мясные деликатесы»**: Успешно завершен боевой импорт (64 уникальных EAN-продукта из 85 обнаруженных на глубоких страницах 5 подкатегорий, 43 EAN-кода получено через Нацкаталог РК, 53 создано с нуля, 11 обогащено деталями, 14 СТМ-продуктов Arbuz Select отфильтровано).
- ✅ **Парсинг подкатегории «Орехи и сухофрукты»**: Успешно завершен боевой импорт (100 уникальных EAN-продуктов из 141 обнаруженного на глубоких страницах 7 подкатегорий, включая Семечки и Чернослив, 123 EAN-кода получено через Нацкаталог РК, 6 создано с нуля, 94 обогащено деталями).
- ✅ **Синхронизация каталога пилотного магазина MARS**: Выполнен скрипт посева `scripts/seed-store-catalog.cjs` — **9266 активных продуктов** успешно пересинхронизированы!
- ✅ **Каталог и штрихкоды**: Отображение количества продуктов в UX каталога (`showCatalogMeta = true` in `CatalogScreen.jsx` активирована).
- ✅ **Поддержка нескольких EAN на один товар**: `alternate_eans`, `fn_resolve_product` и обработка в `resolver.js`/`offlineDB.js` полностью поддерживают несколько кодов.
- ✅ **Оптимизация загрузки каталога (2026-05-13)**: Заменён sequential batching на единый RPC `fn_get_store_catalog` (migration 029). Время cold-start: 1.5–4s.

---

- **Store-aware AI для пилота**: Перед кодом зафиксированы:
- спецификация: `docs/vault/plans/2026-05-08-store-ai-pilot-spec.md`;
- поэтапный roadmap: `docs/vault/plans/2026-05-09-store-ai-implementation-roadmap.md`.

Решение: делать AI ассистентом конкретного магазина, с store context, локальной историей чата, умными стартовыми подсказками, catalog-grounded рекомендациями, карточками товаров в чате, Product AI upgrade, store AI notes и позже Retail AI Insights. Не делать в V1: полки/карту магазина, live internet search в buyer-чате, собственную локальную модель, серверную историю чатов и большой owner AI chat.

- ✅ Phase 1 foundation: store context helper, локальная история чата, новые AI chips, store-aware general/product prompts. См. `docs/vault/changelog/2026-05-09-store-ai-phase-1-foundation.md` (Полностью реализовано и покрыто unit-тестами).
  Phase 2/3 first pass: общий AI получает catalog candidates из текущего магазина и может вернуть grouped product cards/follow-up chips. См. `docs/vault/changelog/2026-05-09-store-ai-phase-2-3-catalog-cards.md`.
  Phase 4 first pass: Product AI больше не зависит только от `location.state`/legacy no-op lookup; `/s/:storeSlug/product/:ean/ai` резолвит товар через full store fetch, fallback на текущий catalog по primary/alternate EAN, и отправляет AI цену, наличие, EAN и same-store alternatives. См. `docs/vault/changelog/2026-05-09-store-ai-phase-4-product-ai.md`.
  Phase 5 Store AI Notes: создана миграция `027_store_ai_notes.sql`, Retail Settings получил textarea `ai_store_notes` с лимитом 2000 символов и предупреждением про проверяемые факты; notes уже попадают в AI как store facts через существующий context/API. См. `docs/vault/changelog/2026-05-09-store-ai-phase-5-store-notes.md`. Миграция создана локально, но не применялась к Supabase из этой сессии.
  Phase 6 Retail AI Insights: Retail Dashboard получил блок “KÖRSET AI заметил”, который строит 3–5 агрегированных owner-сигналов из existing scans/missed/coverage/lost/top-products data: unknown EAN demand, out-of-stock demand, low catalog coverage, estimated lost revenue, weak product data, top demand and activation nudge. Без owner chat, predictions и user-level analytics. См. `docs/vault/changelog/2026-05-09-store-ai-phase-6-retail-insights.md`.
  Phase 7 launch polish: AI guardrails стали явным тестируемым контрактом: anonymous/auth rate limits, 12-message history, 1200-char single message, 6000-char total payload, 12 catalog candidates, 4 structured groups/12 products, compact max_tokens per AI mode. QA prompt set и known limitations записаны в `docs/vault/plans/2026-05-09-store-ai-phase-7-qa-prompts.md`; changelog: `docs/vault/changelog/2026-05-09-store-ai-phase-7-launch-polish.md`.

  AI contract stabilization (2026-05-15): client/server AI contract re-aligned before further feature work. Product AI now sends EAN, price, stock, store context and same-store alternatives; General AI sends store-scoped catalog candidates and returns normalized structured responses. `/api/ai.js` now explicitly restricts recommendations to products visible in the current store/catalog payload, defaults to `OPENAI_CHAT_MODEL || 'gpt-5.4-nano'`, and uses `max_completion_tokens`. Verification: `npm run check:agent`, targeted AI/API lint, AI unit set 34/34, full unit suite 225/225, `npm run build`. Details: `docs/vault/changelog/2026-05-15-ai-contract-stabilization.md`.

  AI modernization plan (2026-05-15): roadmap split into 5 stages in `docs/vault/plans/2026-05-15-ai-modernization-plan.md`. Stage 1 is complete: General AI follow-up chips are now generated deterministically from query/profile/catalog/lang without extra model calls. Stage 2 is complete: General AI candidate ranking understands plov/dinner, budget, halal, sugar-free and lactose-free intents before the model call; product card groups use shopper-readable titles. Stage 3 is complete: Product AI prompt guardrails now explicitly handle unknown halal status, incomplete composition data, strong allergy caution, no invented facts, and same-store-only alternatives. Stage 4 is complete: QA prompt pack and mocked Playwright smoke cover `/s/:storeSlug/ai` without real OpenAI calls; store context now keeps route slug even if store details are still loading. Stage 5 is complete: default model routing stays on `gpt-5.4-nano`, `gpt-5.4-mini` is only a future/manual high-quality option, and `/api/ai.js` logs compact token/error usage events without user message content. Post-QA pass fixed noisy General AI candidates and polished AI product cards: images/subcategory groups/localized stock labels/collapse/return-from-product persistence. General AI cards now align with explicit product mentions in the assistant reply, reducing text/card mismatch on broad catalog queries. Details: `docs/vault/plans/2026-05-15-ai-qa-prompt-pack.md`.

  AI premium upgrade plan (2026-05-17): current owner direction is "smart shelf consultant" with Apple/Shopify cleanliness plus ChatGPT-like dialogue. New plan: `docs/vault/plans/2026-05-17-ai-premium-upgrade-plan.md`. Important product update: do not make halal handling helpless; use a balanced halal confidence ladder (`confirmed_halal`, `likely_compatible`, `questionable`, `not_halal`, `insufficient_data`) while still avoiding fake certificates, invented facts, or unsafe allergy claims. Next recommended work: Stage 1 quality contract and Stage 2 real-catalog QA before UI polish.

На 2026-05-06:

Auth — **DONE**. Полный deep audit + cleanup завершён. Код стабильный, тесты зелёные. Единственный ручной остаток: вставить 3 email шаблона из `docs/vault/architecture/supabase-email-templates.md` в Supabase Dashboard → Auth → Email Templates. См. `docs/vault/changelog/2026-05-06-auth-deep-audit-cleanup.md`.

Текущий meta-focus — AI-agent memory system:

1. ✅ `AGENTS.md` переписан
2. ✅ `docs/CONTEXT.md` нормализован
3. Далее: frontmatter/status в старые Vault-файлы, oversized files index, query-vault.mjs metadata check

Недавний product/code focus:

- 🔎 **Catalog Search upgrade — Stage 1 audit**: зафиксирован контракт профессионального поиска и текущий search/data flow. Детали: `docs/vault/plans/2026-05-13-catalog-search-stage1-audit.md`. Ключевой вывод: `tsvector`/GIN уже есть и улучшены миграцией 018 (`russian` stemming), но `CatalogScreen.jsx` всё ещё использует клиентский `includes` и серверный `ILIKE`; Stage 2 должен добавить тонкую RPC/`pg_trgm` миграцию без переписывания старых миграций.
- 🔎 **Catalog Search upgrade — Stage 2 RPC foundation**: добавлены `supabase/migrations/028_catalog_search_rpc.sql`, `src/domain/product/search.js`, `src/domain/product/searchMapping.js` и unit-тест mapper-контракта. RPC `fn_search_store_products` делает store-scoped FTS/fuzzy search с `search_rank`/`match_type`, но `CatalogScreen.jsx` ещё не переключён на него. Детали: `docs/vault/changelog/2026-05-13-catalog-search-stage-2-rpc.md`.
- 🔎 **Catalog Search upgrade — Stage 3 CatalogScreen integration**: `CatalogScreen.jsx` больше не делает прямой PostgREST `ILIKE` fallback; server fallback подключён к `searchStoreProductsRPC()` и общему mapper-контракту. Offline/client search и текущий UI сохранены. Детали: `docs/vault/changelog/2026-05-13-catalog-search-stage-3-catalogscreen-rpc.md`.
- 🔎 **Catalog Search upgrade — Stage 4 primary RPC ranking**: online search в `CatalogScreen.jsx` переведён из fallback-only в primary RPC mode для query ≥2 символов; локальный catalog/offline search остаётся fallback-слоем. Добавлены merge/dedupe и sorting по Fit-Check verdict → `searchRank`. Детали: `docs/vault/changelog/2026-05-13-catalog-search-stage-4-primary-rpc-ranking.md`.
- 🔎 **Catalog Search upgrade — Stage 5 search UX**: улучшены loading/no-results состояния в `CatalogScreen.jsx` без редизайна; pending RPC больше не показывает ложное «ничего не найдено», добавлены короткие query suggestions и RU/KZ i18n ключи. Детали: `docs/vault/changelog/2026-05-13-catalog-search-stage-5-search-ux.md`.
- 🔎 **Catalog Search upgrade — Stage 6 search history**: добавлен store-scoped recent search history в `localStorage` (`src/domain/product/searchHistory.js`) и quick chips под поиском при focused empty input. Детали: `docs/vault/changelog/2026-05-13-catalog-search-stage-6-search-history.md`.
- 🔎 **Catalog Search upgrade — Stage 7 search diagnostics**: добавлена невидимая diagnostics-основа для search metadata (`searchMeta`, `data-search-*`) без изменения UX; покрыто unit-тестами. Детали: `docs/vault/changelog/2026-05-13-catalog-search-stage-7-search-diagnostics.md`.
- 🔎 **Catalog Search upgrade — Stage 8 state stabilization**: серверный search state в `CatalogScreen.jsx` стабилизирован в один atomic `serverSearch` object; убран `set-state-in-effect` warning без изменения UX/ranking/fallback. Детали: `docs/vault/changelog/2026-05-13-catalog-search-stage-8-state-stabilization.md`.
- 🔎 **Catalog Search upgrade — Stage 9 quality contract / JS foundation**: зафиксирован широкий professional grocery search plan: релевантность поиска выше Fit-Check в search mode, conservative attribute search, curated RU/KZ/Latin aliases, JS normalizer/offline scorer, RPC ranking v2, diagnostics expansion and real-data QA. Реализован первый JS/offline слой: `src/domain/product/searchQuality.js`, relevance-first local fallback в `CatalogScreen.jsx`, расширенные diagnostics и unit-тесты. Детали: `docs/vault/plans/2026-05-13-catalog-search-stage9-quality-contract.md`; инспекция: `docs/vault/plans/2026-05-14-catalog-search-stage9-inspection.md`; changelog JS foundation: `docs/vault/changelog/2026-05-14-catalog-search-stage9-js-foundation.md`.
- 🔎 **Catalog Search upgrade — Stage 9 RPC v2 migration**: создана `supabase/migrations/030_catalog_search_rpc_v2.sql` с улучшенным `fn_search_store_products`. Добавлены: token-level `word_similarity`, category/subcategory intent boost, ingredients FTS, brand+product combo boost, quantity regex boost, alias ILIKE, halal attribute boost. Return contract, store scoping и security сохранены. Diagnostics обновлены под новые match_type. Все unit-тесты и build/lint проходят. Миграция применена вручную.
- 🔎 **Catalog Search upgrade — Stage 9 RPC v2.1 migration**: создана `supabase/migrations/031_catalog_search_rpc_v2_1.sql` с доводкой до 100%: `normalize_search_quantity()` конвертирует `1л↔1000мл`, `search_category_keywords` lookup table синхронизирован с `categoryMap.js`. Применена вручную.
- 🔎 **Catalog Search upgrade — Stage 9 RPC v2.1 hotfix (migration 032)**: исправлены проблемы performance и duplicate rows в 031. `LEFT JOIN` заменён на scalar subquery, per-token `unnest+word_similarity` заменён на single-call `word_similarity`. Frontend: добавлен 250ms debounce (`debouncedQuery`) в `CatalogScreen.jsx`, разделение `hasQuery` (мгновенный UI) и `isSearching` (debounced поиск). Лаги при вводе устранены.
- ✅ **Landing V3**: Все Unsplash-заглушки (шаги, фоны, превью видео, карточки «Для кого») заменены на локальные высококачественные ИИ-изображения под контекст Казахстана и СНГ.
- Catalog bento showcase доработан.
- i18n migration завершена и защищается `scripts/check-i18n.mjs`

---

## 8. Последний Устойчивый Статус

Auth (DONE — vault: `architecture/auth-system.md`, changelog: `2026-05-06-auth-deep-audit-cleanup.md`):

- AuthScreen: password tab + email-code tab. Google OAuth, email/password, email OTP, reset/update password.
- Shared components: `AuthBackground`, `PasswordRules`, `AuthAlert`, `GoogleLogo`, `EyeBtn`.
- `src/utils/authHelpers.js` — localizeError, validatePassword, isValidEmail. Tests: 9/9.
- 0 hardcoded colors, 0 inline `<style>`, 0 lint errors, 0 dead code.
- Supabase Dashboard: Site URL, Redirect URLs, Providers — verified ✅
- Email templates: ready in vault, need manual Dashboard insertion
- OTP paste: works from any input

i18n:

- Локали лежат в `src/locales/ru/*.json` и `src/locales/kz/*.json`.
- `src/i18n/loader.js` собирает namespaces в flat dictionaries.
- `scripts/check-i18n.mjs` проверяет missing KZ keys, orphan keys, empty values, identical RU/KZ values.
- Новый UI-текст не должен появляться напрямую в JSX.

Design:

- Dark и light themes поддерживаются.
- Не возвращать raw hardcoded white/black цвета для core UI surfaces/text.
- Catalog top-level — 18-card bento showcase.
- Consumer home `/s/:storeSlug` — store-first scan hub with context panel, catalog/AI/history quick actions, contacts and loading/missing-store states. Details: `docs/vault/changelog/2026-05-12-consumer-home-redesign.md`.
- Landing V3 имеет отдельную visual system; детали — в Vault plans/changelog.

Data:

- Категории нормализованы до 18 ключей.
- KZ names и R2/CDN product images используются.
- Unknown EAN — это data-improvement flow, а не повод выдумывать AI-ответ.

---

## 9. Memory System

Слои памяти:

- `AGENTS.md` — стабильные правила поведения агента.
- `docs/CONTEXT.md` — этот файл: быстрый вход, статус, карта.
- `docs/ARCHITECTURE.md` — compact architecture map, не энциклопедия.
- `docs/ROADMAP_PILOT_V1.md` — текущие launch priorities и open decisions, не архив.
- `docs/AI_TASK_MODES.md` — рабочие режимы задач: UI, bugfix, DB, architecture, memory, release.
- `docs/AI_TOOLS_MATRIX.md` — матрица skills/plugins/MCP/checks по типам задач.
- `docs/PROMPT_STARTERS.md` — короткие стартовые промпты для владельца.
- `docs/AI_COLLAB_PROTOCOL.md` — multi-agent workflow.
- `docs/AI_TASK_BOARD.md` и `docs/AI_HANDOFF.md` — лёгкая координация параллельных агентов.
- `docs/vault/architecture/` — подробные system docs.
- `docs/vault/knowledge/` — research/domain knowledge.
- `docs/vault/decisions/` — почему приняты важные решения.
- `docs/vault/plans/` — крупные планы и аудиты.
- `docs/vault/changelog/` — датированные session notes.
- `docs/vault/changelog.md` — legacy changelog/index.

Старт задачи:

1. Прочитать `AGENTS.md` и этот файл.
2. Сделать targeted search по зоне задачи.
3. Использовать Vault RAG только если нужна глубокая проектная память.
4. Для broad architecture/audit/refactor читать `docs/ARCHITECTURE.md` и релевантные Vault notes.

Полезные команды:

```bash
node scripts/query-vault.mjs "auth architecture recovery flow" --domain architecture --count 5
node scripts/query-vault.mjs "catalog bento showcase redesign" --domain changelog --count 5
node scripts/query-vault.mjs "data moat unknown EAN import" --domain knowledge --count 5
node scripts/query-vault.mjs "roadmap pilot blockers" --domain plans --status active --count 5
npm run memory:save
```

Не добавлять сюда длинные session logs. Детали сохранять в Vault, здесь оставлять только короткий durable pointer.

---

## 10. Verification Cheatsheet

Выбирать проверки по затронутой зоне:

```bash
npm run build
npm run lint
npm run test:unit
node scripts/check-i18n.mjs
```

Для UI flows использовать browser/Playwright smoke checks, особенно scanner/catalog/product/auth/landing/mobile.
Для data scripts сначала запускать targeted dry-run/test, если он есть.

---

## 11. Куда Смотреть За Деталями

- Полные правила: `AGENTS.md`
- Глубокая архитектура: `docs/ARCHITECTURE.md`
- Pilot roadmap: `docs/ROADMAP_PILOT_V1.md`
- AI task modes: `docs/AI_TASK_MODES.md`
- AI tools matrix: `docs/AI_TOOLS_MATRIX.md`
- Prompt starters: `docs/PROMPT_STARTERS.md`
- Multi-agent protocol: `docs/AI_COLLAB_PROTOCOL.md`
- Monitoring runbook: `docs/vault/operations/monitoring-runbook.md`
- Auth architecture: `docs/vault/architecture/auth-system.md`
- Offline architecture: `docs/vault/architecture/offline-resilience.md`
- Fit-Check engine: `docs/vault/architecture/fit-check-engine.md`
- Category system: `docs/vault/architecture/category-system.md`
- EAN recovery: `docs/vault/architecture/ean-recovery-system.md`
- Data Moat strategy: `docs/vault/knowledge/data-moat-pipeline-strategy.md`
- Full audit legacy plan: `docs/vault/plans/audit-full.md`
- Recent detailed session notes: `docs/vault/changelog/`
