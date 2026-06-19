---
title: Digital Storefront Carousel, Schema Geo and Draft Badge
domain: changelog
status: complete-local
date: 2026-06-18
language: ru
---

# Digital Storefront Carousel, Schema Geo and Draft Badge

## Context

As part of transition to "Digital Catalog / Storefront" concept:
1. Stores need to display their real photos to customers on PWA.
2. Search engines need geographical coordinates for better local SEO indexing.
3. Store owners need to know if their store is in Draft mode (unpublished status).

## Changes

- **HomeScreen (`src/screens/HomeScreen.jsx`):**
  - Integrated Store Photos Carousel from `currentStore.images` (hides if empty).
  - Added a fullscreen Lightbox viewer for photos with swipe/close actions.
  - Injected latitude/longitude coordinates (`currentStore.latitude`, `currentStore.longitude`) into Schema.org `GroceryStore` metadata.
  - Added a visual "Draft" (Черновик) badge in the header if `isStoreOwnerOrAdmin && !currentStore.is_published`.
- **StorePublicScreen (`src/screens/StorePublicScreen.jsx`):**
  - Integrated a grid of store photos with the same fullscreen Lightbox capability.
- **Locales (`src/locales/{ru,kz}/home.json`):**
  - Added translation keys for `home.draftBadge` ("Черновик" / "Жоба") and `home.storePhotos` ("Фотографии магазина" / "Дүкен фотосуреттері").

## Verification

- `node scripts/check-i18n.mjs` — PASS (all keys present).
- `npm run test:unit` — PASS (565/565 tests passed).
- `npm run lint` — PASS (0 errors, 55 warnings).
- `npm run build` — PASS (Vite bundles generated successfully).
