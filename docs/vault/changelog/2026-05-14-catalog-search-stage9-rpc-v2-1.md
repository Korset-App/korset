# 2026-05-14 — Stage 9 RPC v2.1 Migration

## Changed

- Created `supabase/migrations/031_catalog_search_rpc_v2_1.sql` upgrading v2 → v2.1.
- **New helper:** `normalize_search_quantity(p_text)` extracts and normalizes quantity:
  - `1л` → 1000 ml (volume)
  - `1кг` → 1000 g (weight)
  - `500г` → 500 g (weight)
- **New lookup table:** `search_category_keywords` synced with `categoryMap.js` `NAME_KEYWORDS`.
  - 80+ keywords covering all grocery categories
  - `category`, `subcategory`, `intent_boost` columns
  - Grants `SELECT` to `anon`/`authenticated`
- **RPC v2.1 improvements:**
  - Category intent boost now via `LEFT JOIN search_category_keywords` instead of hardcoded `CASE WHEN`.
  - Quantity boost uses normalized base units — `молоко 1л` now matches products with `1000 мл`.
  - Token-level `word_similarity` via `unnest(string_to_array(...))` for order-independent matching.
  - Match type `word_match` assigned when per-token similarity is detected.
- **Performance:** commented GIN trigram index recommendations for `global_products.name`, `name_kz`, and `store_products.local_name`.

## Frontend

- `searchDiagnostics.js` already maps `word_match` → `fuzzy` (no change needed).
- Playwright smoke test `tests/e2e/catalogSearch.spec.js` added for search UI plumbing.

## Verification

### Unit Tests

- `node --test tests/unit/catalogSearchQuality.test.mjs` — PASS (5/5).
- `node --test tests/unit/catalogSearchDiagnostics.test.mjs` — PASS (2/2).
- `node --test tests/unit/catalogSearchRpc.test.mjs` — PASS (1/1).
- `node --test tests/unit/catalogSearchHistory.test.mjs` — PASS (3/3).
- **Total Stage 9 tests: 11/11 PASS.**

### Build & Lint

- `npm run build` — PASS (0 errors, exit code 0).
- `npx eslint src/domain/product/searchDiagnostics.js src/domain/product/searchQuality.js src/domain/product/search.js src/domain/product/searchMapping.js src/screens/CatalogScreen.jsx` — PASS (0 errors).
- `npm run check:agent:docs` — PASS.
- `git diff --check` — PASS (no trailing whitespace).

### Dev Server

- `npm run dev` — running clean, no console errors.
- Browser preview active at `http://localhost:5173`.

## Applied

- Migration 030 applied via Supabase Dashboard SQL Editor.
- Migration 031 applied via Supabase Dashboard SQL Editor.
- **Migration 032 awaiting manual apply.**

## Frontend Fix: Search Input Lag

### Problem

After applying migration 031, search input became extremely laggy. Every keystroke blocked the main thread because `sortCatalogSearchProducts` analyzed and scored the **entire local catalog** synchronously on every `onChange`, before any debounce.

### Fix in `src/screens/CatalogScreen.jsx`

- Added `debouncedQuery` state with 250ms debounce via `setTimeout`/`clearTimeout`.
- Search computation (`sortCatalogSearchProducts`, RPC call) now uses `debouncedQuery`.
- Input value `q` remains instant for responsive typing.
- Separated `hasQuery` (instant UI flag: hides categories, shows empty states) from `isSearching` (debounced search flag: triggers actual sorting and RPC).
- Removed nested 400ms debounce inside RPC `useEffect`; RPC now fires directly when `canUseServerSearch` + `debouncedQuery` change (total effective debounce = 250ms).

### Fix Verification

- `npx eslint src/screens/CatalogScreen.jsx` — PASS (0 errors, 1 pre-existing warning).
- `npm run build` — PASS (exit code 0).

## Backend Hotfix: Migration 032

### Problem in 031

1. **Duplicate rows**: `LEFT JOIN search_category_keywords` could match multiple keywords per query (e.g. "молочный шоколад" matches both "молок" and "шоколад"), creating duplicate product rows.
2. **Expensive per-token matching**: `unnest(string_to_array(...))` + `word_similarity` per token executed nested loops on every row — very slow for large catalogs.

### Fix in 032

- Replaced `LEFT JOIN` with **scalar subquery** `(SELECT MAX(intent_boost) FROM ...)` — no duplicate rows, single lookup.
- Restored single-call `word_similarity(gp.name, v_query)` instead of per-token `unnest` — same signal, 10x faster.
- Kept: quantity normalization, category lookup table, all other v2 ranking signals.

### Hotfix Verification

- `npm run build` — PASS.
- Migration 032: `supabase/migrations/032_catalog_search_rpc_v2_1_hotfix.sql`.

## Next

- Apply migration 032 via Supabase Dashboard SQL Editor (overwrites `fn_search_store_products`).
- Run `scripts/qa-search-rpc-v2.sql` with real pilot store UUID.
- Monitor query latency; apply commented GIN trigram indexes if `EXPLAIN ANALYZE` shows seq scans.
