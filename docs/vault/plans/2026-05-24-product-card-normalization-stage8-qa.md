---
title: Product Card Normalization Stage 8 QA Report
date: 2026-05-24
domain: plans
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[attribute-extraction]] · [[product-resolution]]
---

# Product Card Normalization Stage 8 QA Report

Stage 8 validated the ProductScreen normalization workstream against the Stage 1 real MARS/store-one fixture.

## Scope

- Fixture: `tests/fixtures/product-card-normalization-samples.json`.
- Sample count: 24 products.
- Covered cases: full/partial/no nutrition, ingredients-only, description + ingredients, storage conditions, fat percentage, packaging hidden, high-confidence flavor, no-flavor control, ambiguous flavor, and unit-price review products.
- This was fixture-level/domain QA, not a browser visual smoke and not a fresh live Supabase query.

## Result

- Contract pass: 24/24.
- Contract failures: 0.
- Visible high-confidence flavors: 11.
- Ambiguous hidden flavors: 1 (`Сосиски Bizhan с сыром` remains `medium` and hidden).
- Unit-price manual review cases: 2.
- Buyer-visible internal metadata leaks found: 0.

## Adjustments Made During QA

- Flavor extraction now supports simple compound flavor tokens such as `апельсин и миндаль`.
- Flavor extraction keeps the real catalog multi-word savory flavor `маринованными огурчиками и зеленью` as `Огурчики и зелень`.
- These fixes are covered in `tests/unit/flavorExtraction.test.mjs`.

## False Positives / False Negatives

- False positives against the fixture contract: 0.
- False negatives after adjustment: 0.
- Conservative intentional hide: `Чечил SnekOFF паутинка сливочная` still does not show `Сливочный`; this avoids treating dairy texture/style words as flavor until broader real-data QA confirms the rule is safe.

## Residual Risks

- Browser/mobile visual QA remains pending: ProductScreen layout should still be checked on representative real routes.
- Unit-price rules are conservative but should be reviewed on more small-pack cases: spices, gum, tea bags, capsules, sachets, bakery, and multipacks.
- Flavor extraction is deterministic and dictionary-based; it should remain runtime-only until a larger QA pass proves the false-positive rate is acceptable.

## Verification

- `node --test tests/unit/productScreenSections.test.mjs tests/unit/unitPrice.test.mjs tests/unit/flavorExtraction.test.mjs tests/unit/normalizers.test.mjs` passed: 44/44.
- `npx eslint src/domain/product/attributeExtractor.js src/domain/product/productScreenSections.js src/domain/product/unitPrice.js src/screens/ProductScreen.jsx src/components/product/SpecsGrid.jsx` passed.
- Fixture QA script run inline: 24/24 pass, 0 issues.
