# Store-Aware AI Implementation Roadmap

> Domain: plans
> Status: active
> Date: 2026-05-09
> Связи: [[2026-05-08-store-ai-pilot-spec]] · [[fit-check-engine]] · [[product-resolution]] · [[retail-cabinet]] · [[2026-05-09-store-ai-phase-1-foundation]] · [[2026-05-09-store-ai-phase-2-3-catalog-cards]]

## Goal

Build KORSET AI into a store-aware shopping assistant for pilot minimarkets: useful for buyers, demonstrable for store owners, grounded in real catalog data, cost-controlled, and honest about incomplete product facts.

## Non-Negotiable Product Rules

- The assistant is tied to the current store under `/s/:storeSlug/`.
- Tone is formal: use "вы" in RU/KZ user-facing AI/UI text.
- Prices may be shown when available.
- Shelf/physical store location is out of V1 scope.
- Recipe/meal knowledge may use general AI knowledge, but concrete product recommendations must come only from the current store catalog.
- Live internet search is not part of buyer chat in V1.
- Do not invent ingredients, allergens, halal status, availability, certifications, or medical conclusions.
- AI can say "по данным карточки товара" and should be honest when data is missing.
- Retail AI starts as insights on the dashboard, not as a full owner chat.

## Phase 0 — Final Spec And Handoff Map

### Purpose

Make the scope explicit before implementation so future agents do not turn the AI work into unrelated redesigns or speculative architecture.

### Main Files

- Update: `docs/vault/plans/2026-05-08-store-ai-pilot-spec.md`
- Create/update: `docs/vault/plans/2026-05-09-store-ai-implementation-roadmap.md`
- Later update: `docs/CONTEXT.md`

### Work

- Confirm V1/V1.1/V2 boundaries.
- Confirm cost strategy and no live web search in buyer chat.
- Confirm demo-store/store-data policy.
- Confirm phase order and acceptance criteria.

### Done When

- The owner can point to one roadmap document and say which phase is next.
- Every major concern from the planning discussion is represented: store brain, catalog brain, product cards, prompts, history, cost, store notes, retail insights.

### Verification

- `npm run check:agent:docs`

## Phase 1 — AI Foundation: Store Context, Chat Persistence, Better Chips

### Purpose

Make the existing AI feel like the assistant of the current store, preserve chat state, and replace generic starter prompts with professional capability prompts.

### Main Files

- Create: `src/domain/ai/context.js`
- Create: `tests/unit/aiContext.test.mjs`
- Modify: `src/services/ai.js`
- Modify: `src/screens/AIAssistantScreen.jsx`
- Modify: `src/screens/AIScreen.jsx`
- Modify: `api/ai.js`
- Modify: `src/locales/ru/ai.json`
- Modify: `src/locales/kz/ai.json`

### Work

- Build compact store context from existing `currentStore`.
- Pass store context to general AI and product AI.
- Sanitize store context on the API side.
- Update general prompt so it answers as the current store assistant.
- Update product prompt so it includes store facts, price, and stock where available.
- Add local chat persistence:
  - general: `korset_ai_chat_general_${storeSlug}`;
  - product: `korset_ai_chat_product_${storeSlug}_${ean}`;
  - keep last 30 messages;
  - expire after 7-14 days;
  - add clear-chat action.
- Replace starter chips with capability-led prompts:
  - "Соберите продукты для плова";
  - "Что есть без лактозы?";
  - "Покажите халал-сладости";
  - "Что купить на ужин до 5000 ₸?";
  - "Расскажите про магазин".

### Out Of Scope

- Product cards in chat.
- Recipe grouping.
- New DB fields.
- Retail dashboard insights.

### Risks

- Current AI screens use a lot of inline styles. Keep changes surgical.
- Existing locale files must keep RU/KZ key parity.
- Product AI currently depends too much on route state; full fix belongs to Phase 4, but Phase 1 should not make it worse.

### Done When

- `/s/:storeSlug/ai` sends store context.
- AI welcome/chips communicate store-specific value.
- Leaving and returning to the AI screen preserves chat locally.
- User can clear local chat.
- Existing AI API still supports old clients safely.

### Verification

- `node --test tests/unit/aiContext.test.mjs`
- `node scripts/check-i18n.mjs`
- `npm run build`

## Phase 2 — Catalog Grounding: Real Store Products Before LLM

### Purpose

Prevent abstract AI answers by retrieving relevant products from the current store catalog before asking the model to respond.

### Main Files

