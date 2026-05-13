# Catalog Search Stage 8 State Stabilization

## Summary

Stabilized the Catalog search server state machine after Stages 1-7 without changing visible UX or search ranking behavior.

## Root Cause

The server search path stored related async state across three separate React states:

- `serverResults`
- `serverResultsQuery`
- `isSearchingServer`

When server search was unavailable, the component synchronously reset all three inside an effect. This produced the React hooks `set-state-in-effect` warning and made stale/reset behavior harder to reason about.

## Changed Files

- `src/screens/CatalogScreen.jsx`
- `docs/CONTEXT.md`

## Implementation

- Replaced the three separate server search states with one atomic `serverSearch` object: `{ results, query, status }`.
- Removed the synchronous reset branch from the server search effect.
- Kept non-server mode as a derived condition from `canUseServerSearch` instead of mutating state.
- Preserved cancellation of stale debounced RPC requests.
- Preserved merge/dedupe behavior between active RPC results and local fallback results.
- Updated catalog metadata display to use the derived `isSearchPending` state.

## Verification

- `npx eslint src/screens/CatalogScreen.jsx src/domain/product/searchDiagnostics.js src/domain/product/searchMapping.js src/domain/product/search.js src/domain/product/searchHistory.js` passed with no output.
- `node --test tests/unit/catalogSearchDiagnostics.test.mjs tests/unit/catalogSearchRpc.test.mjs tests/unit/catalogSearchHistory.test.mjs` passed.
- `npm run build` passed.

## Notes

This stage intentionally did not change product ranking, SQL/RPC behavior, category filtering, search history UX, diagnostics attributes, or visible catalog layout.
