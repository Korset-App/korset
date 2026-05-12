# Catalog Search Stage 2 RPC Foundation

## Summary

Implemented the database and frontend foundation for professional store-scoped catalog search. This stage does not replace `CatalogScreen.jsx` behavior yet; it prepares a safe RPC path for Stage 3/4 integration.

## Changed Files

- `supabase/migrations/028_catalog_search_rpc.sql`
- `src/domain/product/search.js`
- `src/domain/product/searchMapping.js`
- `tests/unit/catalogSearchRpc.test.mjs`
- `docs/CONTEXT.md`

## Database Foundation

Added migration `028_catalog_search_rpc.sql`:

- Enables `pg_trgm` in the `extensions` schema.
- Adds trigram GIN indexes for fuzzy search:
  - `global_products.name`
  - `global_products.name_kz`
  - `global_products.brand`
  - `store_products.local_name`
- Adds `idx_store_products_store_active_global_product` for store-scoped catalog joins.
- Adds `public.fn_search_store_products(p_store_id, p_query, p_limit, p_offset)`.

RPC behavior:

- Searches only active products in the selected store.
- Requires `sp.store_id = p_store_id`.
- Requires `sp.is_active = true` and `gp.is_active = true`.
- Supports exact EAN/alternate EAN matching.
- Uses existing `tsvector` fields for Russian/simple FTS.
- Uses substring and trigram similarity fallback for typos.
- Returns `search_rank` and `match_type` for ranking/debugging.
- Uses invoker rights, not `SECURITY DEFINER`, because this is read-only search over consumer-visible catalog data.

## Frontend Foundation

Added `src/domain/product/searchMapping.js`:

- Pure mapper from RPC row to current catalog product contract.
- Keeps compatibility with existing `CatalogScreen` cards and Fit-Check inputs.
- Maps `global_products` JSONB plus store overlay fields.
- Preserves `searchRank` and `matchType` for later ranking/UI.

Added `src/domain/product/search.js`:

- `searchStoreProductsRPC(storeId, query, { limit, offset })`
- Re-exports `mapSearchRowToProduct`.

## Verification

- `node --test tests/unit/catalogSearchRpc.test.mjs` passed.
- `node --check src/domain/product/search.js; node --check src/domain/product/searchMapping.js` passed.

## Notes

Supabase CLI is not installed in this environment, so the migration could not be generated via `supabase migration new`. The file was created manually using the next project migration number, `028`, matching existing repository naming.

Stage 3/4 should connect `CatalogScreen.jsx` to `searchStoreProductsRPC` behind the online search path, while keeping offline IndexedDB search intact.
