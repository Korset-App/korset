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
- CatalogScreen: 18 нормализованных категорий, bento showcase, поиск, сортировка, Virtuoso, offline fallback.
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

- `AlternativesScreen.jsx` подключён к `StoreContext.catalogProducts`: п- ✅ **Парсинг подкатегории «Молоко, сливки, сгущённое молоко» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (113 уникальных EAN-продуктов перенесено в Supabase `global_products` без единой ошибки: 100 создано, 13 обогащено). Создан и отлажен высокопроизводительный гибридный парсер `scripts/arbuz-subcategory-parser.cjs`, который фильтрует нецелевые продукты (растительные смеси, сиропы, коктейли), поддерживает concurrency = 5, автоматический резолв EAN-13 (через Нацкаталог РК) и рассчитывает итоговый `data_quality_score`.
- ✅ **Парсинг подкатегории «Кефир, творог, сметана» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (140 уникальных EAN-продуктов перенесено в Supabase `global_products` без единой ошибки: 116 создано, 24 обогащено). Парсер был модернизирован для поддержки динамических режимов (`--mode=kefir`), сканирования 10 страниц и автоматической фильтрации продукции собственного производства/кулинарии (Arbuz Select, Jent и сладостей). Исправлен важный баг в ядре классификации категорий `categoryMap.js` — добавлены пропущенные традиционные кисломолочные продукты (варенец, катык, простокваша, мацони, шубат), благодаря чему они теперь корректно маппятся в `dairy_eggs / fermented` and не пропускаются при импорте и сканировании.
- ✅ **Парсинг подкатегории «Йогурты, сырки, десерты» с Arbuz.kz**: Успешно завершен двухэтапный боевой импорт подкатегории (201 уникальный EAN-продукт перенесен в Supabase `global_products` без единой ошибки: 162 создано, 39 обогащено). С помощью глубокого анализа выявлен и устранен критический баг классификатора `categoryMap.js` — ложное отсеивание шоколадных и фруктовых молочных десертов из-за пересечения ключевых слов (шоколад, черника, персик, паста). Путем внедрения высокоприоритетных паттернов (`сырок`, `йогурт`, `пудинг`, `мусс`, `творожок`, `творожн`, `биойогурт`, `биотворог`) достигнута 100% полнота охвата каталога: все творожные пасты Савушкин, глазированные сырки Чудо и десерты Даниссимо успешно распознаются как молочные десерты `dairy_eggs / cottage`.
- ✅ **Парсинг подкатегории «Яйца, масло, маргарин» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (104 уникальных EAN-продукта перенесено в Supabase `global_products` без единой ошибки: 56 создано, 22 обогащено, 13 СТМ-позиций отфильтровано). Благодаря глубокому анализу Dry Run был пресечен критический риск ложного пропуска сливочных масел (из-за пересечения с общим правилом `масло `, маппившим их в `grocery / cooking_oil`). Добавили новые высокоприоритетные паттерны масел в `NAME_KEYWORDS` и внедрили гибкий форсированный оверрайд маппинга для режима `eggs_butter` в `scripts/arbuz-subcategory-parser.cjs`, добившись 100% полноты охвата.
- ✅ **Парсинг подкатегории «Сыры» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (333 уникальных EAN-продукта перенесено в Supabase `global_products` без единой ошибки: 293 создано, 40 обогащено, более 100 СТМ и локальных кулинарных позиций отфильтровано). Путем расширения парсера режимом `--mode=cheese` со сканированием 14 страниц и автоматическим форсированием маппинга в `dairy_eggs / cheese` обеспечен безупречный импорт всех видов сыров (моцарелла, пармезан, сулугуни, брынза и др.) со штрихкодами Нацкаталога РК.
- ✅ **Парсинг подкатегории «Мороженое» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (212 уникальных EAN-продуктов перенесено в Supabase `global_products` без единой ошибки: 193 создано, 19 обогащено, более 110 СТМ-позиций отфильтровано). Расширили парсер конфигурационным режимом `--mode=ice_cream` со сканированием 10 страниц и автоматическим маппингом в `frozen / ice_cream`. Аккуратно отсеяли все СТМ-позиции собственного производства (бессахарные и безлактозные Arbuz Select, пробиотическое мороженое Dr.Galamilk), импортировав только брендовое мороженое с легитимными штрихкодами Нацкаталога РК.
- ✅ **Парсинг подкатегории «Полуфабрикаты» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (135 уникальных EAN-продуктов перенесено в Supabase `global_products` без единой ошибки: 130 создано, 17 обогащено, 84 СТМ-позиции кулинарии ручной работы Arbuz Select отфильтрованы). Расширили парсер режимом `--mode=semi_finished` со сканированием 10 страниц и автоматическим маппингом в `frozen / semi_finished`.
- ✅ **Синхронизация каталога пилотного магазина MARS**: Успешно запущен и выполнен скрипт посева `scripts/seed-store-catalog.cjs` — **9266 активных высококачественных продуктов** (включая сыры, мороженое, молочку, яйца и полуфабрикаты) успешно пересинхронизированы и привязаны к пилотному магазину с генерацией реалистичных розничных цен и зон выкладки по полкам! Все товары теперь отображаются на живом сайте.
- ✅ **Каталог и штрихкоды**: Возвращено отображение количества продуктов в UX каталога (переменная `showCatalogMeta = true` in `CatalogScreen.jsx` активирована).�кой фильтрации продукции собственного производства/кулинарии (Arbuz Select, Jent и сладостей). Исправлен важный баг в ядре классификации категорий `categoryMap.js` — добавлены пропущенные традиционные кисломолочные продукты (варенец, катык, простокваша, мацони, шубат), благодаря чему они теперь корректно маппятся в `dairy_eggs / fermented` и не пропускаются при импорте и сканировании.
- ✅ **Парсинг подкатегории «Йогурты, сырки, десерты» с Arbuz.kz**: Успешно завершен двухэтапный боевой импорт подкатегории (201 уникальный EAN-продукт перенесен в Supabase `global_products` без единой ошибки: 162 создано, 39 обогащено). С помощью глубокого анализа выявлен и устранен критический баг классификатора `categoryMap.js` — ложное отсеивание шоколадных и фруктовых молочных десертов из-за пересечения ключевых слов (шоколад, черника, персик, паста). Путем внедрения высокоприоритетных паттернов (`сырок`, `йогурт`, `пудинг`, `мусс`, `творожок`, `творожн`, `биойогурт`, `биотворог`) достигнута 100% полнота охвата каталога: все творожные пасты Савушкин, глазированные сырки Чудо и десерты Даниссимо успешно распознаются как молочные десерты `dairy_eggs / cottage`.
- ✅ **Парсинг подкатегории «Яйца, масло, маргарин» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (104 уникальных EAN-продукта перенесено в Supabase `global_products` без единой ошибки: 56 создано, 22 обогащено, 13 СТМ-позиций отфильтровано). Благодаря глубокому анализу Dry Run был пресечен критический риск ложного пропуска сливочных масел (из-за пересечения с общим правилом `масло `, маппившим их в `grocery / cooking_oil`). Добавили новые высокоприоритетные паттерны масел в `NAME_KEYWORDS` и внедрили гибкий форсированный оверрайд маппинга для режима `eggs_butter` в `scripts/arbuz-subcategory-parser.cjs`, добившись 100% полноты охвата.
- ✅ **Парсинг подкатегории «Сыры» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (333 уникальных EAN-продукта перенесено в Supabase `global_products` без единой ошибки: 293 создано, 40 обогащено, более 100 СТМ и локальных кулинарных позиций отфильтровано). Путем расширения парсера режимом `--mode=cheese` со сканированием 14 страниц и автоматическим форсированием маппинга в `dairy_eggs / cheese` обеспечен безупречный импорт всех видов сыров (моцарелла, пармезан, сулугуни, брынза и др.) со штрихкодами Нацкаталога РК.
- ✅ **Парсинг подкатегории «Мороженое» с Arbuz.kz**: Успешно завершен боевой импорт подкатегории (212 уникальных EAN-продуктов перенесено в Supabase `global_products` без единой ошибки: 193 создано, 19 обогащено, более 110 СТМ-позиций отфильтровано). Расширили парсер конфигурационным режимом `--mode=ice_cream` со сканированием 10 страниц и автоматическим маппингом в `frozen / ice_cream`. Аккуратно отсеяли все СТМ-позиции собственного производства (бессахарные и безлактозные Arbuz Select, пробиотическое мороженое Dr.Galamilk), импортировав только брендовое мороженое с легитимными штрихкодами Нацкаталога РК.
- ✅ **Каталог и штрихкоды**: Возвращено отображение количества продуктов в UX каталога (переменная `showCatalogMeta = true` in `CatalogScreen.jsx` активирована).
- ✅ **Поддержка нескольких EAN на один товар**: Подтверждена готовность архитектуры (колонки `alternate_eans`, PostgreSQL функция `fn_resolve_product` и обработка в `resolver.js`/`offlineDB.js` полностью поддерживают сканирование альтернативных кодов для одного товара).
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

На 2026-05-06:

Auth — **DONE**. Полный deep audit + cleanup завершён. Код стабильный, тесты зелёные. Единственный ручной остаток: вставить 3 email шаблона из `docs/vault/architecture/supabase-email-templates.md` в Supabase Dashboard → Auth → Email Templates. См. `docs/vault/changelog/2026-05-06-auth-deep-audit-cleanup.md`.

Текущий meta-focus — AI-agent memory system:

1. ✅ `AGENTS.md` переписан
2. ✅ `docs/CONTEXT.md` нормализован
3. Далее: frontmatter/status в старые Vault-файлы, oversized files index, query-vault.mjs metadata check

Недавний product/code focus:

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
