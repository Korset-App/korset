# ProductScreen Resolver Cleanup — Migration Plan

> **Date:** 2026-09-19  
> **Domain:** architecture / product-resolution  
> **Prerequisites:** Migration 026 (`fn_resolve_product_by_ean`), Migration 018 (`increment_missing_scan_count`), trusted alias model (migrations 047-049) deployed  
> **Related:** `product-resolver-cleanup-analysis.md`, `product-resolution.md`, `fit-check-engine.md`

---

## Overview

**Phased approach** — each phase independently verifiable, with rollback capability. Total estimated effort: **5-7 focused sessions**.

---

## Phase 0: Preparation & Verification (Session 1)

### 0.1 Verify Database Prerequisites
```bash
# Check RPC exists
psql -c "\df fn_resolve_product_by_ean"
psql -c "\df fn_get_store_catalog"
psql -c "\df increment_missing_scan_count"

# Check trusted_aliases view
psql -c "SELECT * FROM trusted_aliases LIMIT 5;"

# Verify 3 stores exist with products
psql -c "SELECT code, name, is_active, is_published FROM stores WHERE is_active = true;"
psql -c "SELECT store_id, COUNT(*) FROM store_products WHERE is_active = true GROUP BY store_id;"
```

**Success criteria:** All RPCs exist, 3 stores active, each has products in `store_products`.

### 0.2 Baseline Tests
```bash
npm run test:unit
npm run build
npm run lint
node scripts/check-i18n.mjs
```

### 0.3 Create Feature Branch
```bash
git checkout -b feat/resolver-cleanup
```

---

## Phase 1: Remove Dead Code (Session 1-2)

### 1.1 Delete Unused Files
```bash
rm src/data/products.json
rm src/data/storeInventories.js
```

### 1.2 Remove `storeCatalog.js` (Dead Stubs)
- **File:** `src/utils/storeCatalog.js` — **DELETE ENTIRE FILE**
- **Update imports:** Search for `getStoreCatalogProductByEan`, `getStoreCatalogProducts`, `getGlobalProductByEan`, `getAnyKnownProductByRef`
- **Found in:** `resolver.js` line 3 (`getStoreCatalogProductByEan`), `alternatives.js` line 152 (`findProductInCatalog` uses catalogProducts directly, not storeCatalog)

**Action:** Remove import from `resolver.js` line 3. The call at line 347-358 becomes dead code → remove that block entirely.

### 1.3 Verify No Other References
```bash
grep -r "storeCatalog" src/ --include="*.js" --include="*.jsx"
grep -r "products.json" src/ --include="*.js" --include="*.jsx"
grep -r "storeInventories" src/ --include="*.js" --include="*.jsx"
```

**Expected:** Zero results after cleanup.

---

## Phase 2: Refactor Resolver Core (Session 2-3)

### 2.1 Create Shared Cache Module
**New file:** `src/utils/resolverCache.js`
```javascript
// Session EAN cache (5 min TTL)
const _eanCache = new Map()
const EAN_CACHE_TTL_MS = 5 * 60 * 1000

// In-flight deduplication
const _inflightMap = new Map()

// Catalog freshness
let _catalogCachedAt = 0
let _catalogWarmedStoreId = null
const CATALOG_ONLINE_TTL_MS = 60 * 60 * 1000

export function notifyCatalogWarmed(storeId) { ... }
export function getCachedProduct(ean, storeId) { ... }
export function setCachedProduct(ean, storeId, product) { ... }
export function getInflightPromise(cacheKey) { ... }
export function setInflightPromise(cacheKey, promise) { ... }
export function deleteInflightPromise(cacheKey) { ... }
export function isCatalogFresh(storeId) { ... }
```

### 2.2 Refactor `resolver.js`
**Changes:**
1. **Import Supabase from shared module:** `import { supabase } from '../utils/supabase.js'` (line 1)
2. **Import cache functions** from `resolverCache.js`
3. **Remove module-level cache variables** (lines 26-35, 182)
4. **Extract enrichment logic** to separate module (Phase 3)
5. **Simplify `_resolveProductByEanImpl`:**
   - Use cache module
   - RPC-first path only (keep direct query fallback for migration 026 safety)
   - Remove `storeCatalog.js` call block (lines 346-358)
   - Remove enrichment event bus (`enrichmentEvents` lines 182, 184-196, 145-152 in ProductScreen)
6. **Keep:** `resolveProductByEan`, `resolveProductByRef`, `hydrateProductsFromScanRows`, `hydrateProductsFromFavoriteRows`, `logScan`, `logMissingProduct`, `persistLocalHistory`, `finalizeResolvedProduct`

### 2.3 Create Enrichment Module (Optional — Can Defer)
**New file:** `src/domain/product/enrichment.js`
```javascript
import { enrichProductAI } from '../../services/ai.js'
import { coerceProductEntity } from './normalizers.js'

export async function maybeEnrichInBackground(product, cacheKey, setCache) { ... }
```

