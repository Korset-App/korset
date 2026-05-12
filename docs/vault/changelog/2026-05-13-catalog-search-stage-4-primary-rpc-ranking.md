# Catalog Search Stage 4 Primary RPC Ranking

## Summary

Promoted online catalog search from fallback-only RPC to primary RPC mode while preserving local/offline search as a fallback layer. Added client-side merge/dedupe and ranking that prioritizes Fit-Check verdict first, then RPC relevance rank.

## Changed Files

- `src/screens/CatalogScreen.jsx`
- `docs/CONTEXT.md`

## Implementation

- Added `canUseServerSearch` for online store-scoped queries with at least 2 characters.
- `CatalogScreen.jsx` now calls `searchStoreProductsRPC()` for every eligible online query, not only when client search is empty.
- Added `serverResultsQuery` guard to prevent stale RPC results from appearing during fast typing.
- Added `mergeProductsBySearchKey(primary, secondary)` to dedupe RPC results against local catalog results.
- Added shared `sortCatalogProducts()` helper for local and merged search results.

## Ranking

Default search ranking now follows:

1. Fit-Check verdict priority:
   - `safe`
   - `caution`
   - `warning`
   - `danger`
2. RPC `searchRank` within the same Fit-Check bucket.

Price sort chips still sort by selected price direction, matching existing UI semantics.

## Behavior

- Online query length >= 2: RPC results are primary, local results are merged as fallback.
- Offline or short query: existing client-side search remains active.
- Duplicate products are removed using `globalProductId`, then `ean`, then store/canonical identifiers.
- UI was not redesigned.

## Verification

- `node --test tests/unit/catalogSearchRpc.test.mjs` passed.
- `npx eslint src/screens/CatalogScreen.jsx src/domain/product/search.js src/domain/product/searchMapping.js` passed with one existing warning only.
- `npm run build` passed.

## Notes

The remaining targeted ESLint warning is `react-hooks/set-state-in-effect` in the search effect reset path. It is an existing pattern in this screen and was not expanded into a broader state-machine refactor in this stage.
