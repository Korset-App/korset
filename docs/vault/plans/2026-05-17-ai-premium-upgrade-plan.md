---
type: plan
status: active
date: 2026-05-17
area: ai
---

# AI Premium Upgrade Implementation Plan

> For agentic workers: execute this plan stage-by-stage. Do not start broad UI redesign, DB/RLS changes, model routing changes, or production deployment without owner approval. Steps use checkbox syntax for tracking.

**Goal:** довести Körset AI до уровня премиального store-aware консультанта у полки: полезного, спокойного, честного по данным и продающего B2B-ценность магазина.

**Architecture:** AI остается server-side через `/api/ai.js`, store-scoped catalog grounding и локальную историю чатов. Product facts, Fit-Check и catalog search остаются deterministic sources of truth; model отвечает как объясняющий и диалоговый слой, не как источник фактов о товаре.

**Tech Stack:** React 18 + Vite, JavaScript, vanilla CSS, Supabase, Vercel Serverless, OpenAI `gpt-5.4-nano` по умолчанию, Vault RAG для стабильных domain knowledge chunks.

---

## Owner Decisions

- AI positioning: "умный консультант у полки", не generic marketplace chatbot.
- Desired feel: Apple/Shopify premium clarity + ChatGPT-like useful dialogue.
- Model strategy: keep `gpt-5.4-nano` as the default price/quality model; do not enable automatic premium routing yet.
- Store scope: concrete product recommendations must stay inside the current `/s/:storeSlug/` catalog context.
- Missing product behavior: if the product is not visible in the current store, say that clearly, then offer same-store alternatives only when available.
- Shopping lists/meal sets: keep and improve the existing flow for "плов", "ужин до 5000 ₸", budget and family-use scenarios.
- Chat history: local client-side persistence is acceptable for V1; account-synced history remains later work after privacy design.
- RU/KZ: both languages must be supported; RU can lead QA depth, but KZ must not feel abandoned.
- Store notes/shelf navigation: do not expand shelf/aisle navigation now. Revisit when the product has real shelf/section data.
- Retail AI value: prioritize assortment recommendations and analytics over owner chat.

## Updated Safety Position

The previous AI contract was intentionally strict around halal and unknown facts. For the premium product direction, keep honesty but avoid making the assistant helpless.

### Halal Confidence Ladder

Use these labels internally in prompts, tests, and UX copy:

1. `confirmed_halal`: certificate or trusted `halalStatus: yes`.
2. `likely_compatible`: no obvious haram ingredients are visible in known composition, but no certificate is present.
3. `questionable`: ingredient origin matters or is unclear, such as gelatin, enzymes, flavors, emulsifiers, alcohol-containing flavor carriers, or ambiguous additives.
4. `not_halal`: explicit haram ingredient or trusted `halalStatus: no`.
5. `insufficient_data`: composition is missing or too weak to reason from.

Recommended user wording:

- "По данным карточки товар отмечен как халал."
- "По видимому составу явных запрещённых компонентов не видно, но сертификат не указан. Если для вас это строго, проверьте маркировку на упаковке."
- "Статус сомнительный: в составе есть ингредиенты, происхождение которых важно проверить."
- "По данным карточки товар не подходит как халал."
- "В карточке мало данных о составе, поэтому я не могу уверенно оценить halal-статус."

### Allergy Balance

- If a profile allergen directly matches product allergens/traces, AI should strongly caution and avoid recommending the product.
- If data is missing, AI should say what is unknown and tell the user what to check on the package.
- Do not say "safe" for allergy-sensitive cases; use "по данным карточки не вижу..." with a packaging check.
- Keep the tone calm and useful, not frightening.

### Children And Family Use

- AI may suggest practical snack/meal ideas for children only with moderate wording.
- Avoid age-specific nutrition claims unless the product data has explicit age/category information.
- For baby food, allergies, caffeine, high sugar, or unclear ingredients, ask the user to check package age markers and composition.

## Current System Baseline

Already implemented:

- `src/domain/ai/context.js`: store AI context and local chat persistence.
- `src/domain/ai/catalogSearch.js`: client-side candidate selection for general AI.
- `src/domain/ai/responseShape.js`: structured general AI product groups.
- `src/domain/ai/followUps.js`: deterministic follow-up chips.
- `src/domain/ai/productSuggestions.js`: product AI quick questions.
- `src/services/ai.js`: normalized client contract.
- `api/ai.js`: server prompt, rate limits, OpenAI call, RAG for product/compare, compact usage logs.
- `src/screens/AIAssistantScreen.jsx`: general store AI chat with cards.
- `src/screens/AIScreen.jsx`: product AI chat with same-store alternatives.
- `src/screens/RetailDashboardScreen.jsx`: first-pass "KÖRSET AI заметил" retail insights.

Known gaps:

- No formal `halal confidence ladder` implementation.
- Product AI response is mostly free text; it lacks premium structured sections and alternative cards.
- General AI quality has improved, but broad requests can still mismatch reply text, candidates, and user intent.
- AI screens still contain many inline styles and a few raw colors; they work but are not premium design-system quality.
- Observability logs are console-based and not yet actionable product analytics.
- QA exists as prompt packs, but there is no current real-catalog pass based on the new owner decisions.

