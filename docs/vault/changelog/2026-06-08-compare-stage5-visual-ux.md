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

## Next

- If owner wants another polish pass, do mobile browser QA in dark/light for real product pairs covering all four states: winner, preliminary, draw, blocked.
- Do not change `comparison.js` scoring unless a concrete product-pair bug is found.
