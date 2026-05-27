# Catalog Card Responsive Stage 3

Date: 2026-05-27
Domain: changelog
Status: implemented

## Summary

Stage 3 finished the catalog card responsive pass for narrow mobile, list/grid, light/dark, and compare-selected states.

## Changes

- Added a narrow-mobile CSS guard for list cards at `max-width: 360px`.
- On very narrow screens the list card uses a 76px thumbnail, smaller horizontal margin/gap, a 32px compare button, and slightly tighter badge padding.
- This increased the central content column at 320px from roughly 105px to 135px and reduced the tallest observed list-card height from 167px to 155px.
- Added a structure test to keep the narrow-mobile guard in place.
- Final owner-feedback pass changed first-time catalog view to grid by default and reordered the toggle to grid/list.
- List-card actions now use an absolute right column: price at the top-right, compare CTA at the bottom-right.
- List-card badge rows with up to 3 badges are forced into one compact row; 4+ badges may wrap.
- Attribute icons were upgraded from generic Material Symbols to local SVG marks for halal, sugar-free, gluten-free, lactose-free, vegan, and keto.
- Final short-title fix: list-card body now keeps thumbnail-height min-height and badge rows use `margin-top: auto`, so one-line and two-line product names share the same lower badge baseline.

## Verification

- `node --test tests/unit/catalogProductCardModel.test.mjs tests/unit/catalogProductCardStructure.test.mjs`: 8/8 passed.
- Responsive Playwright audit passed on 12 scenarios: widths 320/390/430, dark/light, list/grid. No browser JS errors or horizontal overflow. Screenshots are in `C:\Users\User\AppData\Local\Temp\opencode\catalog-stage3-*.png`.
- Compare-selected Playwright audit passed: one `active-pin`, ten `select-second`, compare banner visible, zero browser JS errors. Screenshot: `C:\Users\User\AppData\Local\Temp\opencode\catalog-stage3-compare-selected.png`.
- Badge-row/default-view Playwright audit passed: 3-badge rows stayed single-line on 320/390/430px, compare button stayed near the bottom edge, and fresh catalog load opened grid view with grid toggle first. Screenshots: `C:\Users\User\AppData\Local\Temp\opencode\catalog-badge-row-*.png`.
- `node --test tests/unit/catalogProductCardModel.test.mjs tests/unit/catalogProductCardStructure.test.mjs`: 9/9 passed after final owner-feedback pass.
- Short-title baseline Playwright audit passed: first one-line title card and two-line title cards had equal badge bottom gap (`gap_spread=0`), 3-badge rows still stayed single-line, and browser JS errors were 0. Screenshot: `C:\Users\User\AppData\Local\Temp\opencode\catalog-badge-baseline-390.png`.
- `node --test tests/unit/catalogProductCardModel.test.mjs tests/unit/catalogProductCardStructure.test.mjs`: 10/10 passed after baseline fix.
- Targeted ESLint on changed JS files: 0 errors, 3 pre-existing warnings in `CatalogScreen.jsx`/`ScanScreen.jsx`.
- `npm run build`: passed.

## Notes

- Running the repo's `npm run test:unit -- ...` script still executes the whole unit suite and currently exposes an unrelated HomeScreen model failure from parallel work (`home quick actions` includes `history`). Use direct `node --test` for the catalog-card targeted set unless the HomeScreen work is also in scope.