## Target File Map

- Modify: `api/ai.js`
  - Update prompts and response contract for halal confidence, allergy balance, children wording, and premium concise style.
- Modify/Create: `src/domain/ai/safetyContract.js`
  - Pure helpers for halal confidence, allergy confidence, and missing-data labels.
- Modify/Create tests: `tests/unit/aiSafetyContract.test.mjs`
  - Unit coverage for halal ladder and allergy wording inputs.
- Modify: `src/domain/ai/catalogSearch.js`
  - Improve grocery intents and candidate scoring for meal sets, budget, children, halal, and missing-product alternatives.
- Modify tests: `tests/unit/aiCatalogSearch.test.mjs`
  - Lock candidate behavior for common store-assistant prompts.
- Modify: `src/domain/ai/responseShape.js`
  - Preserve product-card grounding and add group reasons if needed.
- Modify: `src/services/ai.js`
  - Preserve backward compatibility while accepting structured product AI response later.
- Modify: `src/screens/AIAssistantScreen.jsx`
  - UX polish and design-token cleanup after behavior is stable.
- Modify: `src/screens/AIScreen.jsx`
  - Product AI structured answer UI, alternatives, and design-token cleanup.
- Modify: `src/locales/ru/ai.json`, `src/locales/kz/ai.json`
  - Add copy for confidence labels, product AI sections, missing data, and follow-ups.
- Modify: `src/domain/retail/aiInsights.js` if already extracted, otherwise extract from `RetailDashboardScreen.jsx`
  - Add assortment and analytics signals without owner chat.
- Modify tests: `tests/unit/retailAiInsights.test.mjs`
  - Lock B2B insight behavior.
- Update docs:
  - `docs/vault/plans/2026-05-15-ai-qa-prompt-pack.md` or a new QA pack for the premium pass.
  - `docs/CONTEXT.md` with short durable pointer only.

## Stage 1: Quality Contract And Tests

Purpose: make the new owner decisions executable before touching UX.

- [ ] Write failing tests in `tests/unit/aiSafetyContract.test.mjs` for:
  - confirmed halal product.
  - likely compatible product without certificate.
  - questionable product with gelatin/flavors/enzymes.
  - not halal product.
  - insufficient product data.
  - direct allergen match.
  - missing ingredient data with allergy profile.
- [ ] Create `src/domain/ai/safetyContract.js` with pure helpers:
  - `getHalalConfidence(product)`.
  - `getAllergyConfidence(product, profile)`.
  - `buildSafetyNotes({ product, profile, lang })`.
- [ ] Run `node --test tests/unit/aiSafetyContract.test.mjs`.
- [ ] Update `api/ai.js` product prompt to use the ladder wording, not only "unknown means unknown".
- [ ] Add RU/KZ i18n keys for visible labels if UI will display the ladder in later stages.
- [ ] Run `node scripts/check-i18n.mjs` and AI-focused tests.

Acceptance:

- AI has a balanced middle ground for halal and allergy safety.
- Unknown facts remain honest, but the assistant can still give useful "likely compatible" guidance.

## Stage 2: Real-Catalog QA Matrix

Purpose: find the actual quality failures before adding more code.

- [ ] Create/update a premium QA pack under `docs/vault/plans/`.
- [ ] Cover at least these general AI prompts:
  - `Соберите продукты для плова`
  - `Что купить на ужин до 5000 ₸?`
  - `Покажите халал-сладости`
  - `Что можно ребёнку на перекус?`
  - `Есть манго?`
  - `Покажите дешевле`
  - `Что есть без сахара?`
  - `Что есть без лактозы?`
- [ ] Cover at least these product AI prompts:
  - `Можно ли мне этот продукт?`
  - `Можно ли считать халал?`
  - `Разберите состав простыми словами`
  - `Есть риск для моих аллергий?`
  - `Есть вариант лучше?`
  - `Что проверить на упаковке?`
- [ ] Run mocked browser smoke first for `/s/store-one/ai`.
- [ ] Spend real OpenAI calls only for the first 10 premium QA cases.
- [ ] Stop and fix patterns if fewer than 8/10 pass.

Acceptance:

- Failures are grouped by pattern, not scattered as one-off prompt complaints.
- The next coding stage starts from observed quality gaps.

## Stage 3: General AI Upgrade

Purpose: make the store assistant feel like a competent in-store consultant.

- [ ] Add tests for meal-set and budget candidate selection in `tests/unit/aiCatalogSearch.test.mjs`.
- [ ] Improve `findCatalogCandidates()` for:
  - meal sets: plov, dinner, breakfast, snack.
  - budget caps and cheaper follow-ups.
  - halal intent using the confidence ladder.
  - children/family snack intent with caution filters.
  - no-match alternatives inside current store.
