---
type: changelog
status: done
date: 2026-05-18
area: ai
---

# AI Peak Stage 14: Compare And Ranking Cleanup

## Summary

Stage 14 replaced the old compare-screen "magic score" behavior with a deterministic product comparison contract.

The previous `CompareScreen.jsx` scoring produced visible percentages from a local weighted formula. That looked precise, but it could mislead the buyer because the number was not a real confidence score and could overemphasize price or generic product completeness.

## Changed

- Added `src/domain/product/comparison.js`.
- Added `tests/unit/productComparison.test.mjs`.
- Added `tests/unit/aiComparePrompt.test.mjs`.
- Updated `src/screens/CompareScreen.jsx`.
- Updated `api/ai.js`.
- Updated RU/KZ compare i18n.

## Product Contract

Comparison now follows deterministic precedence:

1. Direct allergy risk, including Fit-Check ingredient matches when `allergens[]` is sparse.
2. Halal priority when the profile asks for halal.
3. Current-store availability.
4. Product-card data completeness.
5. Price only after fit and availability are similar.

The buyer sees human labels instead of pseudo-numeric precision:

- `best_choice`
- `good_option`
- `fits_but_check`
- `choose_another`

The visible reason explains the primary deterministic factor, such as allergen safety, confirmed halal data, availability, stronger card data, or price.

## AI Contract

`/api/ai.js` now recomputes the comparison server-side with `buildProductComparison()` and passes a compact `FIT_PRIORITY_RESULT` block into the compare prompt.

The model is explicitly instructed to match the deterministic result and not invent percentages, numeric ratings, or a different winner. This keeps the "Ask AI" explanation aligned with the UI.

## Verification

- `node --test tests/unit/productComparison.test.mjs` passed: 7/7.
- `node --test tests/unit/aiComparePrompt.test.mjs` passed: 1/1.
- `node --test tests/unit/ai*.test.mjs tests/unit/productComparison.test.mjs` passed: 116/116.
- `npm run check:ai:qa` passed: 12/12.
- `node scripts/check-i18n.mjs` passed: all KZ keys present.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only: 0 errors, 57 warnings.

## Next

Stage 15 should focus on AI UI shelf-use smoke and polish: mobile/desktop browser checks for Product AI, General AI, compare, loading, errors, long replies, product cards, and spacing.
