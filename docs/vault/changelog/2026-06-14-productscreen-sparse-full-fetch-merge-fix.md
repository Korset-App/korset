---
title: ProductScreen Sparse Full Fetch Merge Fix
domain: changelog
status: complete-local
date: 2026-06-14
language: ru
---

# ProductScreen Sparse Full Fetch Merge Fix

## Context

The owner reported that product ingredients appeared briefly on ProductScreen and then disappeared after about a second. This matched the data flow where ProductScreen first renders a catalog/base product, then replaces it with a later full fetch result.

## Root Cause

`getProductScreenProduct()` preferred any matching `fullProduct` over `baseProduct`. If the full fetch returned a sparse product object with missing facts such as `ingredients`, `nutritionPer100`, or `allergens`, the richer catalog product facts were erased from the rendered card.

## Changes

- Updated `src/domain/product/productScreenData.js` so matching full products are merged over the base product but cannot erase useful base facts with empty values.
- Preserved fallback fields include ingredients, KZ ingredients, nutrition, allergens, diet/tags/traces, description, and images.
- Added a regression test in `tests/unit/productScreenData.test.mjs` for sparse full fetch not erasing catalog ingredients.

## Verification

- TDD red: `node --test tests/unit/productScreenData.test.mjs` failed because `ingredients` became `null`.
- `node --test tests/unit/productScreenData.test.mjs` — 11/11 passed.
- Targeted product set — 55/55 passed.
- `npm run check:agent` — PASS, unit tests 565/565.
- `npm run build` — PASS with existing Vite/Sentry warnings.

## Next

Ship as a production hotfix because the issue affects visible ProductScreen composition content.
