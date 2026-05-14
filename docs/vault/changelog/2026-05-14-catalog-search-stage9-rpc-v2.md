# 2026-05-14 — Stage 9 RPC v2 Migration

## Changed

- Created `supabase/migrations/030_catalog_search_rpc_v2.sql` with `CREATE OR REPLACE FUNCTION fn_search_store_products`.
  - **Store scoping preserved:** `sp.store_id = p_store_id AND sp.is_active AND gp.is_active`.
  - **Security preserved:** invoker rights, no profile data in SQL, no RLS weakening.
  - **Return contract preserved:** identical column list, types, and ordering.
- New ranking signals in v2:
  - `word_similarity` token-level boost on `gp.name`.
  - Category/subcategory intent boost (dairy, sweets, beverages, grocery, meat, fish, frozen, deli, healthy).
  - Brand + product combo boost when first query token matches brand and name matches FTS.
  - Quantity regex boost via `gp.quantity` normalized comparison.
  - Alias ILIKE boosts for RU/KZ/Latin keywords.
  - Halal attribute boost for queries containing `халал`/`halal`.
  - Ingredients FTS via existing `ingredients_tsvector`.
- Updated `src/domain/product/searchDiagnostics.js` to map new v2 `match_type` values:
  - `fts_name_simple` → `text`
  - `fts_ingredients` → `text`
  - `word_match` → `fuzzy`
- Updated `tests/unit/catalogSearchDiagnostics.test.mjs` to cover the new match types.

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

### SQL QA Script

- Created `scripts/qa-search-rpc-v2.sql` with 10 test query categories for Supabase Dashboard validation.

## Applied

- ✅ Migration 030 applied via Supabase Dashboard SQL Editor.

## Next

- Verify `fn_search_store_products` executes without error in Supabase Dashboard (quick `SELECT` or direct RPC call).
- Run real-pilot queries (молоко, сникерс, без сахара, халал, 1л) to confirm ranking.
- Add targeted integration/Playwright smoke checks for search result ordering.