- [ ] Keep `catalogContext` compact; do not send full catalog to OpenAI.
- [ ] Update general prompt in `api/ai.js` so it:
  - does not repeat every product card in text.
  - explains why the selected groups fit the request.
  - says when the current store has no visible match.
- [ ] Run catalog/AI unit tests and mocked browser smoke.

Acceptance:

- Broad shopping requests return useful grouped product cards.
- Text answer and cards agree with each other.
- Missing products produce honest same-store fallback behavior.

## Stage 4: Product AI Premium Response

Purpose: turn product AI from plain chat into a trust-building product advisor.

- [ ] Decide response shape for product AI while keeping legacy string support:
  - `reply`.
  - `verdict`.
  - `confidenceNotes`.
  - `checkOnPackage`.
  - `alternatives`.
  - `warnings`.
- [ ] Update `normalizeAIResponse()` and `askProductAI()` without breaking existing callers.
- [ ] Add tests for product response normalization.
- [ ] Update `AIScreen.jsx` to render:
  - concise verdict block.
  - known facts.
  - "что проверить на упаковке".
  - same-store alternatives as cards.
- [ ] Use semantic CSS variables; remove raw white/black/green/red where touched.
- [ ] Run `node scripts/check-i18n.mjs`, unit tests, and browser smoke for product AI.

Acceptance:

- Product AI answers feel structured and premium.
- It distinguishes known facts, likely guidance, unknown data, and package checks.
- Alternatives remain same-store only.

## Stage 5: AI UI Premium Polish

Purpose: make the AI surfaces visually match the product ambition without redesigning the whole app.

- [ ] Extract repeated chat UI pieces only if it reduces real duplication:
  - assistant bubble.
  - user bubble.
  - product group card.
  - quick chips.
- [ ] Replace inline raw colors in touched AI screens with semantic tokens.
- [ ] Ensure mobile layout does not collide with bottom navigation or safe-area inset.
- [ ] Keep cards compact; avoid nested card-heavy marketing UI.
- [ ] Verify light and dark themes.
- [ ] Run `npm run check:agent:ui` and browser screenshots for general/product AI.

Acceptance:

- AI chat feels calm, premium, and usable at the shelf.
- No broad app redesign occurs during this stage.

## Stage 6: Retail Assortment And Analytics AI

Purpose: increase B2B value without building owner chat.

- [ ] Inspect existing retail insight code and decide whether to extract `src/domain/retail/aiInsights.js`.
- [ ] Add/extend tests for:
  - assortment gaps from unknown EAN demand.
  - categories with high scans and weak catalog coverage.
  - products often scanned but out of stock.
  - weak data quality: missing composition, image, halal status, nutrition.
- [ ] Keep all insights aggregate-only; no user-level analytics.
- [ ] Render 3-5 owner-readable insights with practical next action.
- [ ] Use RU/KZ locale keys.
- [ ] Run retail insight tests, i18n check, and build.

Acceptance:

- Retail owner sees practical assortment and analytics signals.
- Empty state is honest when data is sparse.

## Stage 7: Observability And Cost Control

Purpose: make AI quality measurable without storing sensitive chat text.

- [ ] Extend usage event shape in `api/ai.js` without logging message content:
  - `intent`.
  - `safetyConfidence`.
  - `noCatalogMatch`.
  - `productGroupsCount`.
  - `latencyMs`.
  - `errorType`.
- [ ] Decide storage destination later; console logs remain acceptable until owner approves analytics persistence.
- [ ] Keep rate limits:
  - anonymous: 8/min/IP.
  - authenticated: 30/min/user.
  - max messages: 12.
  - max single message: 1200 chars.
  - max total payload: 6000 chars.
- [ ] Do not enable automatic `gpt-5.4-mini` routing unless owner approves a production cost policy.
- [ ] Run AI launch limit tests and build.

Acceptance:

- AI behavior remains cost-bounded.
- Quality issues can be diagnosed without exposing private user text.

## Verification Matrix

Use the smallest sufficient check for the stage:

- Docs only: `npm run check:agent:docs`.
- AI pure helpers: `node --test tests/unit/aiSafetyContract.test.mjs`.
- Catalog candidate changes: `node --test tests/unit/aiCatalogSearch.test.mjs`.
- Response shape changes: `node --test tests/unit/aiResponseShape.test.mjs`.
- Retail insight changes: `node --test tests/unit/retailAiInsights.test.mjs`.
- i18n changes: `node scripts/check-i18n.mjs`.
- UI changes: `npm run check:agent:ui` plus browser smoke.
- Broad pre-handoff: `npm run check:agent`.
- Before claiming production readiness: `npm run build`.

## Stop-And-Ask Points

Ask the owner before:

- Changing DB schema, RLS, or auth behavior.
- Enabling server-side persisted chat history.
- Logging user message content or profile details.
- Turning on automatic high-quality model routing.
- Adding shelf/aisle navigation.
- Redesigning AI screens beyond focused premium polish.
- Allowing live internet search in buyer chat.

## Current Recommended Next Action

Start with Stage 1, then Stage 2. Do not jump straight to UI polish; the product needs the quality contract and real-catalog QA first.
