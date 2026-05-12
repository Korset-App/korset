# Catalog Search Stage 1 Audit

## Summary

Stage 1 fixes the implementation direction before code changes: current CatalogScreen search is weak, but the database already has useful FTS primitives that Stage 2 should reuse rather than rebuild.

## Current Search/Data Flow

### Store/catalog loading

Authoritative source: `src/contexts/StoreContext.jsx`.

- `StoreProvider` resolves the active store from `/s/:storeSlug/...`.
- Initial catalog load fetches first 50 active `store_products` joined to active `global_products` using `LIGHT_FIELDS`.
- Background loader paginates all active store products in batches of 500.
- Loaded rows are mapped through `mapRowToProduct(row)` and enriched via `enrichQuantity()`.
- Full catalog is saved to IndexedDB with `saveCatalogToIndexedDB(products, storeId)`.

### CatalogScreen current behavior

Authoritative file: `src/screens/CatalogScreen.jsx`.

- `baseProducts` uses `catalogProducts` from `StoreContext` when available.
- If offline and no catalog is loaded, it reads `getCatalogFromIndexedDB()`.
- Category/subcategory filtering is client-side when not searching.
- Search is currently client-side `haystack.includes(query)` over:
  - `product.name`
  - `product.nameKz`
  - `product.brand`
  - first 200 chars of `product.ingredients`
  - `product.tags`
- If client search is empty and app is online, CatalogScreen runs a Supabase PostgREST query with server `ILIKE` over:
  - `global_products.name`
  - `global_products.brand`
  - `store_products.local_name`
- That server query does not use existing `tsvector` indexes.

### Offline behavior

Authoritative file: `src/utils/offlineDB.js`.

- IndexedDB DB name: `korset-offline-db`.
- Current DB version: `3`.
- Store: `store_catalog`, keyPath `ean`, indexes `store_id` and `category`.
- Offline catalog object keeps enough fields for CatalogScreen and Fit-Check basics.
- Stage 2 must not break this: offline search can remain client-side for now.

## Existing DB Search Foundation

### Already present

- `supabase/migrations/014_gin_tsvector_indexes.sql` adds:
  - `global_products.name_tsvector`
  - `global_products.brand_tsvector`
  - `global_products.ingredients_tsvector`
  - GIN indexes for all three.
- `supabase/migrations/018_db_foundation.sql` upgrades the tsvector trigger/data:
  - `name_tsvector`: `russian(name)` weight A + `russian(name_kz)` weight B + `simple(name)` weight C.
  - `brand_tsvector`: `simple(brand)`.
  - `ingredients_tsvector`: `russian(ingredients_raw)`.

### Missing for professional search

- No product search RPC exists yet.
- No `pg_trgm` search migration found for product name/local name fuzzy fallback.
- No trigram indexes found for:
  - `global_products.name`
  - `global_products.name_kz`
  - `global_products.brand`
  - `store_products.local_name`
- `CatalogScreen` still uses `ILIKE`, not `tsvector`.

## Product Object Contract For Search Results

Stage 2 RPC/frontend mapping should return or produce an object compatible with current CatalogScreen cards and navigation.

### Required fields for CatalogScreen list/grid

```js
{
  ean: string,
  name: string,
  nameKz: string | null,
  brand: string | null,
  category: string | null,
  subcategory: string | null,
  quantity: string | null,
  quantityParsed: object | null,
  group: string | null,
  image: string | null,
  images: string[],
  priceKzt: number | null,
  shelf: string | null,
  stockStatus: string | null,
  halalStatus: 'yes' | 'no' | 'unknown',
  packagingType: string | null,
  fatPercent: number | null,
  dietTags: string[],
  allergens: string[],
  nutriscore: string | null,
  storeProductId: string | null,
  globalProductId: string | null,
  source: 'cache' | 'server_search' | 'search_rpc'
}
```

### Useful future fields

```js
{
  ingredients: string | null,
  ingredientsKz: string | null,
  tags: string[],
  additivesTags: string[],
  traces: string[],
  categoriesTags: string[],
  nutritionPer100: object,
  sourceConfidence: number | null,
  qualityScore: number | null,
  searchRank: number | null,
  matchType: 'fts' | 'fuzzy' | 'ean' | 'brand' | null
}
```

### Mapping rules

- `name` should keep existing semantics: `store_products.local_name || global_products.name`.
- `nameKz` should come from `global_products.name_kz`.
- `image` should use `getImageUrl(gp.image_url)` on the frontend unless RPC returns a ready CDN URL.
- JSON fields from Supabase may arrive as arrays/objects or strings; reuse robust parsing patterns from `parseJson()` / existing CatalogScreen logic.
- Always call `enrichQuantity(product)` after mapping search RPC rows.

## Stage 2 RPC Requirements

Suggested name: `public.fn_search_store_products`.

Inputs:

```sql
p_store_id uuid,
p_query text,
p_limit integer default 30,
p_offset integer default 0
```

Later inputs for filters can be added after Stage 7.

Mandatory behavior:

- Search only the current store inventory.
- Require `sp.store_id = p_store_id`.
- Require `sp.is_active = true`.
- Require `gp.is_active = true`.
- Prefer exact EAN/local/name/brand matches.
- Use FTS first:
  - `gp.name_tsvector @@ query`
  - `gp.brand_tsvector @@ query`
- Use `pg_trgm` fallback for typos if FTS returns no or too few results.
- Return stable fields for frontend mapping.
- Return `search_rank` and `match_type` for debugging and later UI.
- Grant execute to `anon` and `authenticated`, consistent with store-context consumer access.
- Use `SECURITY DEFINER SET search_path = public, pg_temp` only if needed, and keep the function narrow.

## Test Queries

Core launch checks:

- `молоко` — direct RU name.
- `молока` — Russian stemming should find `молоко`.
- `сүт` — KZ name search.
- `кефир` — category/product term.
- `гречка` — later synonym target; initially may need exact data.
- `snickers` — brand/Latin brand search.
- one known product name with a one-letter typo — fuzzy target.
- `без сахара` — Stage 8 target; Stage 2 may not fully satisfy.
- `пальмовое масло` — Stage 8 ingredient target.
- random nonsense query — empty-state target.

## Risks For Stage 2

1. `018_db_foundation.sql` already changed tsvector to `russian`; do not duplicate this blindly.
2. `name_kz` under `russian` config may not be ideal for Kazakh morphology; keep fallback and test real KZ queries.
3. `CatalogScreen` currently only hits server search when local client search is empty. Stage 4 should decide whether server RPC replaces all online search or only fallback.
4. Fit-priority should stay client-side for now to avoid sending personal profile data into SQL.
5. Offline search should remain functional with existing client-side includes until a separate offline search index is justified.
6. RetailProductsScreen has its own weak `ILIKE` search via `getStoreCatalogProducts`; out of scope for the first consumer search stage unless explicitly included later.

## Stage 1 Outcome

Ready for Stage 2: implement the DB/RPC foundation without touching UI redesign, without external search services, and without rewriting old migrations.
