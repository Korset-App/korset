# Context Cleanup Archive — 2026-06-14

Всё, что было удалено из `docs/CONTEXT.md` при нормализации 2026-06-14.
Полные детали каждого пункта доступны в указанных vault-файлах. Никакая информация не потеряна — она уже была в vault до удаления.

---

## Из секции 4 «Что работает сейчас» — удалённые changelog-пересказы

Каждый пункт ниже был в CONTEXT.md как детальный пересказ vault/changelog-файла.
В новом CONTEXT.md оставлены краткие сводки (1-2 строки) + ссылки на vault.

### HomeScreen
Удалено: 4 строки детального описания с source files и handoff-ссылкой.
Стало: 1 строка "mobile-first store entry screen" + source files.
Детали в: `docs/vault/changelog/2026-05-26-home-screen-full-redesign.md`, `docs/vault/changelog/2026-05-26-home-screen-pilot-stage5.md`

### ProductScreen / Ingredients
Удалено: 4 строки про подсистему состава, цвета, AI-переход.
Стало: 1 строка "interactive ingredient analysis" + source files.
Детали в: `docs/vault/changelog/2026-05-30-product-composition-interactive.md`

### AI Assistant
Удалено: ~20 строк про Stage 2-12, voice-to-text, Stage 13-15, visual polish, voice stability, image/camera implementation и mobile composer QA.
Стало: 2 строки "store-scoped chat with voice + image input, local history via IndexedDB".
Детали в:
- `docs/vault/plans/2026-05-27-ai-assistant-visual-redesign-brief.md`
- `docs/vault/changelog/2026-05-29-ai-assistant-stage10-local-history-ui.md`
- `docs/vault/changelog/2026-05-29-ai-assistant-stage11-mobile-qa.md`
- `docs/vault/changelog/2026-05-29-ai-assistant-stage12-voice-to-text.md`
- `docs/vault/changelog/2026-05-30-ai-assistant-stage12-voice-polish.md`
- `docs/vault/changelog/2026-05-31-ai-assistant-voice-composer-stability.md`
- `docs/vault/changelog/2026-05-31-ai-assistant-stage13-image-camera-design-gate.md`
- `docs/vault/changelog/2026-05-31-ai-assistant-stage14-image-camera-implementation.md`
- `docs/vault/changelog/2026-05-31-ai-assistant-stage15-mobile-composer-qa.md`
- `docs/vault/changelog/2026-06-01-ai-assistant-visual-polish-pass.md`
- `docs/vault/plans/2026-06-01-ai-assistant-visual-polish-owner-feedback.md`

### CatalogScreen
Удалено: ~6 строк про 18 категорий, bento, search, sort, skeleton, Virtuoso, product card details, бейджи, compare CTA, CSS guard, post-pilot refactor.
Стало: 2 строки "18 categories, bento, search RPC v2, ProductCard component".
Детали в: `docs/vault/plans/2026-05-27-catalogscreen-post-pilot-refactor.md`

### Auth/Profile
Удалено: 3 строки про AccountScreen linked methods, `<ProfileAvatar />`.
Стало: 1 строка.
Детали в: `docs/vault/architecture/auth-system.md`

### Retail
Удалено: 5 строк про repair migrations, EAN Recovery, multi-store.
Стало: 2 строки.
Детали в: `docs/vault/changelog/`, `supabase/migrations/045_repair_store_opening_hours.sql`, `supabase/migrations/046_fix_stores_billing_guard.sql`

### Stores
Удалено: 3 строки про store selector дизайн (theme-aware, RU/KZ, search, карточки, hero-плашка, SVG-логотипы).
Стало: 1 строка "store selector with search".
Детали в: `src/domain/stores/listing.js`, `src/screens/StoresScreen.css`

### Super Admin & SEO
Удалено: 3 строки про drawer-форму, транслитерацию, транзакционное создание, JSON-LD, robots.txt.
Стало: 2 строки.
Детали в: `api/admin-stores.js`, `api/sitemap.js`

