---
title: AlternativesScreen store-catalog implementation
date: 2026-05-06
domain: changelog
status: active
related: [[product-resolution]] · [[retail-cabinet]]
---

# AlternativesScreen Store-Catalog Implementation

## Summary

`AlternativesScreen.jsx` no longer uses the legacy `src/utils/storeCatalog.js` stubs. It resolves the current product from route state or `StoreContext.catalogProducts`, then ranks alternatives from the same store catalog.

## Behavior

- Product lookup supports primary `ean` and `alternateEans` / `alternate_eans`.
- Alternatives are limited to related products from the current store catalog:
  - same `group`
  - same `subcategory`
  - same `category`
- Ranking prioritizes:
  - products that pass `checkProductFit()`
  - closer relation rank
  - closer price
  - stable EAN order
- ProductScreen now passes `{ product }` in route state when opening alternatives, so the alternatives screen can render immediately even before the full catalog finishes warming.
- ProductScreen now also uses `findProductInCatalog()` for optimistic catalog lookup instead of the legacy `storeCatalog` stub.
- The screen shows loading while the catalog is still warming and a localized empty state once the catalog is ready.
- Old hardcoded white/black UI colors in this screen were replaced with semantic CSS variables.

## Verification

- `node --test tests\unit\alternatives.test.mjs` passes.
- `node scripts\check-i18n.mjs` passes.
- `npm run lint` exits with 0 errors; existing repository warnings remain.
- `npm run build` passes.
- `npm run test:unit` currently fails on pre-existing unrelated issues:
  - `tests/unit/i18n/resolve.test.mjs` expects `...` while locale values use `…`.
  - `tests/unit/normalizers.test.mjs` imports removed `normalizeOFFProduct`.
  - `tests/unit/scanFlow.test.mjs` imports missing `src/screens/scanner/scanFlow.js`.
