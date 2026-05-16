---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Premium Stage 3 General Ranking

## Summary

Started Stage 3 of the AI Premium Upgrade plan with test-backed General AI ranking improvements.

The goal is to make `/s/:storeSlug/ai` candidate selection feel more like a competent shelf consultant before the model call, without spending OpenAI tokens.

## Changes

- Added `src/domain/ai/fitPriority.js`.
- Added `tests/unit/aiFitPriority.test.mjs`.
- Extended `tests/unit/aiCatalogSearch.test.mjs` with premium QA scenarios:
  - child snack requests avoid energy drinks and non-food noise;
  - meat-free protein requests exclude meat/fish and include eggs/legumes;
  - sugar-free tea snack requests do not treat missing sugar data as sugar-free;
  - breakfast bundle requests find breakfast/fruit candidates and respect budget;
  - Fit Priority ranking keeps safety, halal confidence, stock, and relevance ahead of price.
- Updated `src/domain/ai/catalogSearch.js`:
  - imports Fit Priority ranking;
  - adds breakfast, child snack, and meat-free protein intents;
  - filters non-food categories from General AI candidates;
  - filters child snack energy drinks;
  - filters meat/fish for meat-free protein requests;
  - requires explicit `sugar_free` tag for sweets in sugar-free requests;
  - strengthens direct text match weight so explicit product intent does not lose to weaker recipe candidates.
- Exported and tested `buildGeneralPrompt()` from `api/ai.js`.
- Updated the General AI prompt with a premium answer contract:
  - recommend only from the current store catalog payload;
  - do not repeat every product card in text;
  - explain why selected product groups fit the request;
  - offer a useful next step;
  - handle no-match cases without recommending outside-store products.
- Added `tests/unit/aiGeneralPrompt.test.mjs`.

## Verification

- `node --test tests/unit/aiFitPriority.test.mjs` passes: 4/4.
- `node --test tests/unit/aiCatalogSearch.test.mjs` passes: 13/13.
- `node --test tests/unit/aiGeneralPrompt.test.mjs` passes: 2/2.
- `node --test tests/unit/ai*.test.mjs` passes: 67/67.
- `npm test -- tests/e2e/aiGeneralMocked.spec.js --reporter=list` passes: 1/1, without real OpenAI calls.

## Remaining Stage 3 Work

- None for the local/test-backed Stage 3 pass. Real answer quality still needs the Stage 2 real-call gate when the owner approves API spend.
