---
title: Product Card Normalization Stage 4
date: 2026-05-23
domain: changelog
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[attribute-extraction]] · [[name-normalization]]
---

# Product Card Normalization Stage 4

Stage 4 normalized ProductScreen characteristics so the card can show useful facts without leaking internal product metadata.

## Implemented

- Added `src/domain/product/productSpecs.js` as the tested product-characteristics builder for ProductScreen.
- `normalizeSpecs()` now maps Arbuz-style `storage_conditions` and common shelf-life aliases into the display-ready product shape.
- Product entities now expose a normalized `country` field from `country`, `countryOfOrigin`, or `country_of_origin`.
- `SpecsGrid` now renders normalized characteristic rows instead of reading raw product fields directly.
- ProductScreen characteristics can show storage, best-before/shelf-life, fat percentage, flavor, clean human-readable subcategory, manufacturer, and country.
- Internal-only fields remain hidden from ProductScreen characteristics: packaging type, source/data-quality, NOVA, and Nutri-Score.
- Added RU/KZ i18n keys for country of origin and fat percentage.

## Verification

- `node --test tests/unit/normalizers.test.mjs` passed: 27/27.
- `node scripts/check-i18n.mjs` passed: all KZ keys present.

## Notes

Unit-price visibility is intentionally unchanged in this stage. It remains scheduled for Stage 6, where it needs category-aware rules and real-product QA.
