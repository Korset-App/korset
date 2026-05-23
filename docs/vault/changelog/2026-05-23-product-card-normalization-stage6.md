---
title: Product Card Normalization Stage 6
date: 2026-05-23
domain: changelog
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[product-resolution]] · [[attribute-extraction]]
---

# Product Card Normalization Stage 6

Stage 6 added product-aware unit-price visibility rules so ProductScreen stops showing mechanical "price per 100 g/ml/unit" rows when the comparison is not useful.

## Implemented

- Added `src/domain/product/unitPrice.js` with `buildProductUnitPrice(product)`.
- `ProductScreen.jsx` and `SpecsGrid.jsx` now use the same domain helper instead of calling the raw quantity calculator directly.
- Weight/volume unit price is shown only for comparable grocery categories/subcategories with reliable quantity.
- Drinks prefer `100 мл`; packaged solids prefer `100 г`.
- Per-piece price is shown only for meaningful count comparisons, currently eggs.
- Ambiguous single-piece catalog quantities such as `шт` without reliable weight/volume/count are hidden.
- Misleading categories such as spices, sachets/capsules/tea bags/gum and non-grocery categories are hidden.

## Verification

- `node --test tests/unit/unitPrice.test.mjs tests/unit/flavorExtraction.test.mjs tests/unit/normalizers.test.mjs` passed: 39/39.
- Targeted fixture smoke over Stage 1 samples showed expected unit-price behavior for eggs, milk, drinks, chips, sauce, and pasta.
- `npx eslint src/domain/product/unitPrice.js src/components/product/SpecsGrid.jsx src/screens/ProductScreen.jsx` passed with no warnings.

## Notes

The helper is intentionally conservative and runtime-only. Future real-catalog QA can tune subcategory allow/hide lists before ProductScreen composition Stage 7.
