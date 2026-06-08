---
title: Compare Stage 4 Screen Refactor
date: 2026-05-31
domain: changelog
area: product
status: completed
related: [[2026-05-31-compare-stage3-ui-model]] · [[product-comparison-engine]]
---

# Compare Stage 4 Screen Refactor

Stage 4 connected the Compare screen to the shared comparison UI model.

## Changed

- Updated `src/screens/CompareScreen.jsx` to consume `buildProductComparisonViewModel()`.
- Replaced the old inline comparison rows with UI output driven by `topFactors`, `verdictKey`, `reasonKey`, `profileNote`, and `dataNote`.
- Removed stale `electronics` and `diy` comparison branches from the grocery-only V1 flow.
- Kept this stage as a functional refactor, not a final visual redesign.
- Added `tests/unit/compareScreenStructure.test.mjs` to guard the screen contract.

## Product Decision

Compare UI should not reconstruct ranking rules in JSX. The screen now renders the domain/view-model result, while `comparison.js` remains responsible for winner logic and `comparisonViewModel.js` remains responsible for shopper-facing state.

## Verification

- `node --test tests\unit\compareScreenStructure.test.mjs tests\unit\productComparison.test.mjs tests\unit\productComparisonViewModel.test.mjs`: 17/17 passed.
- `node scripts\check-i18n.mjs`: passed with all KZ keys present.
- `npx eslint src\screens\CompareScreen.jsx src\domain\product\comparison.js src\domain\product\comparisonViewModel.js`: passed.
- `npm test -- tests/e2e/aiShelfUiMocked.spec.js -g "compare screen uses human labels"`: passed.

## Next

Stage 5 should do the visual pass on CompareScreen: make the decision hierarchy clearer, improve factor rows and notes, handle blocked/preliminary/draw states more deliberately, and keep both light and dark themes polished.
