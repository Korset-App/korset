# Catalog Search Stage 5 Search UX Polish

## Summary

Improved catalog search UX around loading and no-results states without redesigning the screen or changing the search architecture from Stage 4.

## Changed Files

- `src/screens/CatalogScreen.jsx`
- `src/locales/ru/product.json`
- `src/locales/kz/product.json`
- `docs/CONTEXT.md`

## Implementation

- Added `isSearchPending` derived from RPC search state and `serverResultsQuery`.
- When an online RPC search is pending and the merged result list is empty, `CatalogScreen.jsx` now shows a loading search state instead of a false no-results state.
- Added `buildSearchSuggestions(query)` for lightweight no-results suggestions:
  - first word of a multi-word query;
  - compact barcode-like digits;
  - text before comma/semicolon/colon separators.
- Added suggestion buttons that replace the current query with the suggested shorter/cleaner query.
- Kept current cards, sorting, Fit-Check, compare mode, offline/client search, and primary RPC flow intact.

## i18n

Added RU and KZ keys:

- `catalog.emptySearchHint`
- `catalog.searchLoadingTitle`
- `catalog.searchLoadingSub`
- `catalog.searchSuggestion`

## Verification

- `node scripts/check-i18n.mjs` passed.
- `node --test tests/unit/catalogSearchRpc.test.mjs` passed.
- `npx eslint src/screens/CatalogScreen.jsx src/domain/product/search.js src/domain/product/searchMapping.js` passed with one existing warning only.
- `npm run build` passed.

## Notes

The remaining targeted ESLint warning is the existing `react-hooks/set-state-in-effect` warning in the search reset path. It was not refactored in this UX polish stage to avoid widening scope.
