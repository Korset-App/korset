---
title: EAN Stage 1 Scan Containment
domain: changelog
status: complete
date: 2026-06-01
language: ru
---

# EAN Stage 1 Scan Containment

## Context

The live EAN integrity audit showed severe pollution in `global_products.alternate_eans`: most alias relations are critical or suspicious, and polluted alternates can produce wrong buyer-visible product cards after scan.

Stage 1 focused only on containment. No Supabase data was changed, and no live database function was migrated.

## Changes

- Added `tests/unit/productScanContainment.test.mjs` for the scan containment contract.
- Added `isResolvedProductExactForScannedEan()` in `src/domain/product/resolver.js`.
- `findProductViaRPC()` now accepts an RPC result only when the returned normalized product primary EAN exactly matches the scanned EAN.
- Direct resolver fallback no longer searches `global_products.alternate_eans` or `global_products.alternate_eans` through `store_products`.
- `findProductInCatalog()` in `src/domain/product/alternatives.js` now accepts `{ allowAlternate: false }` while preserving default alternate matching for non-scan flows.
- `ProductScreen.jsx` uses exact-only catalog lookup when route state has `fromScan: true`, preventing immediate scan navigation from resolving a polluted catalog alternate before the resolver runs.

## Verification

- `node --test tests/unit/productScanContainment.test.mjs` — 4/4 passed.
- `node --test tests/unit/productScanContainment.test.mjs tests/unit/alternativesRpcMapping.test.mjs tests/unit/aiProductContext.test.mjs` — 13/13 passed.
- `npm run lint` — completed with 0 errors and 77 existing warnings in unrelated files.

## Result

Buyer scan resolution is now safer: exact primary EAN matches still resolve, but unsafe alternate-only matches are not accepted as buyer-visible product identity. This can temporarily increase unknown/not-found outcomes until Stage 2-4 introduce trusted aliases.

## Next

Proceed to Stage 2: create a trusted EAN alias data model with status/source/confidence/evidence and a one-trusted-product-per-scannable-EAN invariant.
