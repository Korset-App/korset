# Catalog Product Card Visual Layer

Date: 2026-05-27
Domain: changelog

## Summary

Catalog product cards now show a compact semantic badge row: Fit-Check verdict, available positive product attributes (halal and diet tags), and kcal when nutrition data exists.

## Implementation

- Badge/kcal extraction lives in `src/domain/catalog/catalogProductCardModel.js`.
- Card rendering remains in `src/components/catalog/CatalogProductCard.jsx` and `CatalogProductCard.css`.
- `CatalogScreen.jsx` still owns catalog data, navigation, Fit-Check, and compare state.
- RU/KZ keys were added for catalog badges.

## UX Notes

- Empty attributes are not rendered, so cards do not reserve blank space.
- Compare is icon-only in the product card and keeps accessible labels.
- List cards now have a small vertical gap to avoid visually sticking together.
