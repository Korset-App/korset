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

- HomeScreen `/s/:storeSlug` is now a full mobile-first store entry screen, not the old lightweight layout: compact store-first header (`logo + store name + by Körset + hours + about`), glass avatar menu, horizontal story highlight cards with story viewer, primary scan CTA, inline Fit-Check setup, AI/catalog shortcuts, and a store card. Source files: `src/screens/HomeScreen.jsx`, `src/screens/HomeScreen.css`, `src/domain/home/homeScreenModel.js`; detailed handoff: `docs/vault/changelog/2026-05-26-home-screen-full-redesign.md`.

- Сканер штрихкодов с ручным вводом EAN.
- Product resolution через store catalog/global products, IndexedDB offline cache и enrichment paths.
- ProductScreen: Fit-Check, факты товара, цена/store overlay, unknown-EAN request flow, переходы к AI/compare/alternatives, интерактивный состав. Состав реализован как отдельная подсистема: `src/domain/product/ingredientAnalysis.js`, `src/components/product/IngredientsPreview.jsx`, `src/components/product/IngredientInfoSheet.jsx`, экран `/s/:storeSlug/product/:ean/composition` (`src/screens/ProductCompositionScreen.jsx`). Цвета состава зависят от смысла для профиля: красный = конфликт, оранжевый = возможный риск/проверка, янтарный = добавка/E-код, фиолетовый = информационный компонент. AI-переход по ингредиенту только предзаполняет вопрос, без автоотправки. Handoff: `docs/vault/changelog/2026-05-30-product-composition-interactive.md`.
- CompareScreen: сравнение двух товаров через scan flow.
- AIScreen/AIAssistantScreen: product/general/compare AI modes, серверный `/api/ai.js`, RAG через `vault_embeddings`. Current AI UI redesign brief: `docs/vault/plans/2026-05-27-ai-assistant-visual-redesign-brief.md` — Stage 2-12 are complete for `/s/:storeSlug/ai`: CSS foundation, glass sticky header, premium empty state, six capability cards, composer dock, polished messages, local-only store-scoped chat history bottom sheet via IndexedDB, mobile QA at 390/430 in dark/light, and V1 voice-to-text. Voice-to-text is push-to-record only: `MediaRecorder` client flow, `/api/ai-transcribe`, 30s max, no auto-send, recognized text inserted into composer, no audio persistence. Post-Stage 12 voice UI polish added distinct recording/requesting/uploading/transcribing labels, live status announcements, smoother stop-to-processing transition, subtle progress animation, browser-draft fallback when server transcription is unavailable, local/HTTPS microphone diagnostics, and reduced-motion handling. No Supabase/server chat persistence is implemented. Stage 10 handoff: `docs/vault/changelog/2026-05-29-ai-assistant-stage10-local-history-ui.md`; Stage 11 handoff: `docs/vault/changelog/2026-05-29-ai-assistant-stage11-mobile-qa.md`; Stage 12 handoff: `docs/vault/changelog/2026-05-29-ai-assistant-stage12-voice-to-text.md`; voice polish handoff: `docs/vault/changelog/2026-05-30-ai-assistant-stage12-voice-polish.md`.
- AI voice stability fix (2026-05-31): `/s/:storeSlug/ai` clamps auto-stopped 30s recordings before validation so timer drift does not discard audio, voice text appends to existing composer text instead of replacing it, and the composer is now a multi-row auto-growing textarea. Handoff: `docs/vault/changelog/2026-05-31-ai-assistant-voice-composer-stability.md`.
- AI Stage 13 image/camera design gate (2026-05-31): approved future V1 image input for camera + gallery, package-only grocery analysis, temporary local preview only, no image persistence in Supabase/IndexedDB/history/logs, one image per message, hard compression/size/MIME/rate limits, no auto-send, and cautious package-verification wording. Handoff: `docs/vault/changelog/2026-05-31-ai-assistant-stage13-image-camera-design-gate.md`.
- AI Stage 14 image/camera implementation (2026-05-31): `/s/:storeSlug/ai` now has a package-photo composer control with camera/gallery selection, compact preview, remove, no auto-send, text+image or image-only send, and no image persistence in chat history/local storage/server storage. Image analysis uses separate `/api/ai-image` with package-only prompt, MIME/size/payload validation, hard limits, separate rate limits, metadata-only logging, and no generic image chat. Handoff: `docs/vault/changelog/2026-05-31-ai-assistant-stage14-image-camera-implementation.md`.
- AI Stage 15 mobile composer QA (2026-05-31): added mocked Playwright coverage for 390px dark and 430px light composer states with long textarea text, image preview, active voice panel, bottom-nav spacing, and no horizontal overflow. No runtime UI fix was required. Handoff: `docs/vault/changelog/2026-05-31-ai-assistant-stage15-mobile-composer-qa.md`.
- Next AI visual polish owner feedback is captured in `docs/vault/plans/2026-06-01-ai-assistant-visual-polish-owner-feedback.md`: header glass/title readability, scan-screen SVG history icon reuse, non-glass minimal empty state, capability count decision, composer alignment/height/bottom-nav spacing, adaptive bottom padding, and denser mobile message typography.
- AI visual polish pass (2026-06-01): `/s/:storeSlug/ai` now uses a landing-like minimal glass header with solid `Körset AI` text (no gradient/no separate badge), shared SVG `HistoryIcon`, minimal non-glass empty intro, four 2x2 solid capability cards (find product, budget, composition, shopping list), responsive compact/expanded composer, measured bottom-nav/composer spacing via CSS variables, and denser message typography. Handoff: `docs/vault/changelog/2026-06-01-ai-assistant-visual-polish-pass.md`.
- CatalogScreen: 18 нормализованных категорий, bento showcase, магазинный бейдж в хедере ведёт на `/stores/:storeSlug`, поиск с отдельным scan shortcut на `/s/:storeSlug/scan`, обучающая подсказка на главном виде категорий, view toggle grid/list (grid first and default), минималистичные выпадающие панели с поддержкой мульти-выбора подкатегорий, продвинутая сортировка (по Fit-Check, цене, белку, сахару) с иконками, 4-уровневый Fit-Check badge, единые тёмные премиальные category-card градиенты с белыми названиями, mix-blend-mode на изображениях, skeleton loading state, Virtuoso, offline fallback. Карточка товара вынесена в `src/components/catalog/CatalogProductCard.jsx`, стили карточки — в `src/components/catalog/CatalogProductCard.css`, модель компактных бейджей/ккал — в `src/domain/catalog/catalogProductCardModel.js`; карточка показывает Fit-Check с локальными SVG-иконками, все доступные теги (халал/диетические, включая `keto`/`low_carb`) и ккал без пустого места. Бейджи намеренно не pill-999px: Fit-Check, halal/sugar-free/lactose/gluten/vegan/keto/kcal имеют разные спокойные оттенки; до 3 бейджей в list-карточке держатся в одну строку. Compare CTA использует общий `src/components/icons/CompareIcon.jsx` со сканером и compare-banner. List-карточка держит цену сверху справа и compare CTA снизу справа через absolute action column; body имеет min-height по thumbnail, а badge row получает `margin-top: auto`, чтобы короткие и длинные названия держали одну нижнюю baseline. Для 320–360px есть отдельный CSS guard, который уменьшает поля/thumbnail и расширяет центральную колонку. `CatalogScreen.jsx` отвечает за данные/навигацию и делегирует list/grid карточки компоненту. Счётчики товаров отключены (`showCatalogMeta = false`).
- Post-pilot technical debt: полный рефакторинг оставшегося `CatalogScreen.jsx` отложен до после пилота, чтобы не задерживать запуск. Карточку уже можно полировать визуально через `CatalogProductCard.*`; не трогать search/filter/category/server/offline/Virtuoso logic без отдельного плана. Детальный handoff: `docs/vault/plans/2026-05-27-catalogscreen-post-pilot-refactor.md`.
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
- Settings: данные магазина, opening hours, logo upload, QR для магазина, notification toggles, clear catalog danger-zone.
- Repair migration `045_repair_store_opening_hours.sql` added so `public.stores.opening_hours` exists in fresh/prod databases again; live Supabase must still receive the migration to persist the field.
- Repair migration `046_fix_stores_billing_guard.sql` added to replace the stale `stores.expires_at` check with `stores.plan_expires_at`; this unblocks ordinary store profile updates on live databases where the old guard survived.
- EAN Recovery: отдельный экран + `/api/ean-recovery`.
- Multi-store: RetailEntryScreen поддерживает >1 магазина на владельца (выбор магазина). Управление: `scripts/create-store.mjs`, `scripts/deactivate-store.mjs`.

Stores:

- 3 активных минимаркета в Усть-Каменогорске: Марс (slug: mars, ~10K products), Нұрлы (slug: nurly, ~2.5K products), Калина (slug: kalina, ~2K products).
- `/stores` — modern store selector между лендингом и consumer store context: theme-aware dark/light logos, RU/KZ i18n, поиск по магазину/району/адресу/типу, компактные карточки с логотипом/fallback, статусом, адресом, графиком-заглушкой и Telegram B2B CTA. Декоративная hero-плашка, псевдо-статистика, grid/orb фон и shine-эффекты намеренно убраны. После owner feedback dark theme возвращена к спокойному минималистичному виду; фиолетовый акцент должен использоваться в тексте/типографике, а не в фоне, панели или карточках. Mars address нормализуется до `ул. Абая`. Пилотные магазины `mars`/`nurly`/`kalina` используют локальные SVG-логотипы из `public/store-logos/`; прочие магазины сохраняют uploaded `logo_url`. Логика карточек вынесена в `src/domain/stores/listing.js`, стили — `src/screens/StoresScreen.css`.
- Добавление магазина: `node scripts/create-store.mjs --slug xxx --name "Name" --type minimarket --city "City" --owner-email xxx@korset.kz --owner-password Pass!`
- Деактивация: `node scripts/deactivate-store.mjs --slug xxx`
- Сидирование каталога: `node scripts/seed-store-catalog.mjs --store-slug xxx --max-products N --category-weights '{...}'`

Infrastructure:

- RLS и JWT-protected APIs для чувствительных действий.
- Sentry frontend/backend, Telegram alerts, health endpoint.
- Offline app shell, IndexedDB catalog cache, pending scan queue, OfflineBanner.
- RAG memory через Supabase pgvector и `docs/vault/`.
- Dark/light themes через semantic CSS tokens.
- Telegram Support Bot (@korset_support_bot): `api/telegram-webhook.js` (webhook verified via `secret_token`), Supabase `support_tickets`/`support_messages`, RU/KZ i18n. Raw Telegram API (без grammy). Spec: `docs/vault/plans/2026-05-23-telegram-support-bot-spec.md`; security: docs/vault/changelog/2026-05-24-telegram-webhook-security.md.

---

## 5. Важные Риски И Не Считать “Готовым”

