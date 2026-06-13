# KORSET — ARCHITECTURE MAP

> Обновлено: 2026-05-06.
> Роль файла: карта системы для глубокого входа. Это не changelog, не roadmap и не архив всех прошлых идей.
> Быстрый старт: `docs/CONTEXT.md`. Текущие приоритеты: `docs/ROADMAP_PILOT_V1.md`. Детальная память: `docs/vault/`.

---

## 1. Product Shape

Korset — цифровой каталог + smart assistant для продуктовых офлайн-магазинов Казахстана.
Публичный онлайн-каталог магазина с ценами доступен из дома без регистрации. Внутри магазина покупатель может отсканировать штрихкод у полки для мгновенного доступа к карточке товара.
В обоих сценариях доступен Fit-Check: подходит ли товар под аллергии, халал, диеты и личные ограничения.

Бизнес-модель B2B2C:
- покупатель получает удобный онлайн-каталог для планирования покупок (Список покупок) и бесплатную утилиту у полки;
- магазин платит за подписку, получает свою страницу в интернете (korset.kz/s/mars) для SEO и локального поиска, аналитику просмотров, цифровой слой ассортимента и меньше потерянных продаж;
- V1 scope: только продуктовые магазины. Пилот: Астана.

Архитектурный принцип: сначала открытый публичный каталог и надежный store-context product resolver / Fit-Check, потом AI/RAG как объясняющий слой. Регистрация используется только как апгрейд (синхронизация списков), а не как барьер.

---

## 2. Stack

| Layer | Current choice |
| --- | --- |
| Frontend | React 18, Vite, SPA |
| Language | JavaScript ESM, not TypeScript |
| Styles | Vanilla CSS, semantic CSS variables, dark/light themes |
| Routing | `react-router-dom` v6 |
| Data/backend | Supabase PostgreSQL, Auth, Storage, RLS |
| API | Vercel Serverless functions in `api/` |
| AI | OpenAI + project Vault RAG |
| Offline | Service worker, IndexedDB, pending scan queue |
| Tests/checks | Vitest-like node tests, Playwright, ESLint, build |

---

## 3. Runtime Map

```text
User / phone
  -> Vite React SPA
  -> React contexts: auth, profile, store, offline, user data
  -> domain/utils: resolver, fit-check, catalog, retail, i18n
  -> Supabase: auth + tables + storage + RLS
  -> Vercel APIs: AI, EAN recovery, push, monitoring
  -> OpenAI / RAG when explanation or chat is needed
```

Primary entry points:
- `src/App.jsx` — top-level routing and providers.
- `src/contexts/StoreContext.jsx` — active store loading and store context.
- `src/domain/` and `src/utils/` — product resolution, Fit-Check, catalog and retail helpers.
- `api/ai.js` — server-side AI endpoint with RAG context.
- `scripts/embed-vault.mjs` and `scripts/query-vault.mjs` — project memory indexing/search.

---

## 4. Routing Boundaries

Public/system:

```text
/                         landing
/stores                   store list
/stores/:storeSlug        public store page
/auth                     authentication
/update-password          password recovery completion
/setup-profile            profile setup
/qr-print                 QR print page
/privacy-policy           privacy policy
```

Consumer store context:

```text
/s/:storeSlug
/s/:storeSlug/scan
/s/:storeSlug/catalog
/s/:storeSlug/ai
/s/:storeSlug/history
/s/:storeSlug/profile
/s/:storeSlug/profile/edit
/s/:storeSlug/account
/s/:storeSlug/notifications
/s/:storeSlug/privacy
/s/:storeSlug/sound-settings
/s/:storeSlug/faq
/s/:storeSlug/about
/s/:storeSlug/terms
/s/:storeSlug/product/:ean
/s/:storeSlug/product/:ean/alternatives
/s/:storeSlug/product/:ean/ai
/s/:storeSlug/product/:ean/compare/:ean2
```

Retail:

```text
/retail
/retail/:storeSlug/dashboard
/retail/:storeSlug/products
/retail/:storeSlug/import
/retail/:storeSlug/ean-recovery
/retail/:storeSlug/settings
```

Invariant: shopping flows for buyers stay under `/s/:storeSlug/`.

---

## 5. Core Data Model

Conceptual model:

| Entity | Purpose |
| --- | --- |
| `stores` | Store identity, owner, branding, address, settings |
| `global_products` | Canonical product facts by EAN/UUID: names, composition, nutrition, allergens, halal, images |
| `store_products` | Store overlay: price, stock, shelf, visibility, store-specific metadata |
| `scan_events` | Product demand, behavior and analytics signals |
| Unknown EAN staging | Data improvement queue for unresolved products |
| Vault embeddings | RAG memory chunks for assistant/project knowledge |

Rules:
- Do not invent product facts when EAN data is missing.
- Unknown EAN is a data pipeline event, not a reason for confident AI claims.
- Store overlay must not mutate canonical facts unless the code explicitly handles that pipeline.
- Database/RLS changes need migration-level care and verification.

Detailed docs:
- `docs/vault/architecture/product-resolution.md`
- `docs/vault/architecture/ean-recovery-system.md`
- `docs/vault/knowledge/data-moat-pipeline-strategy.md`
- `supabase/`

---

## 6. Product Resolution

Expected cascade:

```text
EAN / product route
  -> store-specific catalog overlay
  -> global product facts
  -> offline IndexedDB cache when needed
  -> enrichment / unknown EAN flow
  -> demo/local fallback only when explicitly supported
```

