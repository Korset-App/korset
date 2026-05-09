# 2026-05-09 — Store-Aware AI Phase 4 Product AI Upgrade

> Связи: [[2026-05-08-store-ai-pilot-spec]] · [[2026-05-09-store-ai-implementation-roadmap]] · [[2026-05-09-store-ai-phase-1-foundation]] · [[2026-05-09-store-ai-phase-2-3-catalog-cards]]

## Summary

Implemented the first Phase 4 Product AI upgrade slice.

Product AI no longer depends only on legacy `getAnyKnownProductByRef()` or `location.state`:
- added `src/domain/ai/productContext.js`;
- `/s/:storeSlug/product/:ean/ai` now resolves the product by current store ID and EAN through `fetchFullProduct()`;
- if the full fetch is unavailable, it falls back to the current store catalog by primary/alternate EAN;
- route-state product fallback is accepted only when it matches the requested EAN;
- the screen shows a loading state while store/product resolution is in progress.

Product AI calls now send stronger store product facts:
- `ean`;
- `priceKzt`;
- `stockStatus`;
- compact same-store alternatives from `findProductAlternatives()`.

The server AI prompt now includes price, stock, EAN, and same-store alternatives, and explicitly tells the model not to invent price, availability, composition, certificates, or medical conclusions.

## Files

- `src/domain/ai/productContext.js`
- `src/screens/AIScreen.jsx`
- `src/services/ai.js`
- `api/ai.js`
- `tests/unit/aiProductContext.test.mjs`
- `tests/unit/aiService.test.mjs`

## Verification

- `node --test tests/unit/aiService.test.mjs tests/unit/aiProductContext.test.mjs` — PASS
- `node --test tests/unit/aiService.test.mjs tests/unit/aiProductContext.test.mjs tests/unit/aiContext.test.mjs tests/unit/alternatives.test.mjs` — PASS
- `node scripts/check-i18n.mjs` — PASS, with existing identical RU/KZ warnings only
- `npm run build` — PASS, with existing Vite/Sentry warnings only

## Boundaries

- This did not add Store AI Notes (`stores.ai_store_notes`); that remains Phase 5.
- This did not add Retail AI Insights; that remains Phase 6.
- No DB/RLS/migration changes were made.
- Browser smoke for a live store route was not run in this slice.
