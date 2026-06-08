---
title: Compare Stage 3 UI Model
date: 2026-05-31
domain: changelog
area: product
status: completed
related: [[2026-05-31-compare-stage2-category-scoring]] · [[product-comparison-engine]]
---

# Compare Stage 3 UI Model

Stage 3 added a UI-facing model for Compare without changing `CompareScreen.jsx`.

## Changed

- Added `src/domain/product/comparisonViewModel.js`.
- The model converts the deterministic comparison result into stable UI fields:
  - `status`: `winner`, `draw`, or `blocked`;
  - `winnerSide` / `loserSide`;
  - `verdictKey`, `reasonKey`, `actionKey`;
  - `profileNote` for missing Fit-Check setup or profile-vs-overall divergence;
  - `dataNote` for low/medium data coverage;
  - `topFactors`;
  - `sections` for decision/profile/data blocks.
- Added RU/KZ compare locale keys for verdicts, profile notes, data notes, factors, sections, and same-category action.
- Added unit coverage in `tests/unit/productComparisonViewModel.test.mjs`.

## Product Decision

The next visual Compare screen should consume this model instead of reconstructing business logic in JSX. Missing profile setup should be a soft prompt, not a blocker. Category mismatch should block direct winner UI and route the shopper toward same-category alternatives.

## Verification

- `node --test tests\unit\productComparison.test.mjs tests\unit\productComparisonViewModel.test.mjs`: 15/15 passed.
- `node scripts/check-i18n.mjs`: passed with all KZ keys present.
- `npx eslint src\domain\product\comparison.js src\domain\product\comparisonViewModel.js`: passed.

## Next

Stage 4 should refactor `CompareScreen.jsx` to consume `buildProductComparisonViewModel()`, remove stale inline comparison helpers, and render the new verdict/profile/data/factor structure. Keep the first UI pass functional before heavy visual polish.