Fit-Check should prefer deterministic logic for safety-critical constraints. AI may explain and enrich, but must not override hard medical blocks without trusted data.

Known important screens:
- `src/screens/ProductScreen.jsx`
- `src/screens/ScanScreen.jsx`
- `src/screens/CatalogScreen.jsx`
- `src/screens/CompareScreen.jsx`
- `src/screens/AlternativesScreen.jsx`

Risk note: `AlternativesScreen.jsx` needs a targeted verification/fix before it is treated as production-polished.

---

## 7. Fit-Check Safety Model

Safety levels:
- Red: deterministic medical blocks such as allergens and diabetes-critical ingredients.
- Orange: traces / may-contain warnings.
- Yellow: lifestyle/religion signals such as halal and diet preferences, using trusted fields first and AI only as fallback/explanation.
- Green: acceptable or no known conflict.

Principles:
- Missing composition under a medical filter is not “safe”.
- AI explanations should cite known product/profile facts and avoid medical certainty beyond the data.
- Cross-sell/alternatives are valuable only when they come from the same store context and are actually available enough to be useful.

Detailed doc: `docs/vault/architecture/fit-check-engine.md`.

---

## 8. AI And RAG

AI layer:
- user-facing assistant and product explanation;
- compare mode;
- project memory search through Vault embeddings;
- should not become the source of truth for product safety.

RAG memory:
- source markdown lives in `docs/vault/`;
- embeddings live in Supabase `vault_embeddings`;
- `scripts/embed-vault.mjs` indexes markdown chunks;
- `scripts/query-vault.mjs` searches by semantic query and optional metadata filters.

Memory source hierarchy for agents:

```text
AGENTS.md -> docs/CONTEXT.md -> targeted code search -> relevant architecture/roadmap/vault docs
```

Do not load the whole vault by default. Query it when deep memory is needed.

---

## 9. Auth And Profile

Current shape:
- Supabase Auth.
- Google OAuth, email/password, email OTP, password recovery.
- Profile and account screens are separate from initial authentication.
- Account screen can show linked methods and existing phone identity, but phone/WhatsApp UI is not the current AuthScreen path.
- User avatars must use `<ProfileAvatar />`.

Risk areas:
- Redirect URLs and email templates are partly configured outside code in Supabase Dashboard.
- Auth changes can easily break onboarding/profile/account recovery flows; verify the full route chain.

Detailed docs:
- `docs/vault/architecture/auth-system.md`
- `docs/vault/architecture/auth-flow.md`

---

## 10. Retail Cabinet

Retail cabinet exists to make the B2B subscription sellable.

Core modules:
- Dashboard: scans, business metrics, opportunity signals.
- Products: price/stock/shelf editing, barcode search, list/grid management.
- Import: CSV/XLS/XLSX, template download, preview/mapping, bulk update, unknown EAN staging.
- EAN Recovery: unresolved product workflow.
- Settings: store data, logo/branding, QR, notifications, dangerous catalog actions.

Key docs:
- `docs/vault/architecture/retail-cabinet.md`
- `docs/vault/changelog/retail-import-v1-2026-04-25.md`
- `docs/vault/changelog/retail-import-v1-1-2026-04-25.md`

When changing retail code, verify both buyer-facing store context and owner-facing cabinet flows.

---

## 11. Offline Resilience

Offline is graceful degradation, not a separate product mode.

Current architecture:
- app shell through PWA/service worker;
- IndexedDB store catalog cache;
- pending scan queue;
- offline banner/status context;
- sync on reconnect where supported.

Rules:
- AI chat requires internet and should fail clearly offline.
- Cached product data must be marked when stale.
- Offline cache should never silently become canonical truth.

Detailed doc: `docs/vault/architecture/offline-resilience.md`.

---

## 12. UI, Theme, I18n

UI rules:
- Mobile-first PWA.
- Keep established premium style unless owner explicitly approves design direction changes.
- Support dark and light themes.
- Core UI colors should use semantic CSS variables, not hardcoded white/black surfaces.
- New user-visible text must go through RU/KZ i18n.
- Use `<ProfileAvatar />` for avatars.

Important files:
- `src/styles/theme.css`
- `src/i18n/`
- `src/locales/`
- `scripts/check-i18n.mjs`

Design changes should be verified visually on mobile-like and desktop widths when possible.

---

## 13. Monitoring And Operations

Known operational pieces:
- Sentry frontend/backend integration.
- Telegram alerts.
- Health endpoint.
- Vercel deploys from GitHub push.

Rule: do not run manual `vercel --prod` unless owner explicitly asks. Production deploy should happen through the owner-connected GitHub/Vercel pipeline.

Detailed doc: `docs/vault/operations/monitoring-runbook.md`.

---

## 14. Known Fragile Areas

Keep these as caution flags, not as permanent truth:

- `AlternativesScreen.jsx`: needs verification/fix before production polish.
- Some legacy Vault plans may describe old priorities or model-specific workflows.
- Old roadmap deadlines before 2026-05-06 are historical, not current commitments.
- Any Supabase Dashboard settings, RLS policies and email templates must be verified against the live project before final claims.
- Product completeness/Data Moat remains a business-critical risk.

---

## 15. How To Update This File

Update this file only when architecture-level facts change:
- new subsystem;
- removed subsystem;
- changed data model;
- changed route boundary;
- changed security/auth/offline/RAG architecture.

Do not add:
- session logs;
- detailed task histories;
- temporary TODOs;
- long audit tables;
- speculative ideas without owner decision.

Put details in Vault and link them from here.
