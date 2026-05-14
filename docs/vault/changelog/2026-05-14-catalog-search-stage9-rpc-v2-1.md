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
- **Migration 031 awaiting manual apply.**

## Next

- Apply migration 031 via Supabase Dashboard SQL Editor.
- Run `scripts/qa-search-rpc-v2.sql` with real pilot store UUID.
- Monitor query latency; apply commented GIN trigram indexes if `EXPLAIN ANALYZE` shows seq scans.
