---
title: Keto Fit-Check Net-Carbs Upgrade
date: 2026-05-25
domain: changelog
status: completed
area: product
related: [[2026-05-24-fitcheck-diet-goals-audit-stage1]]
---

# Keto Fit-Check Net-Carbs Upgrade

This step makes the keto diet goal more honest and more useful by using fiber-aware net carbs where available and by extracting keto tags from product names.

## Implemented

- Added `keto` extraction to `src/domain/product/attributeExtractor.js` so keto-marked products can surface a structured diet tag.
- Tightened the keto branch in `src/utils/fitCheck.js` to use net carbs when fiber is present.
- Kept explicit keto tags as a positive signal, but they no longer override contradictory high-carb or high-sugar nutrition.
- Added cautious fallback behavior when keto data is too weak to confirm a fit.
- Added unit coverage for:
  - fiber lowering net carbs;
  - explicit keto tag confirmation;
  - explicit keto tag contradiction with high carbs;
  - missing-data caution.

## Verification

- `node --test tests/unit/fitCheck.test.mjs tests/unit/flavorExtraction.test.mjs` - 99/99 passed.
- `npx eslint src/utils/fitCheck.js src/domain/product/attributeExtractor.js tests/unit/fitCheck.test.mjs tests/unit/flavorExtraction.test.mjs` - passed.

## Notes

This keeps keto conservative but more realistic than the previous total-carb-only check. It is still a heuristic layer, not a medical nutrition engine.