**Decision point:** Enrichment is non-critical for V1. Can keep inline in resolver for now, extract later.

### 2.4 Update `ProductScreen.jsx`
- Remove `enrichmentEvents` import (line 22)
- Remove `useEffect` listener (lines 145-152)
- `resolveProductByEan` now handles caching internally

---

## Phase 3: Remove Hardcoded Store Fallbacks (Session 3)

### 3.1 Update `StoreContext.jsx`
**Line 6:** Remove `import { getStoreBySlug } from '../data/stores.js'`
**Lines 174-175:** Remove fallback:
```javascript
// REMOVE:
const local = getStoreBySlug(slug)
return local ? normalizeStore({ ...local, code: local.slug, is_active: local.isActive }) : null
```
**Replace with:**
```javascript
if (!error && data) return normalizeStore(data)
return null  // No fallback — store must exist in DB
```

### 3.2 Update `StoresScreen.jsx`
**Line 5:** Remove `import { getStores } from '../data/stores.js'`
**Line 126:** Remove fallback:
```javascript
// REMOVE:
.catch(() => {
  if (cancelled) return
  setStores(getStores().map(normalizeStoreListing))
  setLoading(false)
})
```
**Replace with:** Let error propagate or show error state (Supabase should always return stores).

### 3.3 Delete `stores.js`
```bash
rm src/data/stores.js
```

---

## Phase 4: Simplify Normalizers & Model (Session 4)

### 4.1 `normalizers.js` — Remove `coerceProductEntity`
- **Keep:** `normalizeGlobalProduct`, `normalizeCacheProduct`, `normalizeOFFProduct`
- **Remove:** `coerceProductEntity` (lines 138-156) — heuristic type-guessing
- **Update callers:** `resolver.js` uses it at lines 322, 347, 377, 536, 540, 543, 576; `productScreenData.js` doesn't use it

**Strategy:** Replace `coerceProductEntity(...)` with explicit normalizer based on known source:
- `normalizeGlobalProduct(row, storeOverlay)` for store/global products
- `normalizeCacheProduct(row)` for external cache
- `normalizeOFFProduct(ean, row)` for OFF

### 4.2 `model.js` — Remove Demo Support
- **Line 6:** Remove `demoId` from `buildCanonicalId`
- **Lines 128-133:** Remove `demo:` branch in `parseRouteProductRef`
- **Keep:** `gp:`, `ean:`, `tmp:` (for unknown)

---

## Phase 5: ProductScreen Simplification (Session 4-5)

### 5.1 Remove `needsResolve` Path
**Lines 98, 109-127:** The `needsResolve` effect calls `resolveProductByEan` directly. This is now redundant because:
- `baseProduct` comes from `catalogProducts` (already resolved via RPC)
- `fetchFullProduct` fetches full details when needed

**Action:** Remove `needsResolve` const and its `useEffect`. The resolver's session cache handles duplicate scans.

### 5.2 Simplify `fetchFullProduct` Usage
**Current logic (lines 100-107):**
```javascript
const needsFullFetch = shouldFetchFullProductForProductScreen({
  baseProduct, fullProduct, ean, storeId, isOnline, needsResolve
})
```

**Simplified:** Only fetch full if:
- `isOnline && storeId && ean`
- `baseProduct` exists but `baseProduct.productScreenFull !== true`
- `fullProduct` doesn't match EAN (or doesn't exist)

### 5.3 Merge Logic Review
`productScreenData.js` — `preserveBaseFactsWhenFullIsSparse` is clever but verify:
- Catalog RPC (`fn_get_store_catalog`) returns **all fields** in `FULL_FIELDS` (line 34-35 StoreContext)
- PostgREST join in `fetchFullProduct` returns **same fields** via `global_products!inner(...)`
- **Conclusion:** Both should have same fields. Merge only needed if fullProduct is genuinely sparser (e.g., partial index). Keep as safety net.

---

## Phase 6: Verification & Testing (Session 5-6)

### 6.1 Unit Tests
```bash
# Run existing tests
npm run test:unit

# Key test files to verify:
# - tests/unit/productScreenData.test.mjs
# - tests/unit/productScanContainment.test.mjs
# - tests/unit/retailImportCore.test.mjs (uses resolver?)
```

### 6.2 Integration Tests (Playwright)
```bash
npm run test  # Playwright

# Critical paths:
# 1. Scan EAN → ProductScreen (store product)
# 2. Scan EAN → ProductScreen (global product only)
# 3. Scan unknown EAN → Unknown product screen + request button
# 4. Offline scan → pending queue → sync on reconnect
# 5. Catalog browsing → product click → ProductScreen
# 6. Favorites/history → product hydration
```

