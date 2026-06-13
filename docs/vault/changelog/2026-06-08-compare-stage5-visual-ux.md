---
title: Compare Stage 5 Visual UX
date: 2026-06-08
domain: changelog
area: product
status: completed
related: [[2026-05-31-compare-stage4-screen-refactor]] · [[product-comparison-engine]]
---

# Compare Stage 5 Visual UX

Stage 5 completed the first visual and UX pass for the Compare screen after the Stage 1-4 domain/view-model rebuild.

## Changed

- Reworked `src/screens/CompareScreen.jsx` around explicit view-model states: `winner`, `preliminary`, `draw`, and `blocked`.
- Added `src/screens/CompareScreen.css` so Compare styling is no longer dominated by inline JSX styles.
- Preserved the deterministic comparison engine and view-model contract; no ranking rules were moved back into JSX.
- Improved the verdict hierarchy:
  - winner/preliminary states use the decision rail and winner copy;
  - draw uses a neutral state treatment instead of fake winner pressure;
  - blocked uses a non-winner state and routes the primary action to same-category alternatives.
- Rendered factor output as readable decision cards instead of the old three-column row grid.
- Made profile/data notes more prominent and state-aware.
- Improved accessibility: back button `aria-label`, decorative icons `aria-hidden`, async AI block `aria-live`, visible focus states, image dimensions, and reduced-motion handling for the spinner.
- Fixed compare AI explanation behavior so stale text is cleared and the request reruns when the pair/profile/language/winner changes.
- Cleaned compare i18n copy: loading ellipsis uses `…`; unused stale non-grocery compare keys were removed from RU/KZ locale files.

## Product Decision

Compare should feel like a shelf decision assistant, not a scoreboard. The UI now separates deterministic decision, profile caveats, data-quality caveats, and AI explanation while keeping fake precision out of the shopper-facing screen.

## Verification

- `node --test tests\unit\compareScreenStructure.test.mjs tests\unit\productComparison.test.mjs tests\unit\productComparisonViewModel.test.mjs`: 18/18 passed.
- `npx eslint src\screens\CompareScreen.jsx src\domain\product\comparison.js src\domain\product\comparisonViewModel.js`: passed with no output.
- `node scripts\check-i18n.mjs`: passed with all KZ keys present.
- `npm test -- tests/e2e/aiShelfUiMocked.spec.js -g "compare screen uses human labels"`: 1/1 passed.
- `npm run check:agent:ui`: PASS, including build. Existing unrelated lint warnings remain in other files.

## Follow-Up Fix

After owner browser review, three Stage 5 UI defects were fixed:

- Replaced CompareScreen Material Symbols ligature spans with local inline SVG icons so blocked Google font loading cannot show raw icon names like `compare_arrows`, `cancel`, or `balance`.
- Removed duplicate draw-state explanation cards/factors so “товары почти одинаковы” is not repeated across the verdict, note, and factor list.
- Stopped rendering local `/api/ai` compare errors as buyer-facing text; if the local Vite server has no Vercel API, the AI explanation silently disappears instead of showing an error block.

Follow-up verification:

- `node --test tests\unit\compareScreenStructure.test.mjs tests\unit\productComparison.test.mjs tests\unit\productComparisonViewModel.test.mjs`: 19/19 passed.
- `npx eslint src\screens\CompareScreen.jsx src\domain\product\comparison.js src\domain\product\comparisonViewModel.js`: passed with no output.
- `node scripts\check-i18n.mjs`: passed with all KZ keys present.
- `npm test -- tests/e2e/aiShelfUiMocked.spec.js -g "compare screen uses human labels"`: 1/1 passed.
- `npm run build`: passed.

Additional polish after the full rows pass:

- Sweets comparison now derives human product type for common cases: Dirol/Orbit-style gum shows as `Жевательная резинка`, Halls/lozenge-style products show as `Леденцы` instead of raw subcategory codes or generic candy labels.
- Compare flavor extraction now handles `морозная мята`, `мята`, and phrases like `с оригинальным вкусом` for row display.
- `CompareScreen.jsx` now passes the active language into `buildProductComparisonViewModel()` so data row labels can be localized consistently.

Additional verification:

- `node --test tests\unit\compareScreenStructure.test.mjs tests\unit\productComparison.test.mjs tests\unit\productComparisonViewModel.test.mjs`: 24/24 passed.
- `npx eslint src\screens\CompareScreen.jsx src\domain\product\comparison.js src\domain\product\comparisonViewModel.js`: passed with no output.
- `node scripts\check-i18n.mjs`: passed with all KZ keys present.
- `npm test -- tests/e2e/aiShelfUiMocked.spec.js -g "compare screen uses human labels"`: 1/1 passed.
- `npm run build`: passed.

## Full Comparison Rows Follow-Up

Owner review showed the Stage 5 UI was still too verdict-heavy and did not expose concrete product characteristics. A follow-up pass restored the professional comparison contract:

- `comparisonViewModel.js` now returns `dataRows` with concrete per-product values for type/subcategory, weight or volume, flavor, price, unit price, halal status, availability, kcal, sugar, protein, fat, salt, and fiber when data is available.
- Unit price rows use direct quantity parsing for comparison so gum/candy and similar products can still show a price-per-100g row even if ProductScreen hides unit price for that subcategory.
- `CompareScreen.jsx` now renders data rows before the verdict, so the shopper sees the facts first and the final recommendation after.
- `CompareScreen.css` uses a flat/minimal table-like layout with semantic theme tokens and no glassmorphism.
- Compare e2e smoke now asserts that concrete rows such as price, availability, and halal are visible.

Full rows verification:

- `node --test tests\unit\compareScreenStructure.test.mjs tests\unit\productComparison.test.mjs tests\unit\productComparisonViewModel.test.mjs`: 24/24 passed.
- `npx eslint src\screens\CompareScreen.jsx src\domain\product\comparison.js src\domain\product\comparisonViewModel.js`: passed with no output.
- `node scripts\check-i18n.mjs`: passed with all KZ keys present.
- `npm test -- tests/e2e/aiShelfUiMocked.spec.js -g "compare screen uses human labels"`: 1/1 passed.
- `npm run build`: passed.

## Verdict Visual Clarity Follow-Up

Owner review showed the final verdict block was still too gray and not instantly scannable. The verdict UI was polished without changing the deterministic comparison logic:

- `CompareScreen.jsx` now imports and uses the shared `src/components/icons/CompareIcon.jsx` in the header and final verdict block instead of the local generic compare SVG for the main brand moment.
- The verdict card now has explicit state classes: `compare-verdict-card--winner-a`, `compare-verdict-card--winner-b`, `compare-verdict-card--draw`, and `compare-verdict-card--blocked`.
- The final decision has an immediate visual marker: `A`, `B`, `≈`, or `!`, plus state-specific color treatment.
- CSS now uses clearer success/sky/warning state treatments so the user can understand winner/draw/blocked at a glance.

Verdict visual verification:

- `node --test tests\unit\compareScreenStructure.test.mjs tests\unit\productComparison.test.mjs tests\unit\productComparisonViewModel.test.mjs`: 25/25 passed.
- `npx eslint src\screens\CompareScreen.jsx src\domain\product\comparison.js src\domain\product\comparisonViewModel.js`: passed with no output.
- `npm test -- tests/e2e/aiShelfUiMocked.spec.js -g "compare screen uses human labels"`: 1/1 passed.
- `node scripts\check-i18n.mjs`: passed with all KZ keys present.
- `npm run build`: passed.

## Next

- If owner wants another polish pass, do mobile browser QA in dark/light for real product pairs covering all four states: winner, preliminary, draw, blocked.
- Do not change `comparison.js` scoring unless a concrete product-pair bug is found.
