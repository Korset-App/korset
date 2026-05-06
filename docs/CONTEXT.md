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

- `AlternativesScreen.jsx` требует проверки/фикса: сейчас в коде `useLocalName(product)` вызывается до объявления `product`, плюс есть старые hardcoded colors. Не считать экран production-polished, пока не проверен.
- `docs/ARCHITECTURE.md` содержит старые и новые разделы вместе; перед архитектурными решениями сверять с кодом.
- `docs/ROADMAP_PILOT_V1.md` содержит старый дедлайн и старую dual-agent модель; использовать как источник идей, но не как безусловную текущую правду.
- `docs/vault/changelog.md` большой и legacy-like; лучше искать свежие детали в `docs/vault/changelog/`.
- Некоторые крупные Vault plans могут быть устаревшими; проверять статус и дату.
- `scripts/embed-vault.mjs` нужно отдельно аудировать на Windows path/domain extraction и фильтрацию superseded docs.

---

## 6. Критичные Правила Проекта

Полные правила — в `AGENTS.md`. Кратко:

- Общаться с владельцем на русском.
- Код, имена и технические комментарии — на английском.
- Не соглашаться слепо: если владелец или документы ошибаются, честно сказать.
- Не выдумывать факты. Сначала проверить локальный контекст, потом спрашивать.
- Маленькие безопасные фиксы можно делать сразу; крупные UI/DB/auth/architecture/product-scope изменения — через план и approval.
- Не менять дизайн без разрешения.
- Правки должны быть хирургическими и связанными с задачей.
- Новый пользовательский текст — через i18n RU/KZ.
- Dark/light themes обязательны; цвета core UI — через CSS variables.
- Аватары — только `<ProfileAvatar />`.
- Не запускать ручной `vercel --prod`.
- Продуктовые решения оценивать через B2B: помогает ли это продавать/удерживать подписки магазинов?

---

## 7. Текущий Фокус

На 2026-05-06:

Auth — **DONE**. Полный deep audit + cleanup завершён. Код стабильный, тесты зелёные. Единственный ручной остаток: вставить 3 email шаблона из `docs/vault/architecture/supabase-email-templates.md` в Supabase Dashboard → Auth → Email Templates. См. `docs/vault/changelog/2026-05-06-auth-deep-audit-cleanup.md`.

Текущий meta-focus — AI-agent memory system:
1. ✅ `AGENTS.md` переписан
2. ✅ `docs/CONTEXT.md` нормализован
3. Далее: frontmatter/status в старые Vault-файлы, oversized files index, query-vault.mjs metadata check

Недавний product/code focus:
- Catalog bento showcase и Landing V3 недавно дорабатывались
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
