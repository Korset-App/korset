---
title: Compare Stage 2 Category Scoring
date: 2026-05-31
domain: changelog
area: product
status: completed
related: [[2026-05-31-compare-stage1-domain-contract]] · [[2026-05-24-product-card-normalization-stage9-compare-readiness]]
---

# Compare Stage 2 Category Scoring

Stage 2 added category-aware deterministic scoring without changing the visual Compare screen.

## Changed

- `src/domain/product/comparison.js` now uses a weighted internal decision model instead of a first-matching criterion chain.
- Profile signals are now a perspective, not the only source of truth:
  - the overall winner can be different from the strict profile winner;
  - `profilePerspective` records the profile-specific winner and reason.
- Nutrition comparison is category-aware for grocery-store food categories:
  - drinks prioritize sugar and kcal;
  - dairy prioritizes sugar, protein, kcal, and fat;
  - sweets prioritize sugar, kcal, and fat;
  - snacks prioritize salt, kcal, fat, and protein;
  - meat/deli/fish prioritize protein, fat, and salt;
  - baby food prioritizes sugar and salt;
  - bread/grocery/healthy/ready meals/fruits/sauces use category-appropriate nutrition weights.
- Value comparison now prefers shared `buildProductUnitPrice()` when both products have comparable unit-price data, then falls back to direct price.
- Shopper-facing numeric scores remain internal only.
- RU/KZ compare locale keys were added for nutrition and value reasons.

## Product Decision

Compare should answer the real buying question, not blindly follow a single profile preference. If halal/allergy/diet settings matter, they must still be visible and can strongly affect the result, but the domain result can also explain when the overall product choice differs from the strict profile perspective.

## Verification

- `node --test tests\unit\productComparison.test.mjs`: 11/11 passed.
- `node scripts/check-i18n.mjs`: passed with all KZ keys present.
- `npx eslint src\domain\product\comparison.js`: passed.

## Next

Stage 3 should build a UI-facing comparison model from this domain result: verdict, confidence, profile note, top factors, and detail sections. It should not redesign the screen until the model contract is stable.
