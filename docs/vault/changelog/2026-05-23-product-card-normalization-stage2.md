---
title: Product Card Normalization Stage 2
date: 2026-05-23
domain: changelog
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[2026-05-23-product-card-normalization-stage1-audit]]
---

# Product Card Normalization Stage 2

Completed canonical nutrition normalization for ProductScreen and downstream product consumers.

## What Changed

- `normalizeNutrition()` now maps Arbuz nutrition keys into the canonical product shape:
  - `energy_kcal` -> `kcal`
  - `protein_100g` -> `protein`
  - `fat_100g` -> `fat`
  - `carbohydrates_100g` -> `carbs`
- `NutritionUnified` now accepts Arbuz-style aliases defensively, so raw nutrition does not hide calories/protein.
- Full ProductScreen fetch mapping in `StoreContext.jsx` now normalizes `nutriments_json` instead of passing raw nutrition through.
- Catalog RPC mapping in `StoreContext.jsx` now uses `ingredients_raw`, `traces_json`, and normalized `nutriments_json` returned by migration 037.
- Product search mapping now normalizes `nutriments_json` before returning catalog product objects.
- Fit-Check now recognizes raw `protein_100g` when it receives unnormalized nutrition.

## Tests Added

- `normalizeNutrition maps Arbuz nutrition keys to canonical product keys`.
- `normalizeGlobalProduct exposes Arbuz nutrition as canonical ProductScreen nutrition`.
- `PKU + raw Arbuz protein_100g (>20g) -> warning`.

## Verification

- `node --test tests/unit/normalizers.test.mjs` passed 24/24.
- `node --test tests/unit/fitCheck.test.mjs` passed 69/69.
- Targeted related unit set passed 113/113.
- `npm run test:unit` passed 341/341.
- `npm run lint` exited 0 with existing warnings.
- `npm run build` passed.

## Next Stage

Proceed to Stage 3: full ProductScreen loading contract. The main question is now less "does nutrition normalize?" and more "does ProductScreen always receive the full normalized product in every entry path?"

