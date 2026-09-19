# ProductScreen Resolver Cleanup — Architectural Analysis

> **Date:** 2026-09-19  
> **Domain:** architecture / product-resolution  
> **Status:** Analysis complete, ready for migration plan  
> **Related:** `product-resolution.md`, `fit-check-engine.md`, `offline-resilience.md`, `data-moat-pipeline-strategy.md`

---

## 1. Executive Summary

The current product resolution pipeline is a **monolithic cascade** with significant technical debt:
- **4 fallback layers** (store_products → global_products → products.json demo → external cache → OFF)
- **Hardcoded demo data** (`products.json`, `stores.js`, `storeInventories.js`) blocks 100% SQL migration
- **Dual Supabase clients** (resolver creates its own instead of using shared `supabase.js`)
- **Stale stubs** in `storeCatalog.js` return null/empty, yet called by resolver
- **Complex merge logic** in `productScreenData.js` for sparse/full product hydration

**Goal:** Clean, single-source-of-truth resolver using only Supabase (RPC + PostgREST) with clear source tracking and no demo fallbacks.

---

## 2. Current Architecture Deep Dive

### 2.1 Resolution Cascade (Actual vs Documented)

**Documented in `product-resolution.md`:**
```
1. store_products (Supabase) → store-specific price/shelf
2. global_products (Supabase) → canonical facts
3. products.json (local) → DEMO [PHASE 8: DELETE]
4. external_product_cache (Supabase) → cached OFF/USDA
5. Open Food Facts API → live external
6. missing_products (Supabase) → log unknown EAN
```

**Actual in `resolver.js` (lines 315-432):**
```
1. IndexedDB offline cache (if offline OR catalog fresh)
2. storeCatalog.js local stub (always returns null)
3. RPC fn_resolve_product_by_ean (migration 026) — primary
4. Fallback: direct findStoreProduct + findGlobalProductByEan (if RPC unavailable)
5. Offline: log to pending scans + missing_products
6. Online: log scan_events + missing_products
7. Return null (no demo fallback in resolver itself!)
```

**Key finding:** The resolver **does not** fall back to `products.json` — that's handled upstream in `StoreContext` via `catalogProducts` (which comes from `fn_get_store_catalog` RPC). The demo data lives in `StoreContext` initial load, not in resolver.

### 2.2 Key Files & Responsibilities

| File | Responsibility | Issues |
|------|---------------|--------|
| `resolver.js` (590 lines) | Core resolution: cache → RPC → direct → offline → logging | Monolithic, dual Supabase client, in-memory caches, enrichment event bus |
| `storeCatalog.js` | Stub — returns null/empty | Dead code, TODO says "rewrite using StoreContext.catalogProducts" |
| `productLookup.js` | Thin wrapper → resolver + scan logging | Fine, simple |
| `ProductScreen.jsx` (831 lines) | Consumer UI: baseProduct (catalog) → fullProduct (fetchFullProduct) → merge | Dual data sources, complex merge logic, multiple useEffects |
| `productScreenData.js` | Merge logic: baseProduct + fullProduct with sparse-field preservation | Clever but opaque; `productScreenFull` flag |
| `normalizers.js` | `normalizeGlobalProduct`, `normalizeCacheProduct`, `coerceProductEntity` | Three normalization paths, `coerceProductEntity` is a type-guessing heuristic |
| `model.js` | `createEmptyProduct`, `buildCanonicalId`, `parseRouteProductRef`, helpers | Canonical ID format (`gp:`, `ean:`, `demo:`) |
| `eanAliases.js` | Trusted alias resolution, promotion logic | Well-structured, used by RPC |
| `StoreContext.jsx` (454 lines) | Store loading, catalog warm-up (fn_get_store_catalog), IndexedDB sync | Fallback to `stores.js` hardcoded data (line 174-175) |
| `StoresScreen.jsx` | Public store listing | Falls back to `getStores()` from `stores.js` (line 126) |

### 2.3 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCT SCREEN                                │
│  useParams({ean, storeSlug}) → useStore() → storeId, catalogProducts│
└────────────────────────────┬────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    ┌─────────────────────┐       ┌─────────────────────┐
    │ baseProduct         │       │ fullProduct         │
    │ (from catalogProducts│       │ (from fetchFullProduct│
    │  via findProductIn   │       │  → store_products    │
    │  Catalog)            │       │  join global_products)│
    └──────────┬──────────┘       └──────────┬──────────┘
               │                              │
               └──────────────┬───────────────┘
                              ▼
                    ┌─────────────────────┐
                    │ getProductScreen    │
                    │ Product()           │
                    │ (productScreenData) │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
            ┌───────────────┐     ┌───────────────┐
            │ EAN matches   │     │ EAN mismatch  │
            │ fullProduct?  │     │ → use base    │
            └───────┬───────┘     └───────────────┘
                    │ yes
                    ▼
         ┌────────────────────────┐
         │ preserveBaseFactsWhen  │
         │ FullIsSparse()         │
         │ (merge known facts     │
         │  from base into full)  │
         └────────────────────────┘
