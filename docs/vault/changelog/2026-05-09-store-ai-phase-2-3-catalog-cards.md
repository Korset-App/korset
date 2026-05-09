# 2026-05-09 — Store-Aware AI Phase 2/3 Catalog Grounding And Cards

> Связи: [[2026-05-08-store-ai-pilot-spec]] · [[2026-05-09-store-ai-implementation-roadmap]] · [[category-system]]

## Summary

Implemented catalog grounding and first structured product-card responses for the general store AI chat.

## Changes

- Added `src/domain/ai/catalogSearch.js` with compact local candidate selection from `StoreContext.catalogProducts`.
- Added `src/domain/ai/responseShape.js` for grouped AI product response shaping.
- `AIAssistantScreen` now sends compact catalog candidates with general AI requests.
- `/api/ai` sanitizes `catalogContext` and tells the model to recommend concrete products only from that list.
- General AI structured responses now include `productGroups`, `followUps`, and `warnings`.
- General AI chat renders compact grouped product cards with a "show more" expansion.

## Verification

- `node --test tests/unit/aiResponseShape.test.mjs tests/unit/aiCatalogSearch.test.mjs tests/unit/aiContext.test.mjs` — PASS
- `node scripts/check-i18n.mjs` — PASS
- `npm run build` — PASS

## Boundaries

- Product cards are currently generated from retrieved candidates, grouped by category. Deeper ingredient-level grouping for recipes is a future refinement.
- Product AI direct-route robustness remains Phase 4.
- Store AI notes remain Phase 5.
- `npm run memory:save` was intentionally not run after this small changelog to conserve resources.

