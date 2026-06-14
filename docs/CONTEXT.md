# KÖRSET — БЫСТРЫЙ КОНТЕКСТ ПРОЕКТА

> Быстрый вход после `AGENTS.md`. Карта проекта, не changelog.
> Архитектура: `docs/ARCHITECTURE.md`. Roadmap: `docs/ROADMAP_PILOT_V1.md`. Детали: `docs/vault/`.

---

## 1. Проект В Одном Экране

Körset — mobile-first PWA: цифровой каталог + Fit-Check для офлайн-продуктовых магазинов Казахстана.

**Модель:** B2B2C. Платят магазины, покупатели используют бесплатно. V1: только продуктовые, пилот Астана.

**Стратегический поворот (2026-06-11):** от «закрытого ассистента» к «публичному каталогу магазина». Деталь: `docs/vault/plans/2026-06-11-store-access-and-digital-catalog-strategy.md`.

**Ценность:**
- Магазину: `korset.kz/s/mars` — онлайн-каталог с ценами из дома и 2GIS.
- Покупателю: каталог + Fit-Check (халал, аллергены, диеты) + сканер у полки.
- Ниша: прямых конкурентов в KZ нет, мировые аналоги без Fit-Check + халал.

**Доступ:** всё без регистрации (localStorage). Регистрация — опциональный апгрейд для синхронизации.
Access gate, токены, 4-значные коды — отменены и не строятся.

---

## 2. Стек И Карта

- React 18 + Vite SPA, JavaScript (не TS), Vanilla CSS (не Tailwind).
- Supabase (PostgreSQL, Auth, Storage, RLS). Vercel Serverless. OpenAI + RAG (pgvector).
- PWA: service worker, IndexedDB, очередь offline-сканов.

```
src/screens/      экраны
src/components/   UI-компоненты
src/domain/       доменная логика
src/contexts/     React contexts
src/i18n/         RU/KZ локализация
api/              Vercel serverless
scripts/          data/import/enrichment
supabase/         миграции
docs/vault/       проектная память (RAG)
```

---

## 3. Актуальные Роуты

Публичные:
```
/ /stores /stores/:storeSlug /auth /update-password /setup-profile /qr-print /privacy-policy
```

Consumer (`/s/:storeSlug/`):
```
/                               home
/scan                           сканер
/catalog                        каталог (18 категорий, поиск, grid/list)
/ai                             AI-ассистент (text + voice + image)
/history                        история
/profile [/edit]                профиль + редактирование
/account                        аккаунт, методы входа
/notifications /privacy /sound-settings /faq /about /terms
/product/:ean                   карточка товара
/product/:ean/ai                AI по товару
/product/:ean/alternatives      альтернативы
/product/:ean/compare/:ean2     сравнение
/product/:ean/composition       интерактивный состав
```

Retail:
```
/retail /retail/:storeSlug/dashboard /retail/:storeSlug/products
/retail/:storeSlug/import /retail/:storeSlug/ean-recovery /retail/:storeSlug/settings
```

Super Admin:
```
/korset-admin/stores
```

Правило: shopping-flows — только внутри `/s/:storeSlug/`.

---

## 4. Что Работает

Consumer:
- **HomeScreen** — store entry: header + logo, stories, scan CTA, Fit-Check setup. `src/screens/HomeScreen.jsx`
- **Scanner** — barcode + ручной ввод EAN.
- **ProductScreen** — Fit-Check, факты, цена, интерактивный состав с цветовыми маркерами.
- **CompareScreen** — сравнение товаров с human-readable вердиктами.
- **AI Assistant** — store-scoped chat: text + voice (MediaRecorder, 30s) + photo (одно изображение, без сохранения). Локальная история IndexedDB. `/api/ai.js`, `/api/ai-image`, `/api/ai-transcribe`.
- **CatalogScreen** — 18 категорий, bento, RPC v2 поиск, фильтры/сортировка. ProductCard: `src/components/catalog/CatalogProductCard.jsx`
- History, favorites, profile, account, сервисные экраны.

Auth:
- Supabase Auth: Google OAuth, email/password, email OTP. Password recovery. `<ProfileAvatar />`. Валидация: `src/utils/authHelpers.js` (9/9 tests).

Retail:
- Dashboard (метрики + AI-инсайты), Products (price/stock, barcode search), Import (CSV/XLS/XLSX), Settings (store data, QR), EAN Recovery (correction inbox, trusted candidates). Multi-store.

Stores:
- 3 активных: Марс (mars, ~10K), Нұрлы (nurly, ~2.5K), Калина (kalina, ~2K).
- Управление: `node scripts/create-store.mjs --slug xxx ...`, `node scripts/deactivate-store.mjs --slug xxx`, `node scripts/seed-store-catalog.mjs --store-slug xxx ...`

Super Admin: `/korset-admin/stores` — статистика, поиск, фильтрация, drawer-форма создания.