```

### 2.4 Hardcoded Demo Data Locations

| File | Data | Used By |
|------|------|---------|
| `src/data/products.json` | 20 demo products with EAN, ingredients, nutrition, halal | `products.json` import (not directly used in resolver!) |
| `src/data/stores.js` | 3 stores (mars, nurly, kalina) + `STORE_ONE_EANS` + `STORE_PRODUCT_MAP` | `StoreContext.fetchStoreBySlug` fallback (line 174), `StoresScreen` fallback (line 126) |
| `src/data/storeInventories.js` | 18 items × 3 stores (same EANs) | **Nowhere!** Dead code. |

**Critical:** The demo products in `products.json` are **not** seeded into Supabase. They exist only as a local JSON file. The resolver never touches them. The `stores.js` fallback is used when Supabase query fails.

---

## 3. Problems Identified

### 3.1 Architectural Problems

| # | Problem | Severity | Location |
|---|---------|----------|----------|
| 1 | **Demo data fallback in StoreContext** | High | `StoreContext.jsx:174-175` |
| 2 | **Dead storeInventories.js** | Medium | `storeInventories.js` (unused) |
| 3 | **Dual Supabase client** | High | `resolver.js:1` imports own `supabase` |
| 4 | **Stale storeCatalog.js stubs** | Medium | `storeCatalog.js` — all return null |
| 5 | **Monolithic resolver** | High | `resolver.js` 590 lines, 5+ concerns |
| 6 | **In-memory caches** | Medium | `_eanCache`, `_inflightMap`, `_catalogCachedAt` module-level |
| 7 | **Enrichment event bus** | Medium | `enrichmentEvents` EventTarget — side-channel |
| 8 | **Complex merge logic** | Medium | `productScreenData.js` sparse/full merge |
| 9 | **coerceProductEntity heuristic** | Medium | Type-guessing normalizer |
| 10 | **Demo canonicalId format** | Low | `demo:` prefix in `model.js` |

### 3.2 Data Integrity Risks

| Risk | Description |
|------|-------------|
| **Stale catalog** | `StoreContext` caches catalog in memory + IndexedDB; `_catalogWarmedStoreId` TTL 1 hour; offline may serve stale data |
| **Source confusion** | `source: 'cache'` used for both RPC catalog rows AND offline IndexedDB; `sourceMeta.externalSource` tracks origin but UI doesn't distinguish |
| **EAN alias trust** | `canEanAliasResolveBuyerProduct` requires `status === 'trusted' && confidence >= 80`; currently **Trusted=0** (per CONTEXT.md) |
| **Sparse fullProduct** | `fetchFullProduct` may return fewer fields than catalog RPC; `preserveBaseFactsWhenFullIsSparse` tries to fix but is heuristic |

---

## 4. Target Architecture

### 4.1 Clean Resolution Pipeline

```
resolveProductByEan(ean, storeId, options)
    │
    ├─► 1. Session cache (_eanCache, 5 min TTL)
    │
    ├─► 2. In-flight deduplication (_inflightMap)
    │
    ├─► 3. Offline: IndexedDB (getProductFromIndexedDB)
    │       └─► Return if offline OR catalog fresh (TTL 1hr)
    │
    ├─► 4. RPC: fn_resolve_product_by_ean(p_ean, p_store_id)
    │       ├─► Returns store-specific + global_product in one call
    │       ├─► Handles EAN aliases via trusted_aliases view
    │       └─► Normalize → normalizeGlobalProduct(row, storeOverlay)
    │
    ├─► 5. Fallback (if RPC unavailable): direct queries
    │       ├─► findStoreProduct(ean, storeId)
    │       └─► findGlobalProductByEan(ean)
    │
    ├─► 6. Not found → log missing_products (RPC increment_missing_scan_count)
    │
    └─► 7. Log scan_events (online) OR pending_scans (offline)
