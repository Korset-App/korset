# Catalog Store And Scan Shortcuts

Date: 2026-05-26
Domain: changelog

## Summary

CatalogScreen now presents the active store as a real store-context pill instead of decorative text. The pill opens the public store information page (`/stores/:storeSlug`) to avoid touching the HomeScreen while parallel home-screen work is active.

The catalog search row now includes a compact scan shortcut that navigates to `/s/:storeSlug/scan`, plus a quiet helper line on the category overview: "Сканируйте товар или выберите категорию" / "Тауарды сканерлеңіз немесе санатты таңдаңыз".

## UI Notes

- Category showcase layout/order was intentionally left unchanged.
- Category card tones were darkened and unified toward a premium storefront look.
- Category titles now use a consistent white text treatment with stronger text-shadow for readability.
- No HomeScreen files were touched in this change to avoid conflicts with concurrent work.

## Files

- `src/screens/CatalogScreen.jsx`
- `src/index.css`
- `src/locales/ru/product.json`
- `src/locales/kz/product.json`
- `docs/CONTEXT.md`
