---
title: Alternatives Professional Upgrade Plan
date: 2026-05-22
domain: plans
status: completed
area: product
related: [[product-comparison-engine]] · [[controlled-product-enrichment]] · [[2026-05-06-alternatives-screen-store-catalog]]
---

# Alternatives Professional Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** превратить экран альтернатив из простого списка похожих товаров в профессиональный store-scoped replacement flow с серверным ранжированием, сценариями выбора, контекстным AI и базовой аналитикой.

**Architecture:** Основной подбор выполняет Supabase RPC `fn_get_product_alternatives`, который возвращает связанные товары текущего магазина с ranking/debug metadata. Frontend использует тонкий JS adapter для профиля пользователя, UI-сценариев, карточек, compare CTA и AI intent, не выдумывая факты вне данных магазина.

**Tech Stack:** React 18 + Vite, JavaScript, vanilla CSS, Supabase PostgreSQL RPC/RLS, existing Fit-Check/comparison/AI modules, node:test, Playwright smoke.

---

## Product Decisions

- Default scenarios: `similar`, `fits_me`, `cheaper`, `better_composition`.
- No `premium` / `more_expensive` mode in V1.
- Price mode uses package price (`price_kzt`), not price per unit, for V1.
- Out-of-stock products may appear, but must be visibly marked and ranked lower.
- Products with incomplete composition must rank lower in `fits_me` and `better_composition`, and UI must show a concise "composition incomplete" note.
- `halal` uses the existing soft confidence ladder, not strict confirmed-only filtering.
- AI CTA label: "Помочь выбрать".
- ProductScreen risky Fit-Check callout appears under Fit-Check and links to alternatives.
- Initial implementation uses server-side Supabase RPC for candidate retrieval and base ranking.

## Implementation Status

Completed on 2026-05-22.