```

### 4.2 Source Tracking (Single Source of Truth)

| Source Value | Meaning |
|--------------|---------|
| `store` | Found in `store_products` for this store (has price, shelf, stock) |
| `global` | Found in `global_products` only (no store-specific overlay) |
| `cache` | From `external_product_cache` (OFF/USDA cached) |
| `offline` | From IndexedDB (previously cached) |
| `missing` | Not found anywhere — logged to `missing_products` |

**No `demo` source.** No `products.json`, `stores.js`, `storeInventories.js`.

### 4.3 ProductScreen Data Flow (Simplified)

```
ProductScreen
  │
  ├─► useStore() → catalogProducts (from fn_get_store_catalog RPC)
  │       └─► findProductInCatalog(catalogProducts, ean) → baseProduct
  │
  ├─► fetchFullProduct(storeId, ean) → fullProduct (PostgREST join)
  │       └─► Only if: online + storeId + ean + baseProduct.productScreenFull !== true
  │
  └─► getProductScreenProduct({baseProduct, fullProduct, ean})
          │
          ├─► EAN matches fullProduct? → merge sparse full with base facts
          └─► Else → baseProduct
```

**Key simplification:** `baseProduct` comes from **catalog RPC** (already normalized via `mapRpcRowToProduct`). `fullProduct` comes from **PostgREST join** (normalized via `mapRowToProduct`). Both produce same canonical shape. Merge logic only needed when fullProduct is sparser than catalog row.

---

## 5. Migration Scope

### 5.1 Files to Remove
- `src/data/products.json` — 20 demo products
- `src/data/stores.js` — hardcoded stores + EAN lists
- `src/data/storeInventories.js` — dead inventory data

### 5.2 Files to Refactor
| File | Changes |
|------|---------|
| `resolver.js` | Remove dual Supabase client; extract caches to separate module; remove enrichment event bus; simplify to single RPC-first path |
| `storeCatalog.js` | **Delete** — replaced by `StoreContext.catalogProducts` |
| `productLookup.js` | Keep (thin wrapper) |
| `ProductScreen.jsx` | Remove `needsResolve` path (resolver handles all); simplify merge logic |
| `productScreenData.js` | Simplify; `productScreenFull` flag may be removable |
| `normalizers.js` | Keep `normalizeGlobalProduct`, `normalizeCacheProduct`; remove `coerceProductEntity` heuristic |
| `model.js` | Remove `demo:` canonicalId; keep `gp:`, `ean:` |
| `StoreContext.jsx` | Remove `getStoreBySlug` fallback; ensure catalog RPC is only source |
| `StoresScreen.jsx` | Remove `getStores()` fallback |

### 5.3 Database Prerequisites (Already Done per CONTEXT.md)
- ✅ Migration 026: `fn_resolve_product_by_ean` RPC
- ✅ Migration 018: `increment_missing_scan_count` RPC
- ✅ Migration 047-049: trusted alias model, quarantine
- ✅ `fn_get_store_catalog` RPC for catalog warm-up

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **RPC not deployed** | Low | High | Verify migration 026 applied; fallback to direct queries kept temporarily |
| **Catalog RPC schema change** | Medium | High | `mapRpcRowToProduct` is single mapping point; test with actual data |
| **Offline regression** | Medium | Medium | IndexedDB cache + `notifyCatalogWarmed` preserved; test offline flow |
| **EAN alias resolution breaks** | Low | High | `canEanAliasResolveBuyerProduct` logic unchanged; RPC uses same view |
| **ProductScreen merge bugs** | Medium | Medium | Comprehensive test cases for: exact EAN match, alias match, sparse fullProduct, missing fullProduct |
| **StoreContext fallback removes** | Low | Medium | `fetchStoreBySlug` must always succeed for active stores; verify RLS |
| **StoresScreen empty state** | Low | Low | Supabase query should return 3 stores; fallback removed |

---

## 7. Success Criteria

1. **No hardcoded demo data** — `products.json`, `stores.js`, `storeInventories.js` deleted
2. **Single Supabase client** — `resolver.js` imports from `utils/supabase.js`
3. **RPC-first resolution** — `fn_resolve_product_by_ean` is primary path; direct queries only fallback
4. **Clean source tracking** — `source ∈ {store, global, cache, offline, missing}`
5. **No in-memory module-level caches** — move to dedicated cache module or React context
6. **ProductScreen simplified** — single resolution path via resolver; merge logic only for sparse fullProduct
7. **All tests pass** — unit, integration, Playwright smoke
8. **i18n check passes** — `node scripts/check-i18n.mjs`
9. **Build + lint + typecheck pass** — `npm run build && npm run lint && npm run test:unit`

---

## 8. Next Steps

Proceed to **Detailed Migration Plan** with phased approach, test strategy, and rollback procedures.