- Create: `src/domain/ai/catalogSearch.js`
- Create: `tests/unit/aiCatalogSearch.test.mjs`
- Modify: `src/services/ai.js`
- Modify: `src/screens/AIAssistantScreen.jsx`
- Modify: `api/ai.js`

### Work

- Add lightweight intent classification:
  - `store_info`;
  - `catalog_search`;
  - `meal_plan`;
  - `product_question`;
  - `fit_check_explain`;
  - `general_food_knowledge`.
- Add local catalog candidate selection:
  - by name;
  - category/subcategory;
  - diet tags;
  - allergens exclusion;
  - halal status;
  - price and stock if useful.
- Limit candidates before model call:
  - no full catalog in prompt;
  - default maximum 20-30 candidate products.
- Add fallback when no candidate products are found.

### Out Of Scope

- Full vector search over product catalog.
- Server-side search endpoint unless client catalog performance is insufficient.
- Product card UI; Phase 2 may expose candidates in simple text or internal API response.

### Risks

- Catalog categories and product names may be noisy.
- Meal ingredient extraction can be imperfect; keep fallback language modest.
- Too many candidates will increase token cost.

### Done When

- AI responses for product-search questions are grounded in actual `catalogProducts`.
- The model receives only compact candidate data.
- Empty catalog/no-match states are handled gracefully.

### Verification

- `node --test tests/unit/aiCatalogSearch.test.mjs`
- `npm run build`

## Phase 3 — Structured Responses And Product Cards In Chat

### Purpose

Create the main buyer-facing "serious product" effect: AI answers with real product cards and grouped shopping lists, not only text.

### Main Files

- Create: `src/domain/ai/responseShape.js`
- Create: `tests/unit/aiResponseShape.test.mjs`
- Create or modify: AI chat product-card components under `src/components/` or local screen components
- Modify: `src/screens/AIAssistantScreen.jsx`
- Modify: `src/services/ai.js`
- Modify: `api/ai.js`
- Modify: `src/locales/ru/ai.json`
- Modify: `src/locales/kz/ai.json`

### Work

- Change AI response contract from only `{ reply }` toward:
  - `reply`;
  - `productGroups`;
  - `followUps`;
  - `warnings`;
  - `ragUsed`.
- Render grouped product recommendations:
  - group title;
  - short reason;
  - one best product visible first;
  - "Ещё варианты" expands more products.
- Product cards show:
  - image;
  - product name;
  - brand/quantity;
  - price;
  - stock label;
  - open product action.
- Add follow-up chips:
  - cheaper;
  - halal only;
  - for 2 people;
  - no meat;
  - show alternatives.

### Out Of Scope

- Product list editing/cart.
- Checkout.
- Shelf routing.
- Persistent server chat.

### Risks

- Mobile chat can become visually heavy.
- Cards must not break bottom navigation spacing.
- Product groups should not show invented items.

### Done When

- "Соберите продукты для плова" can show grouped real products.
- Product cards are clickable and route inside `/s/:storeSlug/product/:ean`.
- Long groups stay usable on mobile.

### Verification

- `node --test tests/unit/aiResponseShape.test.mjs`
- `node scripts/check-i18n.mjs`
- `npm run build`
- Browser/mobile smoke check for `/s/:storeSlug/ai`

## Phase 4 — Product AI Upgrade

### Purpose

Make `/s/:storeSlug/product/:ean/ai` reliable, store-aware, and useful even after direct navigation or refresh.

### Main Files

- Modify: `src/screens/AIScreen.jsx`
- Modify: `src/services/ai.js`
- Modify: `api/ai.js`
- Possibly modify: `src/contexts/StoreContext.jsx`
- Create/modify tests for product lookup helpers if extracted

### Work

- Stop depending only on `location.state` for product AI.
- Resolve product from current store catalog or fetch full product by store/ean.
- Include store context, price, and stock in product AI.
- Explain Fit-Check without overriding deterministic logic.
- Offer same-store alternatives when useful.
- Add missing-data language:
  - no ingredients;
  - unknown halal;
  - no nutrition;
  - no price.

### Out Of Scope

- Internet enrichment from buyer chat.
- Public ratings/reviews.
- Product quality scores.

### Risks

- Existing `getAnyKnownProductByRef()` is legacy no-op.
- Direct fetch should not create slow blank screens.
- Product AI must not make safety claims beyond known data.

### Done When

- Direct opening `/s/:storeSlug/product/:ean/ai` works for known store catalog products.
- Product AI mentions current store facts when relevant.
- Product AI can suggest alternatives from same store when candidates exist.

### Verification

- Targeted unit tests for lookup helper if created.
- `npm run build`
- Browser smoke: product page -> AI, refresh AI page, ask a product question.