- Migration `supabase/migrations/033_product_alternatives_rpc.sql` was applied manually in Supabase after SQL function syntax was corrected.
- `fn_get_product_alternatives` is the RPC-first source for same-store alternative candidates, with local catalog fallback preserved for offline/error cases.
- Alternatives UI now supports scenarios `similar`, `fits_me`, `cheaper`, and `better_composition`, professional cards, compare actions, stock/data-completeness notes, and contextual `Помочь выбрать` AI navigation.
- ProductScreen now has a risky Fit-Check alternatives callout and keeps the bottom actions `Альтернативы`, `Спросить ИИ`, and `Сравнить`.
- Alternative-selection AI is contextual and separate from normal Product AI chat history through the `alternative_selection` flow.
- Analytics persistence was added after owner approval through `supabase/migrations/035_alternative_events.sql`. It stores metadata-only events and uses RLS: anon/authenticated insert with validated EAN/event/scenario/client token, owner-only read.
- Retail Dashboard now surfaces owner-facing aggregate alternative signals for the selected period through RPC `fn_get_alternative_events_summary` from `supabase/migrations/036_alternative_events_summary_rpc.sql`.
- Retail AI insights include `alternative_decision_demand` when alternative usage is high enough to become an owner action.
- Verification: targeted alternatives/retail unit tests pass 30/30, i18n check passes, `npm run lint` exits 0 with existing warnings, `npm run build` passes, and browser smokes covered RPC alternatives, ProductScreen callout, compare CTA, contextual AI, frontend analytics events, and mocked `alternative_events` insert. `node scripts/verify-migrations.mjs` could not run locally because `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were not available.

## File Map

- Create: `supabase/migrations/033_product_alternatives_rpc.sql`  
  Defines `fn_get_product_alternatives`, same-store scoping, relation/ranking metadata, scenario parameter, grants.

- Modify: `src/domain/product/alternatives.js`  
  Keep EAN helpers; add client adapter for RPC rows, profile-aware reranking helpers, scenario constants.

- Create: `src/domain/product/alternativeScenarios.js`  
  Owns scenario definitions, labels, sort policy names, and UI ordering.

- Modify: `src/screens/AlternativesScreen.jsx`  
  Replace simple local list with scenario chips, loading/error/empty states, cards, compare CTA, contextual AI CTA.

- Modify: `src/screens/ProductScreen.jsx`  
  Add risky Fit-Check alternatives callout and rename AI button label to avoid `AI` looking like `A1`.

- Modify: `src/screens/AIScreen.jsx` and `src/services/ai.js`  
  Pass `alternative_selection` intent/context when user enters AI from Alternatives.

- Modify: `api/ai.js`  
  Add prompt contract for alternative selection: choose only from provided alternatives, explain trade-offs, do not invent missing facts.

- Modify: `src/locales/ru/alternatives.json`, `src/locales/kz/alternatives.json`, `src/locales/ru/product.json`, `src/locales/kz/product.json`, `src/locales/ru/ai.json`, `src/locales/kz/ai.json`  
  Add all visible text through i18n.

- Create: `tests/unit/alternativesRpcMapping.test.mjs`  
  Tests JS mapping/reranking contract for RPC rows.

- Modify: `tests/unit/alternatives.test.mjs`  
  Keep existing local fallback tests; add scenario behavior tests.

- Modify/Create: `tests/e2e/alternatives.spec.js`  
  Smoke test mobile alternatives screen, scenario chips, compare CTA, and contextual AI navigation with mocked data where feasible.

- Optional stage after owner approval: create `supabase/migrations/034_alternative_events.sql` and frontend event logger for analytics. Analytics should be metadata-only.

---

## Task 1: Server RPC Contract

**Files:**
- Create: `supabase/migrations/033_product_alternatives_rpc.sql`
- Test manually with Supabase SQL editor or local linked project when credentials are available.

- [ ] **Step 1: Create migration with scenario-aware RPC**

Create `fn_get_product_alternatives(p_store_id uuid, p_ean text, p_scenario text default 'similar', p_limit integer default 24)`.

Required return columns:

```sql
RETURNS TABLE (
  ean text,
  gp_ean text,
  local_name text,
  price_kzt integer,
  shelf_zone text,
  stock_status text,
  store_product_id uuid,
  global_product_id uuid,
  name text,
  name_kz text,
  brand text,
  category text,
  subcategory text,
  quantity text,
  image_url text,
  ingredients_raw text,
  ingredients_kz text,
  allergens_json jsonb,
  diet_tags_json jsonb,
  traces_json jsonb,
  nutriments_json jsonb,
  halal_status text,
  packaging_type text,
  fat_percent numeric,
  nutriscore text,
  product_group text,
  alternate_eans jsonb,
  relation_rank integer,
  price_delta_kzt integer,
  has_composition boolean,
  data_completeness integer,
  availability_rank integer,
  base_rank numeric,
  rank_reason text
)
```

Base SQL rules:

- source product resolves by `sp.ean = p_ean OR gp.ean = p_ean OR gp.alternate_eans @> ARRAY[p_ean]::text[]`;
- candidates must share the same `store_id`, `sp.is_active = true`, `gp.is_active = true`;
- exclude source product by store/global IDs and EAN/alternate EAN match;
- relation priority: same `group` = 0, same `subcategory` = 1, same `category` = 2, else excluded;
- availability rank: `in_stock = 3`, `low_stock = 2`, unknown = 1, `out_of_stock = 0`;
- `has_composition = ingredients_raw is not null or ingredients_kz is not null`;
- `data_completeness` counts composition, nutrition, allergens, halal known, image, brand, quantity;
- scenario scoring:
  - `similar`: relation first, availability, price closeness, data completeness;
  - `cheaper`: cheaper candidates first, then relation, availability;
  - `better_composition`: data completeness, composition present, nutriscore if available, relation, availability;
  - `fits_me`: server still returns broad candidates; client profile-aware layer handles allergies/halal safely.

- [ ] **Step 2: Keep security consistent**

Use:

```sql
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
```

Grant:

```sql
GRANT EXECUTE ON FUNCTION public.fn_get_product_alternatives(UUID, TEXT, TEXT, INTEGER)
  TO anon, authenticated;
