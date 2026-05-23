---
title: Product Card Normalization Stage 3
date: 2026-05-23
domain: changelog
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[2026-05-23-product-card-normalization-stage1-audit]] · [[2026-05-23-product-card-normalization-stage2]]
---

# Product Card Normalization Stage 3

Completed the ProductScreen full-loading contract.

## What Changed

- Added `src/domain/product/productScreenData.js` as the single tested place for ProductScreen product selection and full-fetch decisions.
- ProductScreen now ignores stale `location.state.product` when its EAN does not match the current route.
- ProductScreen now ignores stale `fullProduct` when the route changes to another EAN.
- Full product fetch is skipped when a matching full product is already loaded.
- Full product fetch is skipped while the scan resolver owns the lookup.
- Full product fetch is skipped offline or without store context.
- `fetchFullProduct()` results now carry `productScreenFull: true`, so sparse-but-genuinely-full products do not cause repeated full-fetch decisions.

## Why This Matters

Before this stage, the component held the fetch decision inline and only checked a narrow set of fields. It also could temporarily prefer a stale full product from a previous route. The new contract makes the behavior explicit and testable before continuing to specs, flavor, and unit-price work.

## Tests Added

`tests/unit/productScreenData.test.mjs` covers:

- catalog product priority for route EAN;
- stale route-state product rejection;
- stale full-product rejection;
- alternate-EAN full-product matching;
- full fetch when no base product exists;
- full fetch for non-full catalog/state products;
- no refetch after matching full product is loaded;
- no fetch during scan resolver, offline, or without store context.

## Verification

- `node --test tests/unit/productScreenData.test.mjs` passed 10/10.
- Targeted related unit set passed 46/46.
- `npm run test:unit` passed 351/351.
- `npm run lint` exited 0 with existing warnings.
- `npm run build` passed.

## Next Stage

Proceed to Stage 4: product specs normalization. Priority facts from Stage 1 still apply: `specs_json.storage_conditions` exists on 2,175 MARS products, while `specs_json.storage` exists on 0, so storage conditions are currently hidden by field-name mismatch.