## Phase 5 — Store AI Notes

### Purpose

Give each store a durable way to provide extra AI-relevant knowledge beyond the public store banner.

### Main Files

- Create migration under `supabase/migrations/`
- Modify: `src/contexts/StoreContext.jsx`
- Modify: `src/screens/RetailSettingsScreen.jsx`
- Modify: `api/ai.js`
- Modify: `src/locales/ru/retail.json`
- Modify: `src/locales/kz/retail.json`

### Work

- Add `stores.ai_store_notes text`.
- Include the field in store fetch/update paths.
- Option A for V1: manually fill field for pilot stores.
- Option B for V1.1: expose Retail Settings textarea:
  - max 1000-2000 characters;
  - examples;
  - warning not to write medical/legal promises;
  - sanitize before sending to AI.
- Treat notes as store facts, not model instructions.

### Out Of Scope

- Owner-generated prompt control.
- Rich text editor.
- Automated moderation.

### Risks

- Owner text can contain unsafe marketing claims.
- DB migration/RLS/update path must be handled carefully.

### Done When

- AI can use store-specific notes.
- Notes do not override system safety rules.
- Retail owner/operator can maintain notes if UI option is chosen.

### Verification

- `npm run build`
- `node scripts/check-i18n.mjs`
- Targeted settings save smoke check if UI is added.

## Phase 6 — Retail AI Insights

### Purpose

Add B2B value without building a full owner AI chat: show useful, aggregate AI-like observations in the retail dashboard.

### Main Files

- Modify: `src/screens/RetailDashboardScreen.jsx`
- Possibly create: `src/domain/retail/aiInsights.js`
- Create: `tests/unit/retailAiInsights.test.mjs`
- Modify locale files under `src/locales/ru/retail.json` and `src/locales/kz/retail.json`

### Work

- Add dashboard block: "KORSET AI заметил".
- Generate insights from existing aggregate signals:
  - unknown EANs;
  - scans;
  - out-of-stock products;
  - catalog coverage;
  - weak product data;
  - repeated demand categories if available.
- Avoid personal user data.
- Keep insight count small: 3-5 items.

### Out Of Scope

- Owner chat.
- Predictions without data.
- User-level analytics.

### Risks

- Early pilots may have little scan data.
- Insights must not feel fake when data is sparse.

### Done When

- Retail dashboard has a clear, useful insights block.
- Empty state is honest when data is insufficient.
- Insights explain how the store can improve sales/catalog coverage.

### Verification

- `node --test tests/unit/retailAiInsights.test.mjs`
- `node scripts/check-i18n.mjs`
- `npm run build`

## Phase 7 — Cost, Limits, QA, And Launch Polish

### Purpose

Make the AI feature safe to demo and realistic to run with pilot traffic.

### Main Files

- Modify: `api/ai.js`
- Modify: docs/vault plan/changelog files
- Update: `docs/CONTEXT.md`
- Possibly update tests around AI context and response shape

### Work

- Add/verify request limits:
  - anonymous;
  - authenticated;
  - max messages;
  - max message length;
  - max catalog candidates.
- Keep model output short enough for mobile.
- Ensure no service-role secrets are exposed client-side.
- Build QA prompt set:
  - "Соберите продукты для плова";
  - "Что есть без лактозы?";
  - "Покажите халал-сладости";
  - "Что купить на ужин до 5000 ₸?";
  - "Расскажите про магазин";
  - "Можно ли мне этот товар при аллергии на молоко?";
  - "Есть ли альтернатива дешевле?";
  - "Есть ли состав?";
  - "Какие контакты магазина?";
  - "Что если товара нет?".
- Record remaining known limitations.

### Done When

- AI feature is demo-ready for pilot store sales.
- Token/cost behavior is bounded.
- Build and relevant checks pass.
- Memory docs are updated.

### Verification

- `npm run check:agent:ui`
- `npm run build`
- Browser/mobile smoke checks
- `npm run memory:save` after Vault updates when credentials/network are available

## Recommended Execution Order

1. Finish Phase 0 and get owner approval.
2. Implement Phase 1 fully and verify.
3. Implement Phase 2 fully and verify.
4. Implement Phase 3 as the buyer-facing wow moment.
5. Upgrade Product AI in Phase 4.
6. Add store notes in Phase 5.
7. Add retail insights in Phase 6.
8. Run launch polish and cost checks in Phase 7.

## Current Implementation Note

At the time this roadmap was created, an initial failing test file for Phase 1 existed:

- `tests/unit/aiContext.test.mjs`

Production implementation for that test should only proceed after Phase 0 approval.