Infrastructure: RLS + JWT. Sentry + Telegram alerts. Offline (SW + IndexedDB). RAG (pgvector). Dark/light themes. Telegram Support Bot.

---

## 5. Ключевые Системы

**Alternatives:** RPC-first (`fn_get_product_alternatives`). Сценарии: similar, fits_me, cheaper, better_composition. Analytics: `alternative_events`. Retail Dashboard: агрегированные сигналы. План: `docs/vault/plans/2026-05-22-alternatives-professional-upgrade-plan.md`.

**Store-Aware AI:** привязан к магазину. Catalog-grounded рекомендации, product cards в чате, store AI notes, retail insights. Phases 1-7 + premium + peak (18 stages) завершены. Launch readiness: `docs/vault/plans/2026-05-18-ai-peak-pilot-launch-readiness-report.md`.

**Catalog Search:** RPC v2, 16 сигналов, token-level, brand aliases + category keywords, KZ нормализация, debounce. V3: 82/83 QA на MARS. Детали: `docs/vault/changelog/2026-05-22-catalog-search-v3-complete.md`.

**Data Import:** ~5,000+ EAN из Arbuz.kz (25+ подкатегорий). Mars синхронизирован (10,228 продуктов). Handbook: `docs/vault/operations/arbuz-scraping-handbook.md`.

**Halal:** Mustakshif (822 YES/11,862), HalalDamu (1,130), AHIK (668), OFF (0.2%). Ingredient-based анализ: 9,532 продукта. Helper: `src/domain/product/halalEvidence.js`. Покрытие частичное, авто-matching ненадёжен.

**Product Normalization:** 9 stages + Compare rebuild 5 stages. Nutrition mapping, specs, flavor, unit prices. Детали: `docs/vault/changelog/2026-06-08-compare-stage5-visual-ux.md`.

**EAN Integrity:** КРИТИЧНО: загрязнённые `alternate_eans` (146,805 alias, 81.4% critical). Recovery (8 stages): 1-7D завершены — containment, trusted model (migration 047-049), quarantine (144,856 rows), resolver, parser hardening, correction UI. Trusted=0 (нужна ручная promotion). План: `docs/vault/plans/2026-06-01-product-ean-integrity-recovery-plan.md`.

**Keto:** net-carb (fiber-aware), tag extraction. 12.1% safe, 87.9% caution (11,862 продуктов).

---

## 6. Рабочие Контракты

**Auth:** 0 hardcoded colors, 0 dead code. Email-шаблоны готовы в vault, нужна ручная вставка в Supabase Dashboard.

**i18n:** `src/locales/{ru,kz}/*.json`. Проверка: `node scripts/check-i18n.mjs`. Новый текст — только через `useI18n`, никогда не хардкодить.

**Design:** Dark/light через CSS-токены. Без raw `#fff`/`#000` для core UI. Аватары: `<ProfileAvatar />`. Без gradient-filled text для типографики.

**Data:** 18 категорий. Unknown EAN = data-improvement, не повод выдумывать AI-ответ.

---

## 7. Memory System

Слои:
- `AGENTS.md` — правила поведения. `docs/CONTEXT.md` — быстрый вход.
- `docs/ARCHITECTURE.md` — карта архитектуры. `docs/ROADMAP_PILOT_V1.md` — приоритеты.
- `docs/AI_TASK_MODES.md` — режимы задач. `docs/AI_TOOLS_MATRIX.md` — матрица инструментов.
- `docs/vault/architecture/` — system docs. `docs/vault/knowledge/` — исследования.
- `docs/vault/decisions/` — важные решения. `docs/vault/plans/` — планы/аудиты.
- `docs/vault/changelog/` — датированные session notes.

Старт задачи: прочитать AGENTS.md + этот файл → targeted search → Vault RAG если нужна глубокая память.

Команды:
```bash
node scripts/query-vault.mjs "query" --domain architecture --count 5
npm run memory:save
```

**Не добавлять сюда session logs. Детали — в vault.**

---

## 8. Verification

```bash
npm run build && npm run lint && npm run test:unit
node scripts/check-i18n.mjs
```

UI: browser/Playwright smoke. Data scripts: dry-run перед боевым запуском.

---

## 9. Куда Смотреть

Главные указатели:
- `AGENTS.md` — правила. `docs/ARCHITECTURE.md` — архитектура. `docs/ROADMAP_PILOT_V1.md` — roadmap.
- `docs/AI_TASK_MODES.md` — режимы. `docs/AI_TOOLS_MATRIX.md` — инструменты.
- `docs/vault/architecture/` — auth, offline, fit-check, category, EAN recovery.
- `docs/vault/knowledge/data-moat-pipeline-strategy.md` — стратегия данных.
- `docs/vault/changelog/` — последние session notes.
- `docs/vault/changelog/2026-06-14-context-cleanup-archive.md` — что удалено из CONTEXT.md и почему.