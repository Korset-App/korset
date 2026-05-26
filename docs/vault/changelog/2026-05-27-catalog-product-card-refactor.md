# Catalog Product Card Refactor

Date: 2026-05-27
Domain: changelog

## Summary

Catalog product cards were extracted from `src/screens/CatalogScreen.jsx` into `src/components/catalog/CatalogProductCard.jsx` with dedicated styles in `src/components/catalog/CatalogProductCard.css`.

## Why

The catalog card markup had grown inside `CatalogScreen.jsx` with many inline styles, making future visual work on tags, calories, compare controls, and spacing harder to maintain safely.

## Notes

- This refactor is intended to preserve current list/grid behavior and visual structure.
- `CatalogScreen.jsx` still owns catalog data, Fit-Check calculation, search diagnostics, navigation, and compare state.
- `CatalogProductCard` owns product thumbnail rendering and list/grid card layout.
- Structural coverage was added in `tests/unit/catalogProductCardStructure.test.mjs`.
