# Catalog Search Stage 3 CatalogScreen RPC Integration

## Summary

Connected `CatalogScreen.jsx` server fallback search to the new Stage 2 RPC adapter. The UI was not redesigned, and offline IndexedDB/client search remains intact.

## Changed Files

- `src/screens/CatalogScreen.jsx`
- `docs/CONTEXT.md`

## Implementation

- Removed direct Supabase PostgREST `ILIKE` search from `CatalogScreen.jsx`.
- Removed local ad-hoc server result mapping from `CatalogScreen.jsx`.
- Added `searchStoreProductsRPC()` from `src/domain/product/search.js`.
- The existing debounce, `serverResults`, `isSearchingServer`, `clientEmpty`, and `displayList` flow is preserved.
- RPC results now use the shared `mapSearchRowToProduct()` contract from Stage 2.

## Behavior

Current behavior remains intentionally conservative:

- Client-side catalog search still runs first over loaded catalog/offline data.
- If online, current store exists, and client-side search returns empty, the screen calls `fn_search_store_products` through `searchStoreProductsRPC()`.
- If RPC fails or migration is not applied yet, the UI falls back to the existing empty-state behavior.
- Offline search remains fully client-side via IndexedDB/catalog cache.

## Verification

- `node --test tests/unit/catalogSearchRpc.test.mjs` passed.
- `npx eslint src/screens/CatalogScreen.jsx src/domain/product/search.js src/domain/product/searchMapping.js` passed with warnings only.
- `npm run build` passed.

## Notes

Targeted ESLint still reports existing warnings in `CatalogScreen.jsx` around the old effect/setState pattern and one unnecessary dependency. These were not widened into a refactor during this integration stage.

The next stage should decide whether to promote RPC from fallback-only to primary online search for every query, then layer ranking/deduping and search diagnostics deliberately.
