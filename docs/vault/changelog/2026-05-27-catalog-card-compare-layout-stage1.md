# Catalog Card Compare Layout Stage 1

Date: 2026-05-27
Domain: changelog
Status: implemented

## Summary

Stage 1 of catalog product-card polish tightened the list-card structure and compare icon contract without changing catalog search/filter/offline logic.

## Changes

- Added shared `src/components/icons/CompareIcon.jsx` and reused it in `ScanScreen`, `CatalogProductCard`, and the catalog compare banner.
- Removed the barcode icon from catalog compare CTAs; default/second-select states now use the same compare icon as the scanner.
- Moved list-card price and compare CTA into a right-side action column, removing the empty bottom footer row that made cards feel too tall.
- Catalog card badges now return all positive attributes by default instead of truncating at 3.
- Added catalog `Кето` badge support for `keto` and `low_carb` diet tags with RU/KZ localization.
- Added unit/structure coverage for full badge output, `low_carb` mapping, and shared compare-icon usage.

## Verification

- Red/green targeted unit run: `npm run test:unit -- tests/unit/catalogProductCardModel.test.mjs tests/unit/catalogProductCardStructure.test.mjs` (script runs the full unit set in this repo): 434/434 passed after implementation.
- Targeted ESLint on changed source files: 0 errors, 3 existing warnings in `CatalogScreen.jsx`/`ScanScreen.jsx`.
- `node scripts/check-i18n.mjs`: still fails on pre-existing `home.fitSetupTemporary` missing KZ key; new `catalog.badge.keto` key is present in RU/KZ.
- `npm run build`: passed.

## Next Stages

- Stage 2: visual badge system polish — colors, less pill-shaped forms, and higher-quality Fit-Check icons.
- Stage 3: responsive browser pass across narrow/normal mobile, grid/list, dark/light, and compare states.
