# CatalogScreen Post-Pilot Refactor Plan

Date: 2026-05-27
Domain: plans
Status: Deferred until after pilot launch

## Decision

Do not do a full `CatalogScreen.jsx` decomposition before the pilot. The pilot needs visible UX polish and sales readiness more than a broad internal refactor.

## Current State

The catalog product card has already been extracted and is safe to continue polishing:

- `src/components/catalog/CatalogProductCard.jsx`
- `src/components/catalog/CatalogProductCard.css`
- `src/domain/catalog/catalogProductCardModel.js`
- `tests/unit/catalogProductCardModel.test.mjs`
- `tests/unit/catalogProductCardStructure.test.mjs`

`CatalogProductCard` now owns list/grid card layout, product thumbnail rendering, compact Fit-Check/product badges, kcal display, and icon-only compare CTA. `CatalogScreen.jsx` still owns data, navigation, search, filters, categories, compare state, offline fallback, and Virtuoso rendering.

## Why Refactor Later

`CatalogScreen.jsx` remains large and still contains inline styles and mixed responsibilities, but this is not pilot-blocking. The user-visible risk before launch is lower if we avoid broad changes to search/filter/category/offline logic.

The full refactor should improve maintainability, not change UX by itself. For pilot readiness, focus on visible catalog-card polish and smoke testing.

## Deferred Technical Debt

After the pilot, split `CatalogScreen.jsx` by UX responsibility:

1. `CatalogHeader` — title, back button, store pill, catalog meta.
2. `CatalogSearchBar` or `CatalogToolbar` — search input, clear button, scan shortcut, recent searches if still manageable.
3. `CatalogViewToggle` — list/grid switch.
4. `CatalogFilterBar` — subcategory filter trigger, sort trigger, active labels.
5. `CatalogFilterChips` — subcategory chips and sort chips.
6. `CatalogCategoryShowcase` — category grid and `CategoryShowcaseCard`.
7. `CatalogCompareBanner` — selected first product for compare mode and cancel action.
8. `CatalogEmptyState` — search error, search loading, empty search, loading skeleton, empty category.

Avoid replacing one large component with one large hook. If logic extraction is needed, prefer small domain functions or focused hooks after UI pieces are separated.

## Safe Order

1. Extract presentational components first, keeping state and handlers in `CatalogScreen.jsx`.
2. Move remaining inline styles into component CSS files.
3. Add structural tests similar to `catalogProductCardStructure.test.mjs`.
4. Only then consider focused hooks for search persistence, category state, or compare state.
5. Run `npm run check:agent:ui` and a browser smoke test for `/s/mars/catalog` list/grid after each major step.

## Do Not Touch During Pilot Polish

Unless the task explicitly requires it, avoid changing:

- server search flow (`searchStoreProductsRPC` and merge/ranking behavior),
- offline fallback via IndexedDB,
- `sessionStorage` keys for catalog query/category/subcategory/scroll/view/sort,
- Virtuoso/VirtuosoGrid setup,
- compare route/navigation behavior,
- category/subcategory data model.

## Pilot Polish Guidance

For the next chat focused on visual work, prefer surgical changes in:

- `src/components/catalog/CatalogProductCard.jsx`
- `src/components/catalog/CatalogProductCard.css`
- `src/domain/catalog/catalogProductCardModel.js` only if badge/kcal rules change
- `src/locales/ru/product.json` and `src/locales/kz/product.json` if new user-facing text is added

Recommended checks for visual work:

- `npm run test:unit -- tests/unit/catalogProductCardModel.test.mjs tests/unit/catalogProductCardStructure.test.mjs`
- `node scripts/check-i18n.mjs`
- `npm run build`
- browser smoke test on `/s/mars/catalog` for list/grid, product open, and compare CTA.
