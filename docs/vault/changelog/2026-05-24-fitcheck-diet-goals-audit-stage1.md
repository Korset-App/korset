# 2026-05-24 - Fit-Check diet goals audit stage 1

## Summary

Audited and strengthened non-halal diet preference handling in the deterministic Fit-Check engine.

## Changes

- `low_fat` now uses normalized nutrition fat per 100g when `fat_percent` is missing.
- `keto` now has a basic deterministic contract:
  - `caution` for high carbs, high sugar, sugar ingredients, or `contains_sugar`.
  - `safe` for explicit `keto` tag or low-carb nutrition.
- `kid_friendly` now has a basic deterministic contract:
  - `caution` for energy drinks, caffeine/taurine/guarana markers, or high sugar.
  - `safe` for explicit `kid_friendly` tag or baby-food category.
- `vegan` and `vegetarian` now produce positive `safe` diet confirmations when structured diet tags support the choice and no violation was found.
- Added regression coverage for `low_fat`, `keto`, `kid_friendly`, `vegan`, and `vegetarian` behavior.

## Verification

- `node --test tests/unit/fitCheck.test.mjs` - 85/85 passed.
- `npm run test:unit` - 403/403 passed.
- `npx eslint src/utils/fitCheck.js tests/unit/fitCheck.test.mjs` - passed.
- `npm run build` - passed.

## Notes

Catalog-wide live audit on 11,862 active `global_products` rows showed:

- `halalStatus`: 598 `yes`, 84 `no`, 11,180 `unknown`.
- Diet-tag coverage is extremely sparse in the current catalog: `sugar_free` 1, `vegan` 9, and the rest of the tested goals 0.
- `halal` is therefore mostly a metadata-coverage problem today, not a logic problem: the code is stricter, but the catalog has very few explicit confirmations.
- `keto`, `kid_friendly`, `vegan`, `vegetarian`, `low_fat`, `sugar_free`, `gluten_free`, and `lactose_free` now have measurable deterministic behavior on the live catalog instead of being silent toggles.

This is still a conservative V1 contract, not a medical diet engine. The next step should be catalog-wide follow-up QA focused on data enrichment and on-store presentation: identify where `halalStatus`, diet tags, sugar, fat, and ingredients coverage are too sparse to support stronger user messaging.