### Infrastructure
Удалено: 5 строк про offline shell, IndexedDB, RAG memory, dark/light, Telegram bot spec.
Стало: 4 строки.
Детали в: `docs/vault/plans/2026-05-23-telegram-support-bot-spec.md`, `docs/vault/changelog/2026-05-24-telegram-webhook-security.md`

---

## Из секции 5 «Важные риски» — удалённые пересказы

### Alternatives
Удалено: 2 строки про сценарии, compare CTA, ProductScreen callout, analytics, retail dashboard, RPC summary.
Стало: 2 строки (+ ссылка на план).
Детали в: `docs/vault/plans/2026-05-22-alternatives-professional-upgrade-plan.md`, `docs/vault/changelog/2026-05-22-alternatives-professional-upgrade.md`

### Этапы импорта Arbuz (25 подкатегорий)
Удалено: 40 строк с перечислением каждой подкатегории и количества EAN-продуктов.
```
Молоко (113), Кефир (140), Йогурты (201), Яйца/масло (104), Сыры (333),
Мороженое (212), Полуфабрикаты (135), Самса (22), Хлеб (103), Вода (81),
Газировка (118), Холодный чай (91), Соки (116), Колбасы (184),
Сосиски (60), Деликатесы (64), Орехи (100), Альт.молоко (47), Детские (52),
Чипсы (137), Закуски (89), Кофе (230), Чай (174), Печенье (331),
Шоколад (253), Конфеты (469)
```
Стало: 1 строка "~5,000+ продуктов из Arbuz".
Детали в: `docs/vault/operations/arbuz-scraping-handbook.md`

### Halal Enrichment
Удалено: 12 строк про Mustakshif (224 YES из 11862), HalalDamu (1130 предприятий), AHIK (668), OFF (0.2%), brand cross-reference, ingredient analysis (9532 продукта).
Стало: 2 строки "multiple sources evaluated, coverage partial".
Детали в:
- `scripts/mustakshif-halal-check.cjs`
- `data/halaldamu-registry-certified.json`
- `data/ahik-registry-enterprises.json`
- `data/halal-e-code-report.json`

### Store-Aware AI (Phases 1-7)
Удалено: ~30 строк про Phase 1-7, AI contract stabilization, AI modernization stages 1-5, AI premium upgrade, AI peak quality stages 8-18.
Стало: 2 строки + ссылка на launch readiness report.
Детали в:
- `docs/vault/plans/2026-05-08-store-ai-pilot-spec.md`
- `docs/vault/plans/2026-05-09-store-ai-implementation-roadmap.md`
- `docs/vault/changelog/2026-05-09-store-ai-phase-*.md`
- `docs/vault/plans/2026-05-15-ai-modernization-plan.md`
- `docs/vault/plans/2026-05-17-ai-premium-upgrade-plan.md`
- `docs/vault/plans/2026-05-17-ai-peak-quality-roadmap.md`
- `docs/vault/changelog/2026-05-17-ai-peak-stage*.md`
- `docs/vault/plans/2026-05-18-ai-peak-pilot-launch-readiness-report.md`

### Catalog Search (Stages 1-9)
Удалено: ~22 строк про Stage 1-9, RPC v2/v2.1, search history, diagnostics, state stabilization.
Стало: 2 строки "RPC v2, 16 signals, V3 complete 82/83 QA".
Детали в:
- `docs/vault/plans/2026-05-13-catalog-search-stage*.md`
- `docs/vault/changelog/2026-05-13-catalog-search-stage*.md`
- `docs/vault/changelog/2026-05-22-catalog-search-v3-complete.md`

### Устаревшие статусы
Удалено: строки про "На 2026-05-06: Auth — DONE", "meta-focus — AI-agent memory system", "Landing V3".
Причина: все эти задачи завершены месяц назад, не являются текущим контекстом.

