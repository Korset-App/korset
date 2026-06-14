# KORSET — ROADMAP

> Обновлено: 2026-06-14.
> Роль файла: текущие приоритеты, открытые решения и launch direction. Это не архив всех планов.
> Архивные аудиты и старые фазы лежат в `docs/vault/plans/` и `docs/vault/changelog/`.

---

## 1. Current Goal

Сделать Körset pilot-ready для продуктовых магазинов:
- buyer PWA — публичный цифровой каталог для просмотра из дома + помощник у полки;
- retail cabinet — продаваемый B2B-инструмент;
- data pipeline — честная обработка unknown EAN без выдумывания;
- документация и Vault — помощь нескольким ИИ-агентам без конфликтов.

Критерий качества: shipped-quality без усложнения.
Стратегический сдвиг (2026-06-11): продукт — публичный каталог (Digital Storefront), сканер — фича у полки. Регистрация не требуется.

---

## 2. P0 — Now

1. ~~Memory system normalization~~ 🔄
   - ✅ `AGENTS.md`, `CONTEXT.md` — готово.
   - 🔄 `ARCHITECTURE.md`, `ROADMAP_PILOT_V1.md` — обновляются (2026-06-14).
   - ⬜ Vault README indexes, metadata.
   - ⬜ `scripts/embed-vault.mjs` — Windows indexing.

2. ~~Verify/fix `AlternativesScreen.jsx`~~ ✅
   → `docs/vault/changelog/2026-05-22-alternatives-professional-upgrade.md`

3. ~~Auth/profile final verification~~ ✅ (2026-05-06)
   - Redirect URLs, providers — verified. Tests 9/9.
   - Единственный ручной остаток: вставить email-шаблоны в Supabase Dashboard.
   → `docs/vault/architecture/supabase-email-templates.md`

4. ~~Pilot data readiness~~ ✅
   - Магазины: Mars (mars, ~10K), Нұрлы (nurly, ~2.5K), Калина (kalina, ~2K).
   - Источник: Arbuz.kz (~5,000+ EAN импортировано).
   - Import (CSV/XLS/XLSX) + EAN Recovery — работают.

5. ~~Digital Catalog Transition~~ 🔄
   - ✅ SEO: Schema.org, OpenGraph, sitemap.xml, robots.txt.
   - ✅ Gating logic removed (access gate, токены, коды — отменены).
   - ⬜ "Favorites" → "Shopping List" (Список покупок) — pending verify.
   - ⬜ `out_of_stock` hide, `is_published` flag — pending verify.

6. Launch-quality checks
   - ✅ Mobile catalog flow, SEO.
   - ✅ Product page, Fit-Check.
   - ✅ Catalog search, category browsing.
   - ✅ AI assistant (text/voice/image).
   - ⬜ Полный smoke: retail dashboard, products, import, settings.
   - ⬜ Offline behavior (weak/no network).

---

## 3. P1 — Next

1. Data Moat v1 — product quality score, source confidence, TTL, KZ/EAEU barcode sources.
2. Retail polish — B2B метрики в деньгах, import report clarity, empty/error states.
3. DB integrity — unique constraints, cascade rules, indexes, RLS verification, scan_events growth.
4. ProductScreen resolver cleanup — reduce monolith, clear unknown/enriched states.
5. Launch materials — QR poster/sticker, cashier pitch, physical store test checklist.

---

## 4. Frozen For V1

Не строить без явного изменения scope владельцем:

- non-grocery verticals (аптеки, электроника, строительные, alcohol/tobacco);
- social/gamification;
- in-app B2B payments;
- full self-service owner onboarding;
- AR/computer-vision без barcode;
- interactive 3D store map/planogram;
- heavy health dashboards за пределами Fit-Check.

---

## 5. Open Decisions

Требуют ввода владельца:

- Exact B2B offer: monthly price, trial/discount, included services.
- Product photo pipeline: manual vs AI-assisted, R2/Supabase Storage, compression.
- How strict V1 must be on local JSON/demo fallbacks.
- Which physical launch materials are needed first.

Решено:
- First pilot store → Mars, Нұрлы, Калина. Source: Arbuz.kz.
- Phone/WhatsApp identity → удалён, не возвращается.

---

## 6. Useful Deep Links

- Fast context: `docs/CONTEXT.md`
- Architecture map: `docs/ARCHITECTURE.md`
- AI collaboration protocol: `docs/AI_COLLAB_PROTOCOL.md`
- Full legacy audit: `docs/vault/plans/audit-full.md`
- Data Moat: `docs/vault/knowledge/data-moat-pipeline-strategy.md`
- Offline resilience: `docs/vault/architecture/offline-resilience.md`
- Auth system: `docs/vault/architecture/auth-system.md`
- EAN recovery: `docs/vault/architecture/ean-recovery-system.md`
- Context cleanup archive: `docs/vault/changelog/2026-06-14-context-cleanup-archive.md`

---

## 7. How To Update This File

Keep it short.
Add only: current priorities, open product decisions, launch blockers, frozen scope changes, links to deeper plans.
Move completed histories and long reasoning into dated Vault changelog or plans.