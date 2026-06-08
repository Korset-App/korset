# Product Composition Interactive Upgrade

Date: 2026-05-30
Domain: changelog
Status: implemented

## Summary

Product composition is now an interactive, store-scoped consumer feature instead of a static highlighted text block.

Implemented scope:

- Added deterministic composition analysis in `src/domain/product/ingredientAnalysis.js`.
- Replaced the old static `IngredientsBlock` usage on `ProductScreen` with `IngredientsPreview`.
- Added ingredient bottom sheet via `IngredientInfoSheet`.
- Added full composition screen at `/s/:storeSlug/product/:ean/composition`.
- Added route helper `buildProductCompositionPath()`.
- Added RU/KZ product i18n keys for composition UI, color legend, explanations, and AI prompts.
- Product AI can now receive an `initialPrompt` from composition flows; it pre-fills the composer only and does not auto-send.
- Added unit/structure tests and a Playwright smoke test for the composition flow.
- Follow-up polish expanded non-obvious shopper ingredients so common compositions do not look empty: invert syrup, glucose syrup, palm oil, maltodextrin, molasses/patoka, and citric acid now get deterministic explanations without being treated as profile conflicts.
- Additional packaging wording coverage now recognizes `растительные жиры/масла`, reversed wording like `масла растительные`, `пальмовый`, `ши` when used in vegetable-fat context, modified starch, humectants, glazing agents, flavor enhancers, dextrose, fructose, glucose-fructose syrup, maltodextrin, and patoka. Plain sugar/water/flour remain unhighlighted unless profile logic makes them relevant.
- Composition UI was toned down from heavy amber glass pills to a calmer minimal style: underlined inline terms and restrained cards with a small left accent line.

## UX Contract

The composition feature intentionally does not explain every ingredient. It highlights only shopper-relevant items:

- Profile conflicts: allergens or strict restrictions.
- Trace allergens relevant to the profile.
- Additives and E-codes.
- Halal-sensitive ingredients when halal profile is enabled.
- Informational shopper-interest components such as syrups, vegetable fats/oils, palm oil, shea fat, maltodextrin, dextrose/fructose, and patoka.

Color meaning:

- Red / `danger`: conflict with the shopper profile.
- Orange / `warning`: possible risk or packaging check needed.
- Amber / `additive`: technological additive or E-code.
- Purple / `info`: useful explanation, not a conflict.

Green is reserved for overall positive statuses, not individual composition words.

## Files

- `src/domain/product/ingredientAnalysis.js`
- `src/components/product/IngredientsPreview.jsx`
- `src/components/product/IngredientsPreview.css`
- `src/components/product/IngredientInfoSheet.jsx`
- `src/components/product/IngredientInfoSheet.css`
- `src/screens/ProductCompositionScreen.jsx`
- `src/screens/ProductCompositionScreen.css`
- `src/screens/ProductScreen.jsx`
- `src/screens/AIScreen.jsx`
- `src/App.jsx`
- `src/utils/routes.js`
- `src/locales/ru/product.json`
- `src/locales/kz/product.json`
- `tests/unit/ingredientAnalysis.test.mjs`
- `tests/unit/productCompositionStructure.test.mjs`
- `tests/e2e/productCompositionMocked.spec.js`

## Verification

- `node --test "tests/unit/ingredientAnalysis.test.mjs" "tests/unit/productCompositionStructure.test.mjs"` passed.
- `node scripts/check-i18n.mjs` passed: no missing KZ keys.
- `npx eslint "src/domain/product/ingredientAnalysis.js" "src/components/product/IngredientsPreview.jsx" "src/components/product/IngredientInfoSheet.jsx" "src/screens/ProductCompositionScreen.jsx" "src/screens/ProductScreen.jsx" "src/screens/AIScreen.jsx" "src/App.jsx" "src/utils/routes.js"` passed with no output.
- `npm run build` passed. Existing Vite/Sentry warnings remain unrelated.
- `npm run check:agent:ui` passed. Existing repo-wide lint warnings remain unrelated.
- `npx playwright test "tests/e2e/productCompositionMocked.spec.js"` passed.

## Follow-Ups

- The broader visual redesign/refactor of `ProductScreen.jsx` is intentionally not included.
- Future work can reuse `ingredientAnalysis.js` for product comparison, AI context, or data-quality tooling.
