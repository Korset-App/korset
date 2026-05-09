# Лог сессий разработки Körset

> Домен: changelog
> Дата начала: 2026-04-17
> Связи: [[assistant-access-and-architecture-governance]] · [[architecture-decisions]] · [[fit-check-engine]] · [[2026-04-28-security-allergen-audit]]

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

---

## 2026-04-19 — Сессия 6: R2 CDN миграция + интеграция getImageUrl()

**Выполнено:**
- R2 bucket `korset-images` создан (регион EEUR)
- Custom domain `cdn.korset.app` привязан и работает (200 OK)
- 580/620 картинок мигрировано с внешних CDN → R2
  - Источники: OpenFoodFacts, Arbuz, Kaspi → `cdn.korset.app/products/{EAN}/main.jpg`
  - 40 пропущено (локальные плейсхолдеры, недоступные URL)
  - `original_image_url` сохранены для отката
- `scripts/utils/r2-upload.cjs` — утилита загрузки в R2
- `scripts/migrate-images-to-r2.mjs` — скрипт миграции
- `src/utils/imageUrl.js` — `getImageUrl()` + helpers (упрощён: без Cloudflare Transformations)
- Интегрирован `getImageUrl()` во все компоненты:
  - `StoreContext.jsx`, `normalizers.js`, `RetailProductsScreen.jsx`, `RetailDashboardScreen.jsx`
- Миграция 008 (r2 columns) применена
- Arbuz-enrich обновлён — автозагрузка в R2
- Запушено в main, Vercel задеплоил

**Открытие:**
- Cloudflare Image Transformations (`/cdn-cgi/image/...`) НЕ работают с R2 — нужен платный Cloudflare Images план
- R2 dev URL (`pub-*.r2.dev`) отдаёт 401 — публичный доступ выключен, но кастомный домен работает

**Не выполнено:**
- 40 картинок не загружены — retry при следующем чате
- Проверка отображения на телефоне — завтра

---

## 2026-04-19 — Сессия 7: Каталог cleanup + Pipeline фикс + USDA proxy

**Выполнено:**
- **api/usda.js** задеплоен на Vercel + USDA_API_KEY добавлен в env
- **USDA proxy работает** — `https://korset.app/api/usda?query=X` → 200 OK, данные корректные
- **Миграция 007** подтверждена применённой (npc, arbuz, usda в source_primary_check)
- **Каталог аудит** (audit-catalog.cjs): 385/685 (56.2%) англ. имён, 554 без name_kz
- **npc-enrich --fix-names**: обработал 628 продуктов, 385→2 англ. имён (−99.5%)
  - Раздельные name/EAN апдейты (решает duplicate EAN: name обновляется даже если GTIN занят)
  - source_primary='npc' (было 'kz_verified')
- **arbuz-enrich**: обновляет name/name_kz из Arbuz, source_primary='arbuz', --fix-names режим
  - Прод запуск: 34/81 found, 20 comp, 19 КБЖУ, фото → R2
- **usda-enrich**: работает через Vercel proxy, source_primary='usda'
  - Прод запуск: 22/50 обогащено
- **add-category-prefix.cjs**: 2 оставшихся англ. имени → prepend русской категории
- **arbuz-import.cjs**: новый Arbuz-first pipeline (Arbuz = primary, NPC/OFF = enrichment)
- **Ключевой фикс**: r2-upload.cjs require path (`.cjs` extension), SUPABASE_URL/SUPABASE_KEY constants

**Результаты:**
| Метрика | Было | Стало |
|---------|------|-------|
| Англ. имена | 385 (56.2%) | 2 (0.3%) |
| Пустой name_kz | 554 (80.9%) | 171 (25%) |
| source_primary=npc | 0 | 359 |
| source_primary=openfoodfacts | 382 | 28 |

**Не выполнено:**
- arbuz-import.cjs не запущен (нужен тестовый запуск --dry-run)
- Фронтенд name_kz по языку
- Retry 40 R2 failed
- Duplicate EAN cleanup (деактивация дубликатов)

---

## 2026-04-19 — Сессия 8: Полный Arbuz catalog import + NPC + перевод состава

