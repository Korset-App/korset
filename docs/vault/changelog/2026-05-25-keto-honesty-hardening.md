# Keto honesty hardening

Date: 2026-05-25

## What changed

- Added `low_carb` as a structured diet tag in attribute extraction so low-carb naming patterns are no longer lost.
- Tightened keto Fit-Check so a label alone is not enough: tag-only products with no carb data now stay cautious.
- Keto Fit-Check now uses net carbs when fiber is reliable, treats 7-10 g/100 g as borderline caution, and blocks green results when carbs, sugar, or added-sugar signals contradict keto.
- Added keto search intent support in the catalog search ranking so keto and low-carb queries can surface better matches.
- Fixed the keto audit helper so blank/null nutrition is counted as missing instead of zero.

## Why this is better

- Keto now stays honest on weak data instead of giving fake green status.
- Keto explanations are now more precise: high carbs, high sugar, added sugar, borderline carbs, and insufficient data are separate reasons.
- Low-carb packaging language can now be preserved in structured product data.
- Keto and low-carb search queries now have a clearer scoring path in the catalog.

## Validation

- Updated unit coverage for label-only caution, high-carb/high-sugar contradiction, fiber/net-carbs, missing-data caution, and `low_carb` extraction.
- Ran full unit suite: `npm run test:unit` passed 421/421.
- Ran live keto audit over 11,862 active products; report saved to `C:\tmp\korset-keto-audit.json`.