---

## Из секций 12-17 «Current Focus» — удалённые пересказы

### 12. Product Card Normalization (Stages 1-9)
Удалено: ~30 строк про каждый stage, nutrition mapping, specs, flavor, unit prices, sections, QA fixture, Compare rebuild stages 1-5.
Стало: 2 строки "9 stages complete, Compare rebuild 1-5 complete".
Детали в:
- `docs/vault/plans/2026-05-23-product-card-normalization-professional-plan.md`
- `docs/vault/changelog/2026-05-23-product-card-normalization-stage*.md`
- `docs/vault/changelog/2026-05-31-compare-stage*.md`
- `docs/vault/changelog/2026-06-08-compare-stage5-visual-ux.md`

### 13. Halal Enrichment Focus
Удалено: 5 строк про shared helper, audit pipeline, unit coverage.
Стало: включено в общую сводку Halal Enrichment в секции 5.
Детали в: `src/domain/product/halalEvidence.js`, `scripts/halal-enrichment-audit.cjs`

### 14. Keto Fit-Check Focus
Удалено: 10 строк про attribute extraction, net-carb evaluation, keto tag, live audit (12.1% safe), nutrition coverage (carbs 72%, sugar 1.2%, fiber 0.6%), audit script.
Стало: 2 строки в секции 5.
Детали в: `src/domain/product/attributeExtractor.js`, `src/utils/fitCheck.js`, `scripts/_tmp_keto_audit.mjs`

### 15. Enrichment Reality Check
Удалено: 13 строк про ROI audit (85.4% ingredients, 71.2% carbs), Arbuz dry-run, OFF benchmark (global vs local), USDA недоступен.
Стало: 1 строка в секции 5 + ссылка.
Детали в: `docs/vault/changelog/2026-05-25-enrichment-roi-audit.md`

### 16. First-Three Provider Benchmark
Удалено: 8 строк про FatSecret, Chomp, Nutritionix — все требуют API-ключей, не настроены.
Причина: информация о недоступных провайдерах не является рабочим контекстом.

### 17. Product EAN Integrity (Stages 1-7E)
Удалено: ~50 строк про каждый stage: containment, trusted alias model, legacy dry-run, live insert, correction reporting, inbox, review actions, promotion guardrails, server promotion, admin review UI, typed confirmation, parser hardening, legacy script guard, manual candidate, manual UI.
Стало: 5 строк (сводка всех completed stages + trusted=0 + ссылка на recovery plan).
Детали в:
- `docs/vault/plans/2026-06-01-product-ean-integrity-recovery-plan.md`
- `docs/vault/changelog/2026-06-01-ean-stage*.md`
- `docs/vault/changelog/2026-06-08-ean-stage*.md`
- `docs/vault/changelog/2026-06-09-ean-stage*.md`
- `docs/vault/changelog/2026-06-10-ean-stage*.md`
- `docs/vault/changelog/2026-06-11-ean-stage*.md`
- `docs/vault/changelog/2026-06-13-ean-stage*.md`

---

## Дубликат retail-роутов (строки 114-121)

Удалён полный повтор списка retail-роутов. Оставлен один список в секции 3.

---

## Итого

| Категория | Примерный объём удалённого |
|---|---|
| AI stages (4 + 5) | ~50 строк changelog-пересказов |
| Arbuz import (5) | ~40 строк (25 подкатегорий) |
| Halal enrichment (5 + 13) | ~17 строк |
| Catalog Search (5) | ~22 строк |
| EAN Integrity (17) | ~50 строк |
| Product Normalization (12) | ~30 строк |
| Keto (14) | ~10 строк |
| Enrichment (15-16) | ~21 строка |
| Дубликат роутов | ~10 строк |
| Прочие детали (4) | ~30 строк |
| **Всего** | **~280 строк удалено** |

Размер CONTEXT.md: 538 строк → ~220 строк (сокращение на ~60%).