### 6.3 Manual Smoke Test Checklist
| Scenario | Expected |
|----------|----------|
| `/s/mars/product/4600000102452` (store product) | Shows price, shelf, stock |
| `/s/mars/product/4008400404127` (global only) | Shows global data, no price |
| `/s/mars/product/0000000000000` (unknown) | Unknown screen, request button works |
| Offline mode → scan known EAN | Serves from IndexedDB, shows cache age |
| Online → scan unknown EAN | Logs to missing_products, scan_events |
| `/stores` page | Lists 3 stores from Supabase |
| Switch store in `/s/` | Loads new catalog via RPC |

### 6.4 Performance Checks
- Resolver session cache: repeated scans of same EAN < 10ms
- Catalog warm-up: `fn_get_store_catalog` batches of 1000, < 3s for 10K products
- ProductScreen full fetch: single PostgREST join < 500ms

---

## Phase 7: Cleanup & Documentation (Session 6-7)

### 7.1 Remove Unused Imports/Exports
```bash
# Check for dead exports
grep -r "export.*function" src/domain/product/ --include="*.js" | grep -v "normalizeGlobalProduct\|normalizeCacheProduct\|normalizeOFFProduct\|createEmptyProduct\|withProductImage\|buildCanonicalId\|parseRouteProductRef\|isUuid"
```

### 7.2 Update Documentation
- `docs/vault/architecture/product-resolution.md` — update cascade diagram, remove demo fallback
- `docs/CONTEXT.md` — verify "What Works" section still accurate
- `docs/ARCHITECTURE.md` — verify Product Resolution section

### 7.3 Final Verification
```bash
npm run build && npm run lint && npm run test:unit
node scripts/check-i18n.mjs
npm run check:agent:ui
```

---

## Rollback Procedures

| Phase | Rollback |
|-------|----------|
| 1 (Dead code) | `git restore src/data/products.json src/data/storeInventories.js src/utils/storeCatalog.js` |
| 2 (Resolver) | `git restore src/domain/product/resolver.js`; restore `storeCatalog.js` if needed |
| 3 (StoreContext) | `git restore src/contexts/StoreContext.jsx src/screens/StoresScreen.jsx src/data/stores.js` |
| 4 (Normalizers) | `git restore src/domain/product/normalizers.js src/domain/product/model.js` |
| 5 (ProductScreen) | `git restore src/screens/ProductScreen.jsx src/domain/product/productScreenData.js` |

**Each phase commits independently** — easy to bisect.

---

## Test Matrix

| Test | Phase | Command |
|------|-------|---------|
| Unit tests | All | `npm run test:unit` |
| Build + lint | All | `npm run build && npm run lint` |
| i18n check | All | `node scripts/check-i18n.mjs` |
| Playwright smoke | 6 | `npm run test` |
| Resolver cache behavior | 2 | Manual: scan same EAN twice, verify no duplicate network call |
| Offline scan | 6 | DevTools: offline mode, scan known EAN |
| Unknown EAN flow | 6 | Scan non-existent EAN, verify missing_products increment |
| Store switching | 3,6 | Navigate `/s/mars` → `/s/nurly`, verify catalog reloads |

---

## Dependencies & Blockers

| Dependency | Status | Owner |
|------------|--------|-------|
| Migration 026 (`fn_resolve_product_by_ean`) | ✅ Deployed | — |
| Migration 018 (`increment_missing_scan_count`) | ✅ Deployed | — |
| Trusted aliases (migrations 047-049) | ✅ Deployed | — |
| 3 stores with products in Supabase | ✅ Verified | — |
| Arbuz import seeded Mars (~10K products) | ✅ Done | — |

**No external blockers.** All DB prerequisites complete per CONTEXT.md.

---

## Effort Estimate

| Phase | Sessions | Risk |
|-------|----------|------|
| 0: Prep & Verify | 1 | Low |
| 1: Dead Code Removal | 1 | Low |
| 2: Resolver Refactor | 2 | Medium |
| 3: Store Fallbacks | 1 | Low |
| 4: Normalizers | 1 | Medium |
| 5: ProductScreen | 2 | Medium |
| 6: Testing | 2 | High (timebox) |
| 7: Cleanup/Docs | 1 | Low |
| **Total** | **11** | — |

**With focused sessions:** 5-7 sessions (some phases combinable).

---

## Definition of Done

- [ ] `products.json`, `stores.js`, `storeInventories.js` deleted
- [ ] `storeCatalog.js` deleted
- [ ] `resolver.js` uses shared Supabase client, no module-level caches, RPC-first
- [ ] `StoreContext.jsx` and `StoresScreen.jsx` have no hardcoded fallbacks
- [ ] `coerceProductEntity` removed, explicit normalizers used
- [ ] `demo:` canonicalId removed
- [ ] `ProductScreen.jsx` has no `needsResolve` path, no `enrichmentEvents` listener
- [ ] All tests pass: `npm run build && npm run lint && npm run test:unit`
- [ ] i18n check passes
- [ ] Playwright smoke tests pass for critical paths
- [ ] Documentation updated