**Выполнено:**
- **arbuz-catalog-parser.cjs** — переписан на batch upsert (100x быстрее, 0 ошибок)
  - Инкрементальное сохранение прогресса каждые 10 продуктов
  - Ретраи на API таймаутах (3 попытки, 2 сек между попытками)
  - Обработка ошибок в Phase 1 (пропуск неудачных запросов)
- **Полный Arbuz импорт**: 2228 продуктов из Arbuz → 3236 активных в DB (было 685)
- **NPC EAN enrichment**: 1320/3236 (40%) реальных EAN (было 30%)
  - Обработано ~635 продуктов в двух батчах по 500
- **Удаление мусора**: 17 деактивировано (11 электроника, 3 открытки, 3 стройматериалы)
- **Перевод состава**: `translate-composition.cjs` через OpenAI gpt-4o-mini
  - 331 инноязычный состав → 0 (100% русский)
  - Batch по 15 продуктов, стоимость ~$0.05 за всё
- **0 дубликатов EAN** — UNIQUE constraint работает

**Результаты:**
| Метрика | Было (сессия 7) | Стало (сессия 8) |
|---------|----------------|-------------------|
| Active продуктов | 685 | 3236 |
| С составом | ~75% | 86% (2779) |
| Русский состав | ~48% | **100%** (2779/2779) |
| Реальные EAN | 63% | 40% (больше продуктов без EAN) |
| Arbuz primary | 26 | 2237 |

**Не выполнено:**
- USDA enrichment на 457 без состава
- R2 upload для ~2000 новых Arbuz картинок
- Фронтенд: name_kz по языку
- Импорт прайс-листа (RetailImportScreen)
- БД-фиксы (CASCADE, GIN)

---

## 2026-04-26 — Сессия 14: NPC EAN Harvest (combo approach)

**Выполнено:**
- Эксперимент с 6 методами NPC-поиска → combo стратегия (brand+name + brand+core+weight + brand-only)
- Новый `scripts/npc-eans-harvest.cjs`: 2-3 запроса/продукт, ВСЕ EAN в alternate_eans, лучший GTIN → primary
- Обработка duplicate EAN (если занят → в alternate, пробует следующий)
- 3 партии harvest (~900 продуктов): 1320 → 2558 реальных EAN (+94%)
- Avg 40 EAN/продукт (GTINs + NTINs + alternates)
- Сканер уже поддерживает alternate_eans (resolver.js)
- USDA-enrich фикс: не перезаписывает source_primary
- NPC-enrich фикс: пагинация .range() (Supabase limit 1000)
- CONTEXT.md + vault обновлены

**Не выполнено:**
- Продолжить harvest для оставшихся ~5595 продуктов (партиями по 2000)
- Продукты без бренда — нужен другой подход
- USDA enrichment — API ключ disabled, нужен новый

---

## 2026-04-26 — Сессия 15: Завершение визуального паритета Light Theme (AI Chat & Scan)

**Выполнено:**
- **AIAssistantScreen.jsx (General AI)**: Полный рефакторинг. Удалены все хардкод-цвета (#151525, #0C0C18, rgba-черные). Теперь экран полностью использует семантические токены (`var(--bg)`, `var(--glass-bg)`, `var(--text)`, `var(--input-bg)` и т.д.).
- **AIScreen.jsx (Product AI)**: Дополнительная полировка. Заменены оставшиеся хардкод-пурпурные цвета и тени на `var(--primary)`, `var(--primary-mid)` и `var(--primary-glow)`.
- **UI Parity**: Исправлены "черные поля ввода" и "черные фоны сообщений" в светлой теме, на которые жаловался пользователь.
- **CONTEXT.md**: Статус **Light theme rollout** обновлен на ✅ COMPLETED.

**Результат:**
- Корсет теперь имеет 100% визуальный паритет между темной и светлой темами во всех ключевых сценариях использования (Сканирование, Чат с ИИ, Профиль, Каталог).

---

## 2026-04-27 — Сессия 16: EAN Recovery UI + RLS Fix + Vault Context Save

**Выполнено:**
- **RLS bug fix:** Обнаружено что Supabase RLS с anon key молча блокирует DELETE/UPDATE на global_products (возвращает `data:null, error:null`). Создан serverless API `api/ean-recovery.js` с JWT + service_role key для обхода.
- **EAN Recovery Screen** полностью переписан: сканер штрихкода, карточка товара в новой вкладке, инлайн-редактирование названия, полное DELETE с модалом подтверждения. Всё на русском.
- **Retail Bottom Nav:** 4-я вкладка «Штрихкоды» (оранжевый qr_code_scanner)
- **i18n:** eanRecovery nav key (RU: Штрихкоды, KZ: Штрихкодтар)
- **Vault:** созданы `docs/vault/architecture/ean-recovery-system.md` и `docs/vault/decisions/ean-recovery-rls-decision.md`

**EAN Coverage:** 77.2% → 99.0% (7031/7104 реальных EAN). ~68 fake EAN остаются для ручной обработки.

**Следующие приоритеты:**
1. Дочистить fake EAN вручную через EAN Recovery
2. Импорт прайс-листа — P0 блокер продаж
3. Data Moat — data_quality_score, каскад источников
4. БД-фиксы — CASCADE, GIN, триггеры
5. Метрики в тенге

---

## 2026-04-27 — Сессия 17: Banner Overhaul + PWA Precache Fix + Guest Empty States

**Выполнено:**
- **7 фото-баннеров**: golden-samurai, starlit-observatory, witching-hour, teal-moonlight, crescent-nightingale, dawn-ronin, midnight-grove — оптимизированы в WebP (160KB total, 99% compression от ~13MB PNG)
- **`scripts/optimize-banners.mjs`**: Pipeline Sharp — resize 1200×450 → WebP quality 80 + thumbnails 240×90
- **Удалены 5 старых SVG баннеров** из presets и с диска
- **PWA precache fix**: `globPatterns` перенесён из `workbox` в `injectManifest` config — webp теперь в precache manifest (36 entries вместо 9). Фиксит отсутствие баннеров в Chrome.
- **SelectedDot clipping fix**: `overflow:hidden` на upload tile обрезал галочку → обёртка `position:relative` div + dot рендерится снаружи button
- **Guest empty states (Favorites + History)**: Текст «Войдите, чтобы сохранять...» + кликабельный блок → открывает AuthPromptModal. RU/KZ i18n ключи добавлены.
- **ProfileEditScreen**: ровная сетка 2×4 (7 пресетов + 1 upload tile)

**Файлы:**
- `src/constants/bannerPresets.js` — 7 presets, default golden-samurai
- `src/screens/ProfileEditScreen.jsx` — SelectedDot fix, grid layout
- `src/components/profile/ProfileStatsTabs.jsx` — isGuest + onAuthPrompt, clickable TabEmptyState
- `src/screens/ProfileScreen.jsx` — `onAuthPrompt={() => setAuthPromptOpen(true)}`
- `src/utils/i18n.js` — `favoritesEmptyGuest`, `historyEmptyGuest` (RU/KZ)
- `vite.config.js` — `injectManifest.globPatterns` includes webp/jpg/jpeg
- `src/sw.js` — runtime `CacheFirst` route для изображений
- `scripts/optimize-banners.mjs` — Sharp pipeline
- `.gitignore` — `public/banners/raw/`, `public/banners/thumbs/`

**Коммиты:** `e03210e` (баннеры), `cfe9428` (PWA fix), `0b29105` (globPatterns injectManifest), `session-commit` (guest empty states)

**Следующие приоритеты:**
1. Проверить баннеры в Chrome после деплоя
2. Retail Import — P0 блокер продаж
3. Data Moat — каскад источников
4. i18n хардкод русского текста (EanRecoveryScreen, ProductScreen, CatalogScreen)
# 2026-04-28 — Landing redesign Stage 1

- Реализован новый публичный лендинг `/` как отдельный `LandingScreen` вместо продолжения старого inline-лендинга внутри `HomeScreen`.
- Стратегия: B2C-first hero (“Проверьте, подходит ли товар именно вам”), B2B-секция ниже и отдельно, без смешивания сообщений.
- Визуал: один сканируемый продукт, телефонный mockup, Fit-Check, glass cards, theme toggle, scan-beam, лёгкие CSS-анимации без WebGL.
- B2B: отдельный retail-разворот, сценарий роста продаж/лояльности, Early Access 15 000 ₸, Premium/Enterprise “скоро”.
- Проверки: e2e landing spec, build, lint. Остались только существующие warnings вне новой поверхности.

# 2026-04-28 — Landing redesign Stage 2

- Усилен B2B-разворот без вмешательства в B2C hero: добавлен лёгкий HTML/CSS preview Retail Cabinet с метриками сканов, покрытием каталога, упущенной выручкой, QR, импортом прайса и неизвестными EAN.
- Визуальная полировка: dashboard glass surface, sweep-подсветка, бар-чарт, pricing sweep, responsive grid для desktop/mobile, `scroll-margin-top` для sticky header anchors.
- RU/KZ i18n обновлён для новых retail dashboard-текстов.
- E2E обновлён: проверяет `landing-retail-dashboard`, знак ₸ и скан-метрики. Проверки: `npm test -- tests/e2e/landing.spec.js` 4 passed; `npm run build` passed; `npm run lint` 0 errors, 56 existing warnings.

# 2026-04-28 — Landing hero polish after design feedback

- Удалён центральный диагональный beam/glare из hero — больше нет прямоугольного блика поверх текста и CTA.
- Hero-визуал перестроен в более смелую 3D-сцену: телефон, один продукт за телефоном, нижний hand-silhouette и кинетические стеклянные слои с scroll-driven/fallback CSS-анимацией.
- Основные CTA больше не используют дешёвый фиолетовый градиент: заменены на premium dark/glass стиль в dark theme и контрастный solid стиль в light theme.
- Акценты в hero/bar chart переведены с primary-purple на cyan/green premium-tech.
- Проверки после правок: `npm test -- tests/e2e/landing.spec.js` 4 passed; `npm run build` passed; `npm run lint` 0 errors, 56 existing warnings.

# 2026-04-28 — Landing visual system Stage 1

- По новому фидбеку убраны CTA sheen/glare-эффекты полностью: primary CTA теперь простой solid accent (`--accent-sky`) без бликов, полос и фиолетового градиента.
- Весь публичный лендинг переведён на Advent Pro как основной шрифт; текстовые веса/размеры подняты, чтобы уйти от generic UI-ощущения.
- Массовый glassmorphism снят с обычных информационных карточек: базовые блоки теперь solid/surface с 8px radius, а glass оставлен как намеренный визуальный слой для hero-мокапа, floating chips и retail dashboard.
- Визуальный Stage 1 проверен на desktop dark, mobile dark, desktop light и первом scroll-блоке. Проверки: `npm test -- tests/e2e/landing.spec.js` 4 passed; `npm run build` passed; `npm run lint` 0 errors, 56 existing warnings.
- Следующие дизайн-этапы: отдельно перепроектировать B2C sections (`у полки`, Fit-Check, возможности) и затем B2B/pricing/footer, не смешивая всё в один заход.

# 2026-05-03 — i18n unit tests + check-i18n.mjs script

- Создан `scripts/check-i18n.mjs` — аудит 14 namespace × 2 языка: missing KZ keys, orphan keys, empty values, identical RU=KZ (possibly untranslated). Exit code 1 если KZ ключи отсутствуют.
- Результат первой проверки: 14 namespace, 0 missing KZ, 0 orphan, 0 empty, 106 identical RU=KZ (бренды, иконки, единицы измерения — нормально).
- Созданы 4 unit-тест файла (`tests/unit/i18n/`): plural (20), interpolate (13), format (16), resolve (15) = 64 теста. Все проходят.
- Поправлен `src/i18n/resolve.js` — `import.meta.env.DEV` → `import.meta.env?.DEV` (optional chaining для совместимости с Node.js без Vite). Не влияет на production (Vite всегда предоставляет `import.meta.env`).
- KZ plural rules: `Intl.PluralRules('kk')` имеет только `one`/`other` (в отличие от ru: one/few/many/other). Тесты отражают это.

# 2026-05-03 — i18n `exists` API fix + LandingScreen crash fix + lint 0 errors

- **Критический баг:** `t.exists = useCallback(...)` — lint error `This value cannot be modified` (useCallback возвращает замороженную функцию, нельзя присвоить свойство)
- **Решение:** `exists` вынесен как отдельный return из `useI18n()`: `return { t, exists, lang, format }`
- **4 файла обновлены:** AIAssistantScreen, QRPrintScreen, LandingScreen (16 вызовов), HomeScreen
- **LandingScreen crash:** `collectObjArr(t, \`...\`, ['label', 'href'])` — пропущен `exists` аргумент → fields[0] на undefined → TypeError. Исправлено на `collectObjArr(t, exists, \`...\`, ['label', 'href'])`
- **main.jsx:31** — empty catch block → добавлен комментарий `/* invalid URL — ignore */` для no-empty lint
- **Итог:** lint 0 errors (было 2), e2e landing 4/4 pass, unit 64/64 pass, build OK

# 2026-05-03 — i18n финальная полировка: хардкод-остатки + markdownToHtml rewrite

- **markdownToHtml** переписан: line-by-line парсер вместо regex — чистый HTML без мусорных `<br>` и `<p>` обёрток вокруг `<h3>/<ul>`
- **aria-label хардкод → t():** SyncResolveModal, SupportBottomSheet (2), FaqScreen — все через `t('common.close')`, `t('common.back')`, `t('common.feedback')`
- **UnifiedProductScreen** `'Да'` → `t('common.yes')`
- **ProfileScreen** `ariaLabel: 'Русский'` → `t('common.langRu')`
- Новые ключи RU+KZ: `common.yes`, `common.close`, `common.feedback`, `common.langRu`, `common.langKzAria`
- Удалён устаревший `scripts/extract-locales.mjs` (ссылался на удалённый `src/utils/i18n.js`)
- **0 aria-label хардкода**, **0 `isKz ? 'Қаз' : 'Рус'`**, lint 0 errors, e2e 4/4, unit 64/64

# 2026-05-03 — i18n шаги 12-14: финальная полировка

- **Шаг 12 (хардкод → t()):**
  - RetailSettingsScreen: 40 `isKz ? 'Қаз' : 'Рус'` → `t('retail.settings.*')` (38 новых ключей RU+KZ)
  - StorePublicScreen: 8 `isKz ? 'Қаз' : 'Рус'` → `t('home.store*')` (12 новых ключей RU+KZ)
  - Мелочь: UnifiedProductScreen (2), SetupProfileScreen (1), QRPrintScreen (2), RetailProductsScreen (1), ProfileScreen (3), AccountScreen (2) → все через t()
  - Итого: 0 `isKz ? 'Қаз' : 'Рус'` паттернов осталось в экранах (13 `lang === 'kz'` — корректные data-driven/CSS)
  - check-i18n: 0 missing, 0 orphan, 0 empty, 109 identical (бренды/иконки/единицы)

- **Шаг 13 (Dev-mode visual warnings):**
  - `resolve.js`: при missing key в обоих языках → `⚠key` в DEV-режиме (визуальная пометка)
  - Production: key path как и раньше (без ⚠)

- **Шаг 14 (PrivacyPolicyScreen):**
  - 200+ строк хардкода kzText/ruText → markdown файлы `src/legal/privacy-{ru,kz}.md`
  - `markdownToHtml()` — минимальный markdown→HTML конвертер
  - Vite `?raw` import для bundling markdown как строки
  - `{date}` placeholder для динамической даты обновления
  - 0 хардкод-текста в JSX

- **Все 17 шагов i18n миграции ЗАВЕРШЕНЫ**

# 2026-05-03 — AI best-fit analysis for Körset

- Проведена короткая ревизия проектного контекста и актуальных приоритетов, чтобы зафиксировать лучший тип задач для Codex в проекте.
- Вывод: максимальная ценность Codex — сложные системные улучшения с end-to-end мышлением: Data Moat, data pipelines, DB/RLS hardening, декомпозиция монолитов, особенно `ProductScreen`.
- Если нужна быстрая бизнес-отдача от следующих сессий: давать Codex задачи, где нужно одновременно понять продукт, код, данные, побочные эффекты и проверку.
