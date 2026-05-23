---
title: Product Card Normalization Stage 5
date: 2026-05-23
domain: changelog
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[attribute-extraction]] · [[name-normalization]]
---

# Product Card Normalization Stage 5

Stage 5 added conservative flavor extraction for ProductScreen/product normalization.

## Implemented

- Added `extractFlavorAttribute()` in `src/domain/product/attributeExtractor.js`.
- Added a compact RU/KZ/Latin flavor dictionary for real catalog patterns: fruit, dessert, drink, dairy, snack, and savory flavors.
- Supports explicit flavor phrases such as `со вкусом "Вяленые томаты"` and known flavor tokens such as `апельсин`, `паприка`, `крем-брюле`, `сырные`.
- Uses confidence levels: `high`, `medium`, `low`-ready contract. Current deterministic rules emit high-confidence visible flavors and medium-confidence ambiguous matches for internal QA.
- Product entities now carry `flavorMeta`; only high-confidence extraction is exposed as buyer-visible `product.flavor`.
- ProductScreen characteristics already render flavor through `buildProductCharacteristicSpecs()`, so no UI redesign was needed.
- Ambiguous ingredient-like matches such as `Сосиски ... с сыром` remain internal (`medium`) and are hidden from ProductScreen.

## Verification

- `node --test tests/unit/flavorExtraction.test.mjs tests/unit/normalizers.test.mjs` passed: 33/33.
- Targeted fixture smoke over `tests/fixtures/product-card-normalization-samples.json` confirmed high-confidence flavor candidates and no-flavor controls behave as expected.
- `npx eslint src/domain/product/attributeExtractor.js src/domain/product/model.js src/domain/product/normalizers.js src/domain/product/productSpecs.js` passed.

## Notes

This is runtime/domain-level extraction only. No database backfill or schema migration was added. Persisting flavor should wait until real catalog QA proves the false-positive rate is acceptable.
