---
type: changelog
status: active
date: 2026-05-15
area: ai
---

# AI Contract Stabilization

## Summary

Stabilized the buyer AI contract before continuing feature expansion.

The previous implementation had drift between frontend callers and `/api/ai.js`:

- `askProductAI()` sent store context and alternatives from the screen, but the service/API contract did not preserve all facts.
- `askGeneralAI()` callers expected a structured response with `reply`, `productGroups`, `followUps`, and `warnings`, while the service returned only a string.
- General AI could answer without a strong current-store-only recommendation contract.
- The default chat model was `gpt-4.1-nano`, which was too weak for Körset's product assistant quality target.

## Changes

- `src/services/ai.js` now sends compact product facts, EAN, price, stock status, current store context, profile constraints, and same-store alternatives for Product AI.
- General AI now sends store context and store-scoped catalog candidates, and normalizes both structured and legacy string replies.
- `api/ai.js` now exposes explicit AI limits/rate limits, sanitizes store/catalog/product context, builds product card groups from the passed catalog, and warns honestly when no current-store catalog context is available.
- Server prompts now explicitly restrict recommendations to products visible in the current store/catalog payload.
- Default model changed from `gpt-4.1-nano` to configurable `OPENAI_CHAT_MODEL || 'gpt-5.4-nano'` after cost/quality review. `gpt-5.4-mini` remains the planned higher-quality override for future model routing or manual production testing.
- Chat completion limits now use `max_completion_tokens` instead of deprecated `max_tokens`.
- `validateMessages()` now strips UI-only fields such as `productGroups`, `followUps`, `warnings`, and local draft metadata before passing chat history to OpenAI. UI message state can stay rich, but model payloads remain API-safe `{ role, content }` messages.
- Stage 1 of the AI modernization plan is complete: General AI now returns deterministic, store-aware follow-up chips via `buildGeneralAIFollowUps()`. Chips are generated without extra model calls from the query, profile, catalog context, and language; RU/KZ outputs are covered by unit tests.
- Stage 2 is complete: General AI catalog candidate ranking now understands common grocery intents before the model call. `findCatalogCandidates()` supports recipe-style plov/dinner signals, budget caps such as "до 1000 тенге", halal/sugar-free/lactose-free intent boosts, and keeps lactose-free dairy candidates even when the user profile has a milk allergen. Product card groups now use shopper-readable titles instead of raw category IDs.
- Stage 3 is complete: Product AI prompt guardrails were strengthened and covered by tests. The server-side product prompt now explicitly forbids inventing price, stock, composition, certificates, halal status, allergens, or product properties; treats `halalStatus: unknown` as unknown; avoids calling products safe when data is incomplete or profile allergens match; requires package checks for strong allergies; and limits alternatives to the same-store alternatives block.
- Stage 4 is complete: AI browser QA now has a manual prompt pack plus a mocked Playwright smoke test for `/s/:storeSlug/ai`. The smoke intercepts `/api/ai`, verifies the assistant reply, product cards, follow-up chips, product-card routing, `mode: general`, and preserved `storeContext.slug` without spending OpenAI tokens.
- Stage 4 also fixed a real race found by the smoke path: General/Product AI requests could lose store context when the user submitted before full store details finished loading. `buildStoreAIContext()` now accepts a route-slug fallback, and both `AIAssistantScreen` and `AIScreen` pass it.
- Stage 5 is complete: model selection is now an explicit contract. Default remains `gpt-5.4-nano`; `gpt-5.4-mini` is registered only as a high-quality/manual future option, with no automatic premium routing enabled.
- Stage 5 also adds lightweight AI observability. `/api/ai.js` logs compact usage events with mode, model, route, status, duration, token counts, catalog candidate count, store slug, and RAG usage; it excludes user message content and profile details. OpenAI failures are classified as `auth`, `quota`, `rate_limited`, `model_not_found`, `bad_request`, `provider_error`, or `unknown`.
- Post-QA fix pass: General AI candidate selection now removes generic stop words such as "есть", keeps halal-sweets requests inside the sweets category, prevents plov oil/rice intents from matching chips or household items, and excludes snack/healthy/household noise from broad dinner suggestions. Catalog context now carries image, subcategory, group, and quantity into `/api/ai.js`.
- Post-QA UI fix pass: General AI product cards now use subcategory group titles instead of raw category ids, render images when available, show localized stock labels instead of `in_stock`, allow expanding and collapsing product groups, render simple markdown emphasis cleanly, and persist product cards/follow-ups in chat history so returning from a product page does not leave text-only answers.
- `scripts/agent-check.mjs` now runs `npm` correctly on Windows through `cmd.exe`, so `npm run check:agent` works reliably in this workspace.
- Added minimal compatibility helpers for existing regression tests: `normalizeOFFProduct()` and scanner `scanFlow` pure helpers.

## Verification

- `npm run check:agent` passes.
- `npm test -- tests/e2e/aiGeneralMocked.spec.js --reporter=list` passes.
- `node --test tests/unit/aiLaunchLimits.test.mjs` passes: 8/8.
- `node scripts/check-i18n.mjs` passes with 0 missing KZ keys.
- `npm run build` passes.
- AI-focused unit set passes: 34/34.
- Full unit suite passes: 243/243.
- Targeted lint for changed AI/API/script files passes.

## Notes

- `public/ava/` was intentionally not touched; the owner is still changing temporary avatar assets there.
- This is stabilization only. Next AI work should focus on live UX QA: real product chat, general store assistant prompts, product cards, and response quality under real catalog data.
