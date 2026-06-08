---
title: Compare Stage 1 Domain Contract
date: 2026-05-31
domain: changelog
area: product
status: completed
related: [[2026-05-24-product-card-normalization-stage9-compare-readiness]] · [[product-comparison-engine]]
---

# Compare Stage 1 Domain Contract

Stage 1 started the Compare rebuild without changing the visual screen.

## Changed

- `src/domain/product/comparison.js` now returns an explicit `isComparable` flag.
- Products with different known normalized categories are treated as not directly comparable:
  - `winner: "draw"`
  - `confidence: "blocked"`
  - `primaryReason: "category_mismatch"`
  - `summaryKey: "different_category"`
- The comparison result now includes `dataCoverage` with a `level` and missing key facts.
- Sparse same-category comparisons can still choose a preliminary winner, but low data coverage downgrades non-clear confidence to `preliminary`.
- RU/KZ compare locale keys were added for `preliminary`, `blocked`, and `different_category`.

## Product Decision

Compare should still help the shopper choose, but it must not pretend unrelated categories are direct alternatives. When data is weak, the domain layer may return a winner, but the UI must present it as preliminary.

## Verification

- `node --test tests\unit\productComparison.test.mjs`: 9/9 passed.
- `node scripts/check-i18n.mjs`: passed with all KZ keys present.

## Next

Stage 2 should add category-aware scoring for nutrition, composition, and unit price. Do not expose internal numeric scores to shoppers.