- Альтернативы товара реализованы как server-side RPC-first flow через миграцию `033_product_alternatives_rpc.sql` и `fn_get_product_alternatives`, с local/offline fallback через `StoreContext.catalogProducts`.
- Alternatives UX поддерживает сценарии `similar` / `fits_me` / `cheaper` / `better_composition`, compare CTA на каждой альтернативе, ProductScreen callout при рискованном Fit-Check и контекстный AI intent `alternative_selection`. Analytics использует metadata-only `alternative_events` через миграцию `035_alternative_events.sql`: без профиля, аллергенов, состава, AI-сообщений и PII. Retail Dashboard показывает агрегированный блок `Сигналы альтернатив` для владельца магазина и получает сводку через RPC `fn_get_alternative_events_summary` из миграции `036_alternative_events_summary_rpc.sql`; retail AI-insights умеет поднимать actionable сигнал по активному выбору альтернатив. План/статус: `docs/vault/plans/2026-05-22-alternatives-professional-upgrade-plan.md`; changelog: `docs/vault/changelog/2026-05-22-alternatives-professional-upgrade.md`.

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
- ✅ **Парсинг подкатегории «Орехи и сухофрукты»**: Успешно завершен боевой импорт (100 уникальных EAN-продуктов из 141 обнаруженного на глубоких страницах 7 подкатегорий, включая Семечки и Чернослив, 123 EAN-кода получено через Нацкаталог РК, 6 создано с нуля, 94 обогащено деталями). Дополнительно проведена оптимизация: семечки выделены из сухофруктов в отдельную категорию `snacks / seeds` (59 чистых продуктов).
- ✅ **Парсинг подкатегорий «Альтернативное растительное молоко» и «Детские напитки»**: Дополнительно импортировано и обогащено **47 продуктов альтернативного молока** (Alpro, Borges, Nemoloko — EAN-коды сопоставлены с Нацкаталогом РК, добавлены в `dairy_eggs / milk` для полноценного Fit-Check покрытия лактозной непереносимости) и **52 детских сока/воды** (ФрутоНяня и др. — добавлены в `water_beverages / juice` и `water_beverages / water`).
- ✅ **Парсинг подкатегории «Чипсы и попкорн»**: Успешно завершен глубокий боевой импорт (173 уникальных продукта из всех вложенных подкатегорий, включая картофельные, кукурузные чипсы, водоросли нори и попкорн. Получено **137 уникальных EAN-продуктов** после дедупликации, 152 EAN-кода сопоставлены с Нацкаталогом РК, 13 создано с нуля, 124 обогащено деталями, классифицированы в `snacks / chips`).
- ✅ **Парсинг подкатегории «Закуски и снеки»**: Успешно завершен глубокий боевой импорт (128 уникальных продуктов из всех вложенных подкатегорий, включая сухарики, крекеры, семечки, кукурузные палочки, попкорн и закуски к пиву. Получено **89 уникальных EAN-продуктов** после дедупликации, 114 EAN-кодов сопоставлены с Нацкаталогом РК, 39 создано с нуля, 50 обогащено деталями КБЖУ и составами, классифицированы в `snacks / seeds`, `snacks / crackers`, `snacks / chips` и `snacks / fish_snacks`).
- ✅ **Парсинг подкатегории «Кофе и какао»**: Успешно завершен глубокий боевой импорт (326 уникальных продуктов из всех вложенных подразделов, включая растворимый, молотый, зерновой кофе, 3 в 1, капсулы, горячий шоколад/какао-порошок и плодово-ягодные кисели. Получено **230 уникальных EAN-продуктов** после дедупликации, 279 EAN-кодов сопоставлены с Нацкаталогом РК, 194 создано с нуля, 36 обогащено деталями КБЖУ и составами, классифицированы в `tea_coffee / coffee` и `water_beverages / lemonade`).
- ✅ **Парсинг подкатегории «Чай»**: Успешно завершен глубокий боевой импорт (258 уникальных продуктов из вложенных подразделов чая, включая черный, зеленый, травяной, фруктовый и подарочный чай. Получено **174 уникальных EAN-продукта** с сопоставлением через Нацкаталог РК, отфильтрованы СТМ Arbuz Select, классифицированы в `tea_coffee / tea`).
- ✅ **Парсинг подкатегории «Печенье, вафли, пряники»**: Успешно завершен глубокий боевой импорт (468 уникальных продуктов из всех вложенных подразделов печенья, вафель и пряников. Получено **331 уникальный EAN-продукт** после дедупликации, 398 EAN-когов сопоставлены с Нацкаталогом РК, 276 создано с нуля, 55 обогащено деталями КБЖУ и составами, классифицированы в `sweets / cookies` и `sweets / pastries`, отфильтрованы СТМ Arbuz Select).
- ✅ **Парсинг подкатегории «Шоколад, батончики, паста»**: Успешно завершен глубокий боевой импорт (326 уникальных продуктов из всех вложенных подразделов шоколада, плиток, батончиков и шоколадных паст. Получено **253 уникальных EAN-продукта** после дедупликации, 276 EAN-кодов сопоставлены с Нацкаталогом РК, 181 создано с нуля, 72 обогащено деталями КБЖУ и составами, классифицированы в `sweets / chocolate`, отфильтрованы СТМ Arbuz Select).
- ✅ **Парсинг подкатегории «Конфеты, зефир, мармелад» (повторный, 2026-05-24)**: Глубокий реимпорт через Catalog API (`--strategy=catalog`, catalogId: 225041). Категория содержит **8 дочерних подкатегорий** (Сладкие подарки, Полезные батончики, Конфеты весовые, Конфеты/карамель/леденцы, Зефир/мармелад/пастила, Конфеты в коробках, Восточные сладости, Жевательная резинка). Обнаружено **739 продуктов** через API, **715 обработано** (СТМ Arbuz Select и жент отфильтрованы). После EAN-дедупликации получено **469 уникальных EAN-продуктов**: 327 создано с нуля, 142 обогащено. **716 NPC-матчей** (почти каждый продукт получил от 1 до 15+ штрих-кодов через Нацкаталог РК). Только 10 продуктов остались с `arbuz_`-фолбеком. Ошибок: 0. Классифицированы в `sweets / candy`, `sweets / halva`, `sweets / honey_jam`.
- ✅ **Halal enrichment (2026-05-24)**: Пофикшен баг — 16 продуктов с "халал/халяль" в названии отмечены `halal_status = yes` (были `unknown` из-за того, что старый `arbuz-catalog-parser.cjs` не вызывал `extractAllAttributes`). Исследованы публичные халал-API: Verify Halal, Halal Food Checker (RapidAPI), Halal AI — все без публичного API. Собран реестр **1130 сертифицированных предприятий** с HalalDamu.KZ (875 уникальных, категории: общепит 352, кондитерка 141, фастфуд 93, полуфабрикаты 89, мясные 66, молочные 49 и др.). Данные сохранены в `data/halaldamu-registry-certified.json`. Автоматический brand-кроссреференсинг даёт много ложных срабатываний — требуется ручная верификация.
- ✅ **Ingredient-based halal analysis (2026-05-24)**: Проанализированы `ingredients_raw` **9532 продуктов** (все с `halal_status=unknown`). Результаты: 0 явных халал-маркеров в ингредиентах, **23 продукта с E120 (кармин) и E904 (шеллак)** → marked `no`, **53 продукта со свининой в названии** → marked `no`. **156 продуктов с подозрительными E-кодами** (E322, E471, E476, E415 и др.) — отчёт сохранён, автообновление не применялось (источник не верифицирован). Скрипты: `scripts/halal-ingredient-analysis.cjs`, `scripts/fix-haram-from-name.cjs`. Отчёт: `data/halal-e-code-report.json`.
- ✅ **AHIK registry scraped (2026-05-24)**: Собран реестр **668 уникальных предприятий** с halal-kz.kz (AHIK, JAKIM-recognised). 368 active, 298 expired, 2 stopped. Категории: услуги (97), молочные (53), мясокомбинаты (44), вода/напитки (42), кондитерка (28), полуфабрикаты (28). Данные: `data/ahik-registry-enterprises.json`.
- ❌ **Open Food Facts halal enrichment**: Протестировано — очень низкое покрытие KZ (0.2% совпадений). 205 халал-продуктов из KZ/RU в OFF, 0 совпадений с нашей БД.
- ⚠️ **Brand cross-reference v3**: Объединённые реестры (1527 компаний) + keyword matching. 9 точных совпадений (Рахат, Баян Сулу). Keyword matching даёт много false positives (common words: bakery, gold, fresh, cook).
- ✅ **Ingredient-based halal анализ выполнен**: 9532 продуктов проанализированы, 76 новых `no` (E120/E904 + свинина в названии). Отчёт по E-кодам: `data/halal-e-code-report.json`.
- ✅ **Mustakshif batch halal (2026-05-25)**: Проверены все 11 862 продукта с `halal_status=unknown` через mustakshif.com. Результат: +224 YES, итого yes=822 (6.9%), no=84 (0.7%), unknown=10 956 (92.4%). Mustakshif "no" вердикты игнорировались (Coca-Cola marked not Halal — ненадёжные данные). Mustakshif закрыт как источник халал-данных. Скрипт: `scripts/mustakshif-halal-check.cjs` (с поддержкой `--resume`).
- ✅ **База знаний по скрапингу (2026-05-17)**: Создана база знаний и подробное руководство [arbuz-scraping-handbook.md](file:///c:/projects/korset/docs/vault/operations/arbuz-scraping-handbook.md) для максимально плавной передачи контекста и эффективного парсинга в будущих чатах.
- ✅ **Синхронизация каталога пилотного магазина MARS**: Выполнен скрипт посева `scripts/seed-store-catalog.cjs` — **10 228 активных продуктов** успешно пересинхронизированы!
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

  AI premium upgrade plan (2026-05-17): current owner direction is "smart shelf consultant" with Apple/Shopify cleanliness plus ChatGPT-like dialogue. Main plan: `docs/vault/plans/2026-05-17-ai-premium-upgrade-plan.md`. Launch readiness handoff: `docs/vault/plans/2026-05-17-ai-premium-launch-readiness.md`. Important product update: do not make halal handling helpless; use a balanced halal confidence ladder (`confirmed_halal`, `likely_compatible`, `questionable`, `not_halal`, `insufficient_data`) while still avoiding fake certificates, invented facts, or unsafe allergy claims. V2 decisions: AI should proactively offer next steps, use adaptive answer formats, use internal Fit Priority ranking without misleading public magic scores, respect deterministic Fit-Check as the source of truth, and treat controlled web enrichment for missing product facts as a separate design task before implementation. Stages 1-7 are locally implemented. First live OpenAI QA gate was owner-approved and run on 2026-05-17: 10 initial `gpt-5.4-nano` scenarios exposed internal confidence label leakage, child snack caution wording, and one soft milk-allergy alternative answer; `api/ai.js` was tightened, AI prompt tests expanded, and the 5 affected live scenarios reran successfully. Verification after fixes: AI unit tests 77/77, mocked General+Product AI smoke 2/2, `npm run check:agent` passes. Details: `docs/vault/changelog/2026-05-17-ai-premium-live-qa-gate.md`.

  AI peak quality roadmap (2026-05-17): after the premium upgrade, the next work must proceed stage-by-stage from `docs/vault/plans/2026-05-17-ai-peak-quality-roadmap.md`. Stage 8 created `src/domain/ai/qualityEvaluator.js` and tests for internal label leakage, outside-store products, unsafe allergy wording, and uncontrolled external-data wording. Next stage should build a no-spend RU/KZ QA matrix runner before more live OpenAI QA or controlled enrichment. Details: `docs/vault/changelog/2026-05-17-ai-peak-stage8-quality-os.md`.

  AI peak Stage 9 no-spend QA gate (2026-05-17): `npm run check:ai:qa` now runs `scripts/run-ai-quality-gate.mjs` against 12 mocked RU/KZ General/Product AI scenarios without OpenAI/network calls. The gate uses `src/domain/ai/noSpendQualityGate.js` + `evaluateAIResponseQuality()` and reports pass/review/fail plus grouped issue tags. Latest verification: 12/12 no-spend scenarios pass; unit test `tests/unit/aiNoSpendQualityGate.test.mjs` passes 4/4. Details: `docs/vault/changelog/2026-05-17-ai-peak-stage9-no-spend-qa.md`.

  AI peak Stage 10 live QA prep (2026-05-17): expanded live QA is prepared but not yet run. `npm run check:ai:live:dry` lists 13 RU/KZ General/Product scenarios without loading `.env.local` or calling OpenAI. Live calls require explicit owner approval and command `node scripts/run-live-ai-quality-gate.mjs --live --save C:\tmp\korset-live-ai-stage10-results.json`. Details: `docs/vault/changelog/2026-05-17-ai-peak-stage10-live-qa-prep.md`.

  AI peak Stage 10 live QA gate (2026-05-17): owner-approved live QA ran 13 real `gpt-5.4-nano` calls and got 13/13 evaluator pass. Manual review still caught a KZ polish issue: `in_stock` leaked into one answer. Fixed by humanizing stock statuses in `api/ai.js` prompts and expanding `evaluateAIResponseQuality()` internal-label detection to `stockStatus`, `in_stock`, `out_of_stock`, and `priceKzt`. Targeted KZ rerun ran 3 calls and passed 3/3 with no internal stock labels. Result files: `C:\tmp\korset-live-ai-stage10-results.json` and `C:\tmp\korset-live-ai-stage10-kz-rerun.json`. Details: `docs/vault/changelog/2026-05-17-ai-peak-stage10-live-qa-gate.md`.

  AI peak Stage 11 premium response polish (2026-05-17): product/general AI prompts now explicitly forbid visible markdown formatting (`**`, bullets, headings, tables), keep answers compact, and preserve the premium next-step contract. `evaluateAIResponseQuality()` now flags visible markdown and missing next steps when a scenario requires them; the no-spend QA gate reports those as dedicated issue tags. Verification: AI unit tests 95/95, `npm run check:ai:qa` 12/12, `npm run check:ai:live:dry` dry run only. Details: `docs/vault/changelog/2026-05-17-ai-peak-stage11-response-polish.md`.

  AI peak Stage 12 controlled enrichment contract (2026-05-17): added side-effect-free `src/domain/ai/enrichmentContract.js` and tests for future external product fact lookup. The contract allows enrichment only for weak product cards or missing exact facts, builds requests only from precise identifiers, classifies external candidates (`exact_ean_match`, `probable_product_match`, `weak_match`, `conflict`, `not_found`), blocks weak/conflicting buyer-visible facts, and always marks external references as lower-confidence with package-check wording. No network, DB, RLS, or live enrichment behavior was added. Details: `docs/vault/changelog/2026-05-17-ai-peak-stage12-enrichment-contract.md`.

  AI peak Stage 13 controlled enrichment implementation (2026-05-17): Product AI now calls `resolveControlledProductEnrichment()` for missing exact product facts, using Stage 12 trigger rules. The server checks `external_product_cache` first, can query USDA/NPC with existing env keys, writes candidates back as reviewable cache signals, and only passes strong non-conflicting candidates to the prompt as lower-confidence `EXTERNAL_REFERENCE`. Weak/conflicting candidates stay review-only and are not buyer-visible. No new DB/RLS migration was added; existing `external_product_cache` is used through server-side service-role access. Verification: AI unit tests 108/108, no-spend QA 12/12, live NPC+Supabase smoke passed and test cache row was deleted. Details: `docs/vault/changelog/2026-05-17-ai-peak-stage13-controlled-enrichment.md`.

  AI peak Stage 14 compare/ranking cleanup (2026-05-18): Compare flow no longer uses local pseudo-percentage scoring. `src/domain/product/comparison.js` is the deterministic product comparison engine for allergy, halal, availability, data completeness, and price precedence. `CompareScreen.jsx` shows human labels (`best_choice`, `good_option`, `fits_but_check`, `choose_another`) and reason/confidence text instead of fake precision. `/api/ai.js` recomputes the same comparison server-side and includes `FIT_PRIORITY_RESULT` in the compare prompt so the model explanation cannot contradict the deterministic winner. Verification: AI/product comparison tests 116/116, no-spend QA 12/12, i18n check, build, and lint with 0 errors. Details: `docs/vault/changelog/2026-05-18-ai-peak-stage14-compare-ranking.md`.

  AI peak Stage 15 UI shelf-use smoke (2026-05-18): added `tests/e2e/aiShelfUiMocked.spec.js` to cover real-browser AI UI reliability without OpenAI spend. The smoke checks General AI mobile with long replies/product cards/follow-ups/bottom-nav spacing, Product AI mobile with quick chips/error/composer spacing, Compare mobile with human labels and no fake percentages, plus General AI desktop overflow. Verification: targeted AI e2e set passed 6/6. In-app Browser MCP was attempted but blocked by sandbox `EPERM` in node_repl; Playwright Chromium smoke covers the local Vite routes. Details: `docs/vault/changelog/2026-05-18-ai-peak-stage15-ui-smoke.md`.

  AI peak Stage 16 retail owner intelligence (2026-05-18): Retail Dashboard AI insights now give more practical aggregate owner actions. `buildRetailAIInsights()` adds `restock_category_gap` for repeated out-of-stock demand in a category and `halal_coverage_gap` for popular halal-relevant products with missing/unclear halal status. Every insight has an `actionKey`, and `RetailDashboardScreen.jsx` shows a concise next action when localized. No DB/RLS/user-level analytics changes were added. Verification: retail AI unit tests 11/11, targeted retail unit set 15/15, i18n check, lint 0 errors, build. Details: `docs/vault/changelog/2026-05-18-ai-peak-stage16-retail-owner-intelligence.md`.

  AI peak Stage 17 observability persistence decision (2026-05-18): documented the decision for future AI analytics persistence without implementing it. Recommendation: persist only metadata-only `ai_usage_events` in Supabase after owner approval, with 90-day raw retention and aggregate rollups; keep messages/prompts/replies/raw profile/raw product/allergens/ingredients/user IDs/client tokens/IP/email/phone out of analytics. Console-only `buildAIUsageEvent()` logging remains current behavior. Decision: `docs/vault/decisions/2026-05-18-ai-observability-persistence.md`; changelog: `docs/vault/changelog/2026-05-18-ai-peak-stage17-observability-decision.md`.

  AI peak Stage 18 pilot launch gate (2026-05-18): local launch gate passed and report was created at `docs/vault/plans/2026-05-18-ai-peak-pilot-launch-readiness-report.md`. Result: AI is ready for owner manual pilot review, not an unqualified public launch claim. Verification: AI/product/retail unit set 127/127, no-spend QA 12/12, live QA dry-run 13 scenarios/no OpenAI calls, mocked AI UI smoke 6/6, i18n, lint 0 errors, build, docs. Fresh live OpenAI QA after Stage 14-17 remains deferred until explicit owner approval. Changelog: `docs/vault/changelog/2026-05-18-ai-peak-stage18-pilot-launch-gate.md`.

На 2026-05-06:

Auth — **DONE**. Полный deep audit + cleanup завершён. Код стабильный, тесты зелёные. Единственный ручной остаток: вставить 3 email шаблона из `docs/vault/architecture/supabase-email-templates.md` в Supabase Dashboard → Auth → Email Templates. См. `docs/vault/changelog/2026-05-06-auth-deep-audit-cleanup.md`.

Текущий meta-focus — AI-agent memory system:

1. ✅ `AGENTS.md` переписан
2. ✅ `docs/CONTEXT.md` нормализован
3. Далее: frontmatter/status в старые Vault-файлы, oversized files index, query-vault.mjs metadata check

Недавний product/code focus:

- 🔎 **Catalog Search V3 — complete overhaul (2026-05-22)**:
  Все 9 этапов поиска (0-9) завершены. Результаты QA: **82/83 PASS** на живом MARS (10K+ продуктов).
  - SQL RPC v3: additive scoring (SUM), 16 сигналов, relevance floor, EAN prefix, ILIKE escaping
  - search_brand_aliases (73) + search_category_keywords (321) в Supabase
  - JS scorer: alias tokens как альтернативы, intent из NAME_KEYWORDS (~250), QUERY_ALIASES (~90)
  - Merge + Sort: relevanceTier primary sort, re-score после merge
  - UX: KZ нормализация, intent-based suggestions, client pre-filter
  - Детали: docs/vault/changelog/2026-05-22-catalog-search-v3-complete.md

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
- Consumer home `/s/:storeSlug` — staged pilot upgrade implemented through Stage 5. Current IA: compact store header with avatar mini-menu, clickable stories, scan CTA, temporary expanded setup panel for diet/halal/allergy filters that hides after save/close, catalog/AI quick actions, PWA install banner, compact store facts/contacts, and lightweight focus/interaction polish. History is no longer on the main canvas. Details: `docs/vault/plans/2026-05-25-home-screen-pilot-upgrade-plan.md`, `docs/vault/changelog/2026-05-26-home-screen-pilot-stage5.md`, `docs/vault/changelog/2026-05-27-home-fit-setup-panel.md`.
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

---

## 12. Current Product Normalization Focus

Active planning note: `docs/vault/plans/2026-05-23-product-card-normalization-professional-plan.md`.
Changelog note: `docs/vault/changelog/2026-05-23-product-card-normalization-planning.md`.
Stage 1 audit: `docs/vault/plans/2026-05-23-product-card-normalization-stage1-audit.md`.
Stage 1 QA fixture: `tests/fixtures/product-card-normalization-samples.json`.
Stage 2 changelog: `docs/vault/changelog/2026-05-23-product-card-normalization-stage2.md`.
Stage 3 changelog: `docs/vault/changelog/2026-05-23-product-card-normalization-stage3.md`.
Stage 4 changelog: `docs/vault/changelog/2026-05-23-product-card-normalization-stage4.md`.
Stage 5 changelog: `docs/vault/changelog/2026-05-23-product-card-normalization-stage5.md`.
Stage 6 changelog: `docs/vault/changelog/2026-05-23-product-card-normalization-stage6.md`.
Stage 7 changelog: `docs/vault/changelog/2026-05-23-product-card-normalization-stage7.md`.
Stage 8 QA report: `docs/vault/plans/2026-05-24-product-card-normalization-stage8-qa.md`.
Stage 8 changelog: `docs/vault/changelog/2026-05-24-product-card-normalization-stage8.md`.
Stage 9 Compare readiness: `docs/vault/plans/2026-05-24-product-card-normalization-stage9-compare-readiness.md`.
Stage 9 changelog: `docs/vault/changelog/2026-05-24-product-card-normalization-stage9.md`.

Before rebuilding Compare, finish the professional ProductScreen/product normalization workstream:

- canonical nutrition mapping for Arbuz keys is fixed: `energy_kcal`, `protein_100g`, `fat_100g`, `carbohydrates_100g` now map to `kcal`, `protein`, `fat`, `carbs`;
- ProductScreen full-loading contract is centralized in `src/domain/product/productScreenData.js`; stale route-state/full products are ignored and full fetch results are marked with `productScreenFull: true`;
- ProductScreen characteristics are centralized in `src/domain/product/productSpecs.js`; `specs_json.storage_conditions`, shelf-life aliases, fat percentage, clean subcategory, manufacturer, and country are normalized for display;
- conservative runtime flavor extraction is implemented in `src/domain/product/attributeExtractor.js`; normalized products keep `flavorMeta`, and ProductScreen shows flavor only when extraction confidence is high;
- product-aware unit-price visibility is centralized in `src/domain/product/unitPrice.js`; ProductScreen/SpecsGrid show price per 100 g/ml or per unit only when the comparison is useful and quantity is reliable;
- ProductScreen section visibility/order is centralized in `src/domain/product/productScreenSections.js`; visible facts render as nutrition, ingredients, characteristics, then description, with empty sections hidden;
- Stage 8 fixture QA passed 24/24 on real MARS/store-one samples; flavor extraction was tuned for `апельсин и миндаль` and `Огурчики и зелень`;
- Stage 9 Compare readiness handoff is complete: future Compare can trust normalized nutrition, ingredients, safety signals, halal status, fat percentage, high-confidence flavor, storage/shelf-life, manufacturer/country, category, parsed quantity, shared unit-price helper output, and direct price; latest targeted verification passed 61/61 unit tests plus targeted ESLint;
- hide missing sections in ProductScreen instead of exposing "not enough data" messages;
- do not show packaging type, data source, data quality, NOVA group, Nutri-Score, or technical categories;
- keep product scoring for the later Compare workstream.
- Compare rebuild Stage 1-5 is complete: `src/domain/product/comparison.js` now returns `isComparable`, blocks direct winner selection for different known categories, downgrades low-data non-clear winners to `preliminary`, uses category-aware nutrition/value scoring, and exposes `profilePerspective` so profile-specific guidance does not blindly override the overall winner. `src/domain/product/comparisonViewModel.js` converts this result into UI-ready verdict/profile/data/factor sections. `CompareScreen.jsx` now consumes that view model, has a dedicated `CompareScreen.css` visual layer, explicit `winner/preliminary/draw/blocked` state treatments, improved accessibility, theme-token styling, and a corrected compare AI explanation effect. Handoffs: `docs/vault/changelog/2026-05-31-compare-stage1-domain-contract.md`, `docs/vault/changelog/2026-05-31-compare-stage2-category-scoring.md`, `docs/vault/changelog/2026-05-31-compare-stage3-ui-model.md`, `docs/vault/changelog/2026-05-31-compare-stage4-screen-refactor.md`, `docs/vault/changelog/2026-06-08-compare-stage5-visual-ux.md`.

## 13. Current Halal Enrichment Focus

Current halal work is moving from ad hoc scripts to a shared evidence helper and a report-first enrichment audit.

- Shared helper: `src/domain/product/halalEvidence.js`
- Audit pipeline: `scripts/halal-enrichment-audit.cjs`
- Unit coverage: `tests/unit/halalEvidence.test.mjs`
- The new pipeline keeps explicit yes/no decisions separate from review-only ambiguous cases.
- Next step is to reuse the helper in the older halal import scripts instead of letting each script invent its own rule set.

## 14. Current Keto Fit-Check Focus

Keto handling is now being tightened around structured tags and nutrition quality instead of only total carbs.

- `src/domain/product/attributeExtractor.js` now extracts `keto` from product names, so marketing labels can become a structured diet tag.
- `src/domain/product/attributeExtractor.js` also recognizes `low_carb` phrasing, so low-carb marketing language can be preserved as a structured signal.
- `src/utils/fitCheck.js` now evaluates keto using net carbs when fiber is available, not just total carbs.
- Explicit `keto` or `low_carb` tags no longer override contradictory high-carb or high-sugar nutrition, and tag-only products with no carb data stay cautious.
- When keto data is missing or weak, the verdict stays cautious instead of inventing a green result.
- Unit coverage now includes fiber/net-carb cases, keto-tag contradiction checks, and the label-only caution path.
- Live audit on the active catalog (`11,862` products) showed `12.1%` safe and `87.9%` caution for keto, with no warning/danger verdicts.
- The catalog currently has zero explicit keto/low-carb tags. Nutrition coverage is uneven: carbs are known for `8,544` products, sugar for `145`, fiber for `74`, and `3,290` products still have neither carbs nor sugar after strict blank/null handling.
- `scripts/_tmp_keto_audit.mjs` now treats blank/null nutrition as missing instead of converting it to zero, so future keto coverage reports do not overstate data quality.
- Audit report: `C:\tmp\korset-keto-audit.json`.

## 15. Current Enrichment Reality Check

- Read-only enrichment ROI audit (`scripts/_tmp_enrichment_roi_audit.mjs`) over `11,862` active products showed: ingredients known `85.4%`, carbs `71.2%`, sugar `0.4%`, fiber `0.1%`, real EAN `82.0%`, image present `99.6%`.
- Recommended paths: `9,732` products through EAN/source cascade, `2,113` through back-label photo/OCR, `17` through manual/store photo.
- Arbuz dry-run sample (`node scripts\arbuz-enrich.cjs --dry-run --limit=30`) found candidates for `26/30`, composition for `12/30`, KBJU for `13/30`, halal marker for `4/30`, but also exposed likely false positives. Do not mass-write Arbuz matches until matching has stricter confidence gates.
- Barcode nutrition benchmark (`scripts/_tmp_barcode_nutrition_benchmark.mjs`) shows Open Food Facts is weak on local/KZ-CIS products but useful for global brands: on a 50-product global-brand sample OFF found exact barcode products for `22/50`, sugar for `15/50`, salt/sodium for `14/50`, fiber for `10/50`, and all three for `10/50`. On the default 50-product sample OFF had all three for only `1/50`.
- USDA cannot be evaluated fairly yet: current runs return HTTP 403/timeouts despite `USDA_API_KEY` being configured.
- Product decision: broad automatic enrichment can improve coverage through barcode-first sources, especially for global brands, but weak external matches must stay review-only. Sugar/salt/fiber should come from exact-barcode nutrition sources where possible; OCR is not the preferred path due to quality concerns.
- Details: `docs/vault/changelog/2026-05-25-enrichment-roi-audit.md`; report: `C:\tmp\korset-enrichment-roi-audit.json`.
- Barcode nutrition benchmark details: `docs/vault/changelog/2026-05-25-barcode-nutrition-source-benchmark.md`; report: `C:\tmp\korset-barcode-nutrition-benchmark.json`.
- Public/free barcode benchmark (`scripts/_tmp_public_barcode_benchmark.mjs`) on a 50-product local sample and a 20-product global sample showed: Open Food Facts is the only free source that meaningfully returns numeric nutrition, but local coverage is still weak (50-sample: `11/50` found, `7/50` sugar, `7/50` salt/sodium, `5/50` fiber, `4/50` all three; global-sample: `9/20` found, `8/20` sugar, `8/20` salt/sodium, `5/20` fiber, `5/20` all three). UPCitemdb public pages were mostly identity-only and Go-UPC public pages were rate-limited / sign-up gated during sustained use, so they are not a reliable cheap automation path for mass enrichment.
- Barcode Lookup public site was blocked by security verification in this environment, and its API still needs a paid or test key, so it was not benchmarked here.

## 16. Current First-Three Provider Benchmark

- Added `scripts/_tmp_first3_barcode_benchmark.mjs` to benchmark the first three candidate providers on the same product sample: FatSecret, Chomp, and Nutritionix.
- The script uses a stratified sample of active food products with real EANs and missing sugar/salt/fiber so the provider comparison is not biased toward one category.
- The harness is verified and runs end to end, but the live API benchmark is currently blocked by missing credentials in `.env.local` for all three providers.
- FatSecret is the strongest documented candidate on paper, but the barcode endpoint is Premier exclusive and needs OAuth2 client credentials plus barcode scope.
- Chomp has the clearest cost ladder for commercial use, but the Limited plan only allows barcode lookup and the terms restrict commercial use on Limited; Standard/Premium are needed for serious enrichment.
- Nutritionix has a simple UPC lookup endpoint and clear attribution requirement, but it still needs `x-app-id` and `x-app-key`, and the current repo does not have them configured.
- Live run with `--limit=5` completed with all three providers returning `missing_api_key` and wrote `C:\tmp\korset-first3-provider-benchmark.json`.

## 17. Current Product EAN Integrity Focus

- Critical scan issue discovered on 2026-06-01: wrong product can open after scanning because `alternate_eans` is heavily polluted by broad NPC/name matching, not because `store_products.ean` is out of sync. Read-only live audit: 13,101 active global products, 9,429 with `alternate_eans`, 146,805 alternate codes total, 26,024 alternate codes reused by multiple active products, 5,569 alternate codes that are also another active product's primary EAN, and 0 active `store_products.ean` vs `global_products.ean` mismatches.
- Likely root cause: `scripts/arbuz-subcategory-parser.cjs` `npcSearchByName()` strips quantity and accepts multiple National Catalog search GTINs as alternates without exact package/SKU confidence checks.
- Full read-only audit now exists: `scripts/audit-ean-integrity.mjs`, report `C:\tmp\korset-ean-integrity-audit.json`. Latest results: 146,805 alias relations, 119,567 critical (81.4%), 25,754 suspicious (17.5%), 1,383 review (0.9%), only 101 provisionally safe (0.1%); estimated severity 10/10.
- Owner direction: do not delete `alternate_eans` wholesale because multi-EAN support is required. Proposed recovery should quarantine existing unsafe alternates, preserve candidates as evidence, rebuild trusted aliases with strict identity/source gates, and ensure one trusted active product per scannable EAN. Detailed plan: `docs/vault/plans/2026-06-01-product-ean-integrity-recovery-plan.md`.
- Stage-by-stage recovery plan is now defined in the same Vault plan. Recommended execution order: Stage 1 buyer scan containment, Stage 2 trusted alias data model, Stage 3 legacy alias quarantine/classification, Stage 4 resolver switch to trusted aliases, Stage 5 user-facing error reporting, Stage 6 admin audit mode/review queue, Stage 7 parser/import hardening, Stage 8 mass QA/supermarket audit.
- Stage 1 scan containment is complete locally: resolver rejects RPC results whose returned primary EAN differs from the scanned EAN, direct fallback no longer uses legacy `alternate_eans`, and ProductScreen scan-origin catalog lookup is exact-only. No Supabase data/live function was changed. Verification: containment unit 4/4, related product unit set 13/13, lint 0 errors with existing warnings. Handoff: `docs/vault/changelog/2026-06-01-ean-stage1-scan-containment.md`.
- Stage 2 trusted alias model is complete locally but not applied to live Supabase. Added `src/domain/product/eanAliases.js`, unit tests, and migration `supabase/migrations/047_product_ean_aliases.sql` for `product_ean_aliases` with status/source/confidence/evidence, admin-only RLS, and a partial unique index enforcing one active trusted product per scannable EAN. Verification: EAN alias tests 4/4, alias+containment tests 8/8, targeted ESLint, docs check. Supabase CLI local migration listing is currently blocked by `.env.local` parse issue; apply via SQL Editor or after env override/fix. Handoff: `docs/vault/changelog/2026-06-01-ean-stage2-trusted-alias-model.md`.
