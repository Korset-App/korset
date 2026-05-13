# Catalog Search Stage 7 Search Diagnostics

## Summary

Added an invisible search diagnostics foundation for catalog search results without changing consumer-facing UI.

## Changed Files

- `src/domain/product/searchDiagnostics.js`
- `src/domain/product/searchMapping.js`
- `src/screens/CatalogScreen.jsx`
- `tests/unit/catalogSearchDiagnostics.test.mjs`
- `tests/unit/catalogSearchRpc.test.mjs`
- `docs/CONTEXT.md`

## Implementation

- Added a pure `searchDiagnostics.js` helper to normalize RPC `match_type`, group match types, bucket `searchRank`, and generate safe `data-*` attributes.
- `mapSearchRowToProduct()` now attaches `searchMeta` to RPC products while preserving existing `searchRank` and `matchType` fields.
- Catalog grid and list cards now receive internal `data-search-*` attributes for future QA, analytics, and debugging.
- No visible UI copy, layout, i18n, or search behavior was changed.

## Diagnostics Contract

- `searchMeta.source`: product source such as `search_rpc` or local fallback.
- `searchMeta.matchType`: normalized RPC match type such as `fts_name` or `trigram_brand`.
- `searchMeta.matchGroup`: stable group: `exact`, `text`, `fuzzy`, `local`, or `other`.
- `searchMeta.rank`: numeric rank when available.
- `searchMeta.rankBucket`: `high`, `medium`, or `low` when rank is positive.

## Verification

- `node --test tests/unit/catalogSearchDiagnostics.test.mjs tests/unit/catalogSearchRpc.test.mjs tests/unit/catalogSearchHistory.test.mjs` passed.
- `npx eslint src/domain/product/searchDiagnostics.js src/domain/product/searchMapping.js src/domain/product/search.js src/domain/product/searchHistory.js src/screens/CatalogScreen.jsx` passed with one existing warning only.
- `npm run build` passed.

## Notes

The remaining targeted ESLint warning is the pre-existing `react-hooks/set-state-in-effect` warning in the server search reset path. Stage 7 intentionally did not refactor the search state machine or visible catalog UI.