```

Do not use service role or security definer. The function must inherit existing RLS behavior.

- [ ] **Step 3: Validate SQL shape**

Run:

```bash
node scripts/verify-migrations.mjs
```

Expected: migration syntax check passes. If local DB credentials are unavailable, record that SQL application is deferred.

---

## Task 2: Alternatives Domain Adapter

**Files:**
- Modify: `src/domain/product/alternatives.js`
- Create: `src/domain/product/alternativeScenarios.js`
- Modify: `tests/unit/alternatives.test.mjs`
- Create: `tests/unit/alternativesRpcMapping.test.mjs`

- [ ] **Step 1: Add scenario constants**

Create scenario ids:

```js
export const ALTERNATIVE_SCENARIOS = ['similar', 'fits_me', 'cheaper', 'better_composition']

export const DEFAULT_ALTERNATIVE_SCENARIO = 'similar'

export function normalizeAlternativeScenario(value) {
  return ALTERNATIVE_SCENARIOS.includes(value) ? value : DEFAULT_ALTERNATIVE_SCENARIO
}
```

- [ ] **Step 2: Add RPC row mapper**

Map RPC rows into current product shape with metadata:

```js
{
  ...candidateProduct,
  alternativeMeta: {
    relationRank,
    priceDeltaKzt,
    hasComposition,
    dataCompleteness,
    availabilityRank,
    baseRank,
    rankReason,
  }
}
```

Use existing product field names: `priceKzt`, `stockStatus`, `nutritionPer100`, `ingredients`, `ingredientsKz`, `alternateEans`.

- [ ] **Step 3: Add profile-aware reranking**

Implement `rankAlternativesForProfile({ product, candidates, profile, scenario })`.

Rules:

- direct Fit-Check danger goes below safe/unknown candidates;
- missing composition goes lower for users with allergens and in `fits_me`;
- `halalStatus: no` goes below compatible candidates when profile has `halalOnly` or `halalStrict`;
- out-of-stock goes below available candidates but remains visible;
- `cheaper` mode only prefers candidates with `priceKzt < source.priceKzt`; if none exist, show empty state with "no cheaper alternatives";
- `similar` keeps most source-like relation first.

- [ ] **Step 4: Unit tests**

Run:

```bash
node --test tests/unit/alternatives.test.mjs tests/unit/alternativesRpcMapping.test.mjs
```

Expected: tests pass and cover `similar`, `fits_me`, `cheaper`, `better_composition`, out-of-stock, incomplete composition, and alternate EAN exclusion.

---

## Task 3: Alternatives Screen UX

**Files:**
- Modify: `src/screens/AlternativesScreen.jsx`
- Modify: `src/index.css` if shared classes are better than inline styles
- Modify: `src/locales/ru/alternatives.json`
- Modify: `src/locales/kz/alternatives.json`

- [ ] **Step 1: Load alternatives from RPC**

Use `supabase.rpc('fn_get_product_alternatives', { p_store_id: storeId, p_ean: ean, p_scenario: scenario, p_limit: 24 })`.

Fallback:

- if RPC fails, show honest error with retry;
- if offline and `catalogProducts` exist, use local `findProductAlternatives` fallback with a visible offline hint;
- no silent cross-store recommendations.

- [ ] **Step 2: Add scenario chips**

Visible labels:

- `Похожие`
- `Подходят мне`
- `Дешевле`
- `Лучший состав`

KZ translations must be added before UI is considered complete.

UI behavior:

- chips are horizontally scrollable on mobile;
- selected chip has clear active state;
- switching chip refetches RPC and reranks client-side;
- source product card remains stable above list.

- [ ] **Step 3: Build professional card layout**

Each alternative card shows:

- product image;
- localized product name;
- brand and quantity;
- package price;
- stock badge;
- one primary reason;
- optional `composition incomplete` note;
- actions: `Открыть`, `Сравнить`.

Do not show fake percentages. Do not repeat medical/package warnings on every card.

- [ ] **Step 4: Empty states**

Separate empty states:

- no related alternatives;
- no cheaper alternatives;
- no profile-fitting alternatives;
- catalog/store still loading;
- RPC error;
- offline local fallback unavailable.

- [ ] **Step 5: Visual verification**

Run Vite and inspect mobile:

```bash
npm run dev -- --host 127.0.0.1
```

Then use Playwright/browser smoke for:

- `/s/:storeSlug/product/:ean/alternatives`;
- default `similar`;
- each chip;
- open product;
- compare CTA;
- light and dark themes if theme toggle is available.

---

## Task 4: ProductScreen Risk Callout

**Files:**
- Modify: `src/screens/ProductScreen.jsx`
- Modify: `src/locales/ru/product.json`
- Modify: `src/locales/kz/product.json`

- [ ] **Step 1: Add callout condition**

Show callout when `checkProductFit(product, profile)` returns verdict `danger`, `warning`, or `caution`.

Do not show duplicate callout when product is unknown/not resolved.

- [ ] **Step 2: Add copy**

RU:

- title: `Есть похожие варианты`
- body: `Можно посмотреть замены в этом магазине, которые лучше учитывают ваш профиль.`
- button: `Показать подходящие замены`

KZ must be localized in the same keys.

- [ ] **Step 3: Preserve existing bottom actions**

Keep bottom actions:

- `Альтернативы`;
- rename AI action to `Спросить помощника` or the existing common key if shared;
- `Сравнить`.

No major ProductScreen redesign in this task.

---

## Task 5: Contextual AI For Alternatives

**Files:**
- Modify: `src/screens/AlternativesScreen.jsx`
- Modify: `src/screens/AIScreen.jsx`
- Modify: `src/services/ai.js`
- Modify: `api/ai.js`
- Modify: `src/locales/ru/ai.json`
- Modify: `src/locales/kz/ai.json`
- Modify: AI unit tests around product prompt/response shape

- [ ] **Step 1: Pass navigation state**

When user taps `Помочь выбрать`, navigate to product AI route with state:

```js
{
  product,
  aiIntent: 'alternative_selection',
  alternativeScenario: scenario,
  alternatives: visibleAlternatives.slice(0, 5)
}
```

- [ ] **Step 2: Include intent in API payload**

Extend `askProductAIResponse` to send:

```js
alternativeIntent: {
  type: 'alternative_selection',
  scenario,
}
```

Keep backward compatibility when state is absent.

- [ ] **Step 3: Prompt contract**

Server prompt must say:

- user is choosing an alternative to the current product;
- recommend only from the provided alternatives;
- mention trade-offs by price, fit, composition completeness, stock;
- do not invent halal certificate, absence of allergens, shelf, composition, or stock;
- if data is incomplete, say it briefly and do not overstate safety.

- [ ] **Step 4: Initial assistant suggestion**

When AIScreen opens from alternatives, show or seed a contextual first user message equivalent to:

`Помоги выбрать лучшую альтернативу из этих вариантов.`

Do not auto-call OpenAI without explicit user action unless existing AI UX already does this elsewhere.

---

## Task 6: Compare CTA Integration

**Files:**
- Modify: `src/screens/AlternativesScreen.jsx`
- Verify: `src/screens/CompareScreen.jsx`
- Verify: `src/domain/product/comparison.js`

- [ ] **Step 1: Add compare button**

Each alternative card has `Сравнить`.

Navigation:

```js
navigate(buildComparePath(activeStoreSlug, product.ean, alt.ean), {
  state: { productA: product, productB: alt }
})
```

If CompareScreen expects sessionStorage instead of route state, write both state and the existing expected storage keys to preserve behavior.

- [ ] **Step 2: Keep card click behavior clear**

Primary card tap or `Открыть` opens alternative product. `Сравнить` must stop propagation so it does not open the product accidentally.

---

## Task 7: Analytics Foundation

**Files:**
- Create only after owner approval: `supabase/migrations/034_alternative_events.sql`
- Create/Modify: `src/domain/product/alternativeEvents.js`
- Modify: `src/screens/AlternativesScreen.jsx`

- [ ] **Step 1: Confirm analytics scope before DB changes**

Ask owner before adding persistence. Recommended metadata-only events:

- `alternatives_viewed`;
- `alternative_scenario_selected`;
- `alternative_opened`;
- `alternative_compared`;
- `alternative_ai_help_clicked`.

Do not store user messages, raw profile, allergens list, email, phone, IP, or full product composition.

- [ ] **Step 2: If approved, create table with RLS**

Table columns should be metadata-only:

```sql
store_id uuid not null,
source_ean text not null,
candidate_ean text,
scenario text,
event_type text not null,
created_at timestamptz not null default now()
```

Use anon insert policy only if consistent with existing scan analytics; otherwise defer persistence and log locally for smoke testing only.

---

## Task 8: Verification And Handoff

**Files:**
- Modify: `docs/CONTEXT.md`
- Add changelog after implementation: `docs/vault/changelog/YYYY-MM-DD-alternatives-professional-upgrade.md`

- [ ] **Step 1: Targeted unit checks**

Run:

```bash
node --test tests/unit/alternatives.test.mjs tests/unit/alternativesRpcMapping.test.mjs
node --test tests/unit/productComparison.test.mjs
node scripts/check-i18n.mjs
```

Expected: pass.

- [ ] **Step 2: UI/build checks**

Run:

```bash
npm run lint
npm run build
```

Expected: pass or report unrelated pre-existing failures with exact file/test names.

- [ ] **Step 3: Agent check**

Run:

```bash
npm run check:agent:ui
```

Expected: pass.

- [ ] **Step 4: Browser smoke**

Use mobile viewport and verify:

- ProductScreen risky callout appears only for risky Fit-Check;
- Alternatives default list is not empty for a category with related products;
- chips change ordering/results;
- out-of-stock and incomplete composition notes are visible when data exists;
- compare opens compare route;
- `Помочь выбрать` opens AI with alternative-selection context;
- no raw `AI` button label remains where it visually reads as `A1`.

- [ ] **Step 5: Memory update**

Update `docs/CONTEXT.md` with a short durable pointer and create a changelog note. Run:

```bash
npm run memory:save
```

Expected: memory save completes, or note credentials/network blocker.

---

## Recommended Implementation Order

1. RPC and mapper tests.
2. Alternatives domain adapter and scenario contract.
3. AlternativesScreen UI.
4. ProductScreen risk callout.
5. Compare CTA.
6. Contextual AI.
7. Analytics decision and implementation only if owner confirms persistence.
8. Full verification and memory update.

## Execution Stages

### Stage 1 — Server Contract And Domain Foundation

Build the professional data foundation before UI work:

- create `fn_get_product_alternatives` RPC;
- add scenario constants;
- add RPC row mapper;
- add profile-aware client reranking for `fits_me`;
- keep local catalog fallback behavior intact;
- verify with unit tests, lint, and build.

Stage 1 does not change the visible UI yet.

### Stage 2 — Alternatives Screen Experience

Turn the existing screen into the main replacement decision surface:

- fetch alternatives from RPC;
- add chips `Похожие`, `Подходят мне`, `Дешевле`, `Лучший состав`;
- render professional cards with reasons, stock, incomplete composition note, price, open action, and compare action;
- add loading, offline fallback, error, and scenario-specific empty states;
- verify mobile light/dark behavior.

### Stage 3 — ProductScreen Entry Points And Compare Flow

Make alternatives discoverable at the right moment:

- keep the three bottom actions;
- rename product AI CTA text to avoid the visible `AI` / `A1` ambiguity;
- add risky Fit-Check callout under Fit-Check;
- wire compare CTA from each alternative into `CompareScreen`;
- verify that ProductScreen stays clean and not redesigned.

### Stage 4 — Contextual "Помочь выбрать" AI

Make AI secondary but context-aware:

- pass `alternative_selection` intent from AlternativesScreen;
- pass selected scenario and visible alternatives;
- update client/server AI contract;
- update prompt guardrails so the model only chooses from visible same-store alternatives;
- verify with unit prompt tests and mocked UI smoke.

### Stage 5 — Analytics, Hardening, And Handoff

Finish the feature as a durable product capability:

- decide whether to persist metadata-only alternative events now;
- if approved, add RLS-safe analytics migration and event logger;
- run broad checks;
- browser-smoke the full user flow;
- update `docs/CONTEXT.md`, Vault changelog, and memory embeddings.

## Risks

- RPC must not bypass RLS or recommend products outside the active store.
- Catalog RPC currently returns compact product fields; Alternatives RPC must return richer facts needed for composition/data-quality labels.
- `fits_me` cannot be fully solved server-side without sending profile to DB; client-side profile-aware reranking is still required after RPC.
- Avoid scary repeated warning text on every card; use short status notes and keep detailed warnings inside Product/Fit-Check/AI.
- Analytics persistence needs explicit approval because it touches DB/RLS and user behavior tracking.
