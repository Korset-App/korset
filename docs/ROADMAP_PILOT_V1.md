# KORSET — ROADMAP

> Обновлено: 2026-05-06.
> Роль файла: текущие приоритеты, открытые решения и launch direction. Это не архив всех планов.
> Архивные аудиты и старые фазы лежат в `docs/vault/plans/` и `docs/vault/changelog/`.

---

## 1. Current Goal

Сделать Körset pilot-ready для первого продуктового магазина:
- buyer PWA должна быть отличным публичным цифровым каталогом для просмотра из дома и надежным помощником у полки;
- retail cabinet должен выглядеть и работать как продаваемый B2B-инструмент (с удобным обновлением цен);
- data pipeline должен честно обрабатывать unknown EAN и не выдумывать безопасность;
- документация и Vault должны помогать нескольким ИИ-агентам работать без конфликтов.

Критерий качества: не “быстро накидать”, а shipped-quality без лишнего усложнения.
Стратегический сдвиг: продукт — это публичный каталог (Digital Storefront), а сканер — это лишь одна из фич у полки. Регистрация не требуется для просмотра.

---

## 2. P0 — Now

1. Memory system normalization
   - `AGENTS.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `ROADMAP_PILOT_V1.md` должны иметь разные роли.
   - Vault folders need README indexes and consistent metadata.
   - `scripts/embed-vault.mjs` should index domains correctly on Windows.

2. Verify/fix `AlternativesScreen.jsx`
   - Check current runtime bug around `useLocalName(product)`.
   - Remove old hardcoded core colors if still present.
   - Verify product route, empty states and same-store alternative logic.

3. Auth/profile final verification
   - Confirm Supabase redirect URLs.
   - Confirm email templates and password recovery.
   - Smoke test Google, email/password, email code and account linked-method UI.

4. Pilot data readiness
   - Choose first real pilot store/data source.
   - Validate product import path for real CSV/XLS/XLSX.
   - Confirm unknown EAN recovery loop.

5. Digital Catalog Transition
   - Implement SEO injection: Schema.org, Meta-tags, dynamic title/description per store and product.
   - Rename "Favorites" to "Shopping List" (Список покупок) globally in UI and data.
   - Hide `out_of_stock` products by default in public catalog.
   - Implement `is_published` (draft mode) flag for stores to hide unready catalogs.
   - Remove gating logic, ensure unhindered public access.

6. Launch-quality checks
   - Mobile catalog flow and SEO visibility.
   - Product page and Fit-Check.
   - Catalog search/category browsing.
   - Retail dashboard/products/import/settings.
   - Offline behavior in weak/no network.

---

## 3. P1 — Next

1. Data Moat v1
   - product quality score;
   - source confidence;
   - TTL/freshness;
   - Kazakhstan/EAEU barcode/data sources;
   - clear “unknown / not enough data” states.

2. Retail polish
   - B2B metrics in money, not only counts;
   - import report clarity;
   - better owner-facing empty/error states;
   - settings/branding polish.

3. Database integrity and performance
   - unique constraints where needed;
   - cascade rules;
   - indexes for search/analytics;
   - RLS verification;
   - scan_events growth plan.

4. ProductScreen and resolver cleanup
   - reduce monolith risk;
   - keep deterministic safety logic clear;
   - make unknown/enriched/cached states obvious.

5. Launch materials
   - QR poster/sticker/cashier assets;
   - cashier pitch sheet;
   - physical store test checklist.

---

## 4. Frozen For V1

Do not build these unless the owner explicitly changes scope:

- non-grocery verticals;
- social/gamification;
- in-app B2B payments;
- full self-service owner onboarding;
- AR/computer-vision recognition without barcode;
- interactive 3D store map/planogram;
- heavy health dashboards beyond the immediate Fit-Check value.

These ideas may stay in Vault, but they should not distract from pilot readiness.

---

## 5. Open Decisions

These require owner input before implementation:

- First pilot store and real dataset source.
- Exact B2B offer: monthly price, trial/discount, included services.
- Whether phone/WhatsApp identity returns later and in what form.
- Product photo pipeline: manual, AI-assisted, R2/Supabase Storage, compression policy.
- How strict V1 must be on local JSON/demo fallbacks.
- Which physical launch materials are needed first.

---

## 6. Useful Deep Links

- Fast context: `docs/CONTEXT.md`
- Architecture map: `docs/ARCHITECTURE.md`
- AI collaboration protocol: `docs/AI_COLLAB_PROTOCOL.md`
- Full legacy audit: `docs/vault/plans/audit-full.md`
- Data Moat: `docs/vault/knowledge/data-moat-pipeline-strategy.md`
- Retail import: `docs/vault/changelog/retail-import-v1-2026-04-25.md`
- Offline resilience: `docs/vault/architecture/offline-resilience.md`
- Auth system: `docs/vault/architecture/auth-system.md`
- EAN recovery: `docs/vault/architecture/ean-recovery-system.md`

---

## 7. How To Update This File

Keep it short.

Add only:
- current priorities;
- open product decisions;
- launch blockers;
- frozen scope changes;
- links to deeper plans.

Move completed histories and long reasoning into dated Vault changelog or plans.
