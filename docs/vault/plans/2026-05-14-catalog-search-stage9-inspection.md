# Catalog Search Stage 9.0 Inspection

## Summary

Stage 9.0 inspected the current catalog search code before implementation. The confirmed direction remains broad professional grocery search quality, not a narrow milk-only fix.

## Confirmed Current Flow

### Frontend Screen

`src/screens/CatalogScreen.jsx` owns catalog search UI/state and currently:

- keeps query in `q` and session storage;
- treats any non-empty trimmed query as search mode;
- calls `searchStoreProductsRPC(storeId, normalizedQuery, { limit: 60 })` when online, store-scoped, and query length is at least 2;
- keeps atomic `serverSearch = { results, query, status }`;
- merges active server results before local `list` using `mergeProductsBySearchKey(activeServerResults, list)`;
- dedupes by `globalProductId || ean || storeProductId || canonicalId`;
- displays invisible diagnostics via `getProductSearchDiagnosticsAttrs(product)`.

### Current Local/Offline Search Gap

`CatalogScreen.jsx` still filters local/base products with a simple lowercase substring:

```js
haystack.includes(query)
```

The haystack includes name, Kazakh name, brand, the first 200 ingredient characters, and tags. It does not currently support token-order independence, aliases, quantity normalization, category/subcategory intent, or typo tolerance.

### Current Sorting Gap

`sortCatalogProducts(products, sort, profile, isSearching)` currently applies Fit-Check ordering before `searchRank` in default/fit sorting:

1. `safe` / `caution` / `warning` / `danger`;
2. if searching, `searchRank` descending.

This contradicts the confirmed Stage 9 product decision. In search mode, relevance must rank before Fit-Check. Fit-Check should only sort within sufficiently relevant tiers.

### Current RPC Adapter

`src/domain/product/search.js` is intentionally thin:

- trims query;
- skips if no store or query length < 2;
- calls `fn_search_store_products`;
- maps rows through `mapSearchRowToProduct`.

This adapter can remain stable if the RPC return contract remains compatible.

### Current Mapping Contract

`src/domain/product/searchMapping.js` maps RPC rows into catalog product shape and already exposes fields needed for Stage 9 local scoring:

- names: `name`, `nameKz`;
- brand;
- category/subcategory;
- quantity;
- ingredients/ingredientsKz;
- allergens, dietTags, tags, additivesTags, traces, categoriesTags;
- halalStatus;
- alternateEans;
- storeProductId/globalProductId;
- `searchRank` and `matchType`;
- `searchMeta` diagnostics.

### Current Diagnostics Contract

`src/domain/product/searchDiagnostics.js` maps match types into groups:

- exact: `ean_exact`, `alternate_ean`, `local_ean`;
- text: `fts_name`, `fts_brand`, `fts_local_name`;
- fuzzy: `trigram_name`, `trigram_brand`, `trigram_local_name`;
- local: `local_client`, `offline_client`;
- unknown types become `other`.

Stage 9 should expand this to richer v2 match types.

## Current SQL RPC

`supabase/migrations/028_catalog_search_rpc.sql` defines `public.fn_search_store_products` with compatible return columns:

- `id`, `ean`, `local_name`, `price_kzt`, `shelf_zone`, `shelf_position`, `stock_status`;
- `global_products` as JSONB;
- `search_rank` numeric;
- `match_type` text.

Current scoring uses `GREATEST(...)` across:

- exact EAN / alternate EAN;
- `name_tsvector` Russian/simple FTS;
- `brand_tsvector` simple FTS;
- full-field substring over `local_name`, `name`, `name_kz`;
- full-field trigram similarity over `local_name`, `name`, `name_kz`, `brand`.

Current SQL preserves store scope:

- `sp.store_id = p_store_id`;
- `sp.is_active = TRUE`;
- `gp.is_active = TRUE`.

Stage 9 must preserve this.

## Existing Database Search Assets

Migrations confirm existing assets:

- `pg_trgm` extension and trigram indexes from migration `028`;
- `name_tsvector`, `brand_tsvector`, and `ingredients_tsvector` maintained by `update_product_tsvector()` from migration `018`;
- `name_tsvector` uses Russian stemming for `name`/`name_kz` and simple fallback for `name`;
- `brand_tsvector` uses simple config;
- `ingredients_tsvector` uses Russian stemming;
- `fn_get_store_catalog` from migration `029` confirms active catalog fields available to frontend/offline.

## Existing Taxonomy Assets

`src/domain/product/categoryMap.js` exports:

- 18 normalized categories;
- subcategories for dairy, grocery, drinks, sweets, snacks, frozen, meat, fish, deli, etc.;
- `NAME_KEYWORDS` for product intent classification;
- `classifyByName(name, brand)`;
- labels and key helpers.

Important current keyword examples:

- dairy: `молок`, `кефир`, `ряженк`, `йогурт`, `айран`, `сыр`, `творог`, `сметан`, `сливочное масло`, `сгущенк`, `яйц`;
- sweets: `шоколад`, `молочный шоколад`, `печенье`, `конфет`, `халв`, `мёд`;
- grocery: `гречк`, `рис`, `макарон`, `мука`, `сахар`, `подсолнечное масло`, `соль`;
- drinks: `вода`, `сок`, `coca-cola`, `pepsi`, `чай`, `кофе`;
- snacks/frozen/meat/fish/health/household are also covered.

Risk: `NAME_KEYWORDS` is ordered and contains broad patterns such as `молок`, the space-sensitive `масло` rule, `овсян`, `гриб`, `шампун`, etc. Stage 9 query intent classification should use a curated search-intent table aligned with this taxonomy, not blindly reuse every import-classifier keyword as a query-ranking rule.

## Existing Tests

Current search tests cover:

- RPC row mapping contract in `tests/unit/catalogSearchRpc.test.mjs`;
- diagnostics normalization/buckets/attrs in `tests/unit/catalogSearchDiagnostics.test.mjs`;
- search history in its own unit test from earlier stages.

There is not yet a broad search quality fixture covering relevance order, token-order independence, aliases, quantities, typo tolerance, or attribute modes.

## Implementation Risks

- Do not let Fit-Check sorting continue to outrank search relevance in search mode.
- Do not make offline/local fallback depend on SQL-only behavior.
- Do not blindly classify all `NAME_KEYWORDS` as search intent because some patterns are import/data-cleanup oriented or broad.
- Do not make quantity required; it should boost matching products without hiding other relevant results.
- Do not make attribute claims speculative; use explicit fields only.
- Do not break the existing RPC return contract unless all frontend consumers/tests are updated.
- Do not edit migration `028`; add a new migration replacing the function.

## Recommended Next Implementation Order

1. Add pure JS search quality helpers and fixtures.
2. Implement query normalization, tokenization, quantity parsing, alias expansion, and intent/mode classification.
3. Implement local/offline product scoring with relevance tiers.
4. Update `CatalogScreen.jsx` to use local scorer and relevance-first search sorting.
5. Expand diagnostics mappings and tests.
6. Add new SQL migration for RPC ranking v2, mirroring the JS contract where feasible.
7. Update docs and run targeted verification after each meaningful stage.
