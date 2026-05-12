# Catalog Search Stage 6 Search History

## Summary

Added lightweight, store-scoped recent catalog search history and quick chips under the catalog search input.

## Changed Files

- `src/domain/product/searchHistory.js`
- `tests/unit/catalogSearchHistory.test.mjs`
- `src/screens/CatalogScreen.jsx`
- `src/index.css`
- `src/locales/ru/product.json`
- `src/locales/kz/product.json`
- `docs/CONTEXT.md`

## Implementation

- Added `searchHistory.js` with bounded `localStorage` persistence under `korset_catalog_search_history_v1`.
- Search history entries are scoped by store key, normalized by whitespace, deduped case-insensitively, and limited to six items per store.
- `CatalogScreen.jsx` now shows recent search chips when the search input is focused and empty.
- Recent chips use the existing catalog surface/chip style system and set the input query directly.
- Queries are remembered when the user presses Enter or opens a product from a search result, but not while RPC search is pending.
- Added RU/KZ `catalog.recentSearches` copy.

## Verification

- `node --test tests/unit/catalogSearchHistory.test.mjs tests/unit/catalogSearchRpc.test.mjs` passed.
- `node scripts/check-i18n.mjs` passed.
- `npx eslint src/screens/CatalogScreen.jsx src/domain/product/searchHistory.js src/domain/product/search.js src/domain/product/searchMapping.js` passed with one existing warning only.
- `npm run build` passed.

## Notes

The remaining targeted ESLint warning is the pre-existing `react-hooks/set-state-in-effect` warning in the server search reset path. This stage intentionally did not refactor the search state machine.
