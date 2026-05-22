---
type: architecture
status: active
date: 2026-05-18
area: product
---

# Product Comparison Engine

## Purpose

Korset comparison is a shopper-facing decision aid, not a numeric product rating. It should help a buyer at the shelf choose between two products without pretending that the app knows a precise percentage score.

## Source Of Truth

`src/domain/product/comparison.js` owns deterministic comparison.

Use `buildProductComparison(productA, productB, { profile })` for compare flows.

Do not reintroduce local percentage/rating formulas in UI components. If the contract changes, update this shared domain module and its tests.

## Precedence

The current precedence is:

1. Direct allergy risk, including Fit-Check ingredient matches when `allergens[]` is sparse.
2. Halal priority when the profile asks for halal.
3. Current-store availability.
4. Product-card data completeness.
5. Price only after fit and availability are similar.

This order prevents a cheaper or more complete product from winning over a direct allergy risk, non-halal product for a halal profile, or out-of-stock item. The engine intentionally calls the existing Fit-Check layer for allergen risk so sparse product cards can still catch ingredient-level allergy matches.

## UI Contract

`CompareScreen.jsx` should show human labels and a primary reason, not pseudo-precise percentages.

Current labels:

- `best_choice`
- `good_option`
- `fits_but_check`
- `choose_another`

The progress-style visual may show direction and strength, but it must not show exact percentages unless a real calibrated score exists.

## AI Contract

`/api/ai.js` recomputes the comparison server-side and passes `FIT_PRIORITY_RESULT` into `buildComparePrompt()`.

The model must explain the deterministic result and must not invent a different winner, percentages, or numeric ratings.
