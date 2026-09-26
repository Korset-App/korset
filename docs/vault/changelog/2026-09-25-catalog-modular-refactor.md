# Catalog Screen Modular Refactoring & Visual Upgrade

**Date:** 2026-09-25  
**Scope:** `src/screens/CatalogScreen.jsx`, `src/components/catalog/`, `src/hooks/`, `src/domain/catalog/`, `src/index.css`

## Context & Problem
- `src/screens/CatalogScreen.jsx` was a 1,352-line monolithic file mixing rendering, query debouncing, server RPC, sort algorithms, Fit-Check filtering, category showcase grids, and compare bars.
- A previous session had added visual gimmicks: heavy scroll-morph animations, glowing gradient borders, and an awkward two-line "Фильтр состава" button placed beside the section title.
- Bento cards had text colliding with packshot cutouts on wide cards, and cards used unappetizing/misplaced tones (e.g. berry purple for dairy, cold green for meat).
- Long product names in cards were prematurely clipped.
- Dairy category title in single source of truth (`categoryMap.js`) was outdated ("Молоко и яйца" instead of "Молочная продукция и яйца").

## Key Changes
1. **Single Source of Truth (`src/domain/product/categoryMap.js` & `catalogShowcase.js`)**:
   - Updated `dairy_eggs` label to "Молочная продукция и яйца" (KZ: "Сүт өнімдері мен жұмыртқа").
   - Harmonized showcase card tones: `dairy` (soft creamy blue), `terracotta` (warm savory meat), `amber` (warm golden bakery), `azure` (crisp water/drinks).
2. **Business Logic Extraction (Hooks & Domain)**:
   - `src/domain/catalog/catalogSorting.js`: Pure functions for catalog sorting, suggestion builders, merge routines, and nutrient parsing.
   - `src/hooks/useCatalogSearch.js`: Query state, 250ms debounce, server search RPC, search suggestions, and search history persistence.
   - `src/hooks/useCatalogFilter.js`: Category/subcategory filtering, sort modes, subcategory counts, Fit-Check calculation, and derived display lists.
3. **Dedicated UI Components**:
   - `CatalogTopBar.jsx`: Flat, minimalist top bar with search, scanner shortcut and view toggle (unified with HomeScreen pattern, no hard borders or detached pills).
   - `CategoryShowcaseGrid.jsx` & `CategoryCard.jsx`: Bento grid with restored section head (`catalog-section-title` + `catalog-section-sub` store count) and interactive `catalog-fit-row` (profile chips or dashed CTA card opening `FitCheckDrawer`). Titles pinned top-left with `hyphens: none`, packshot images aligned right without text overlap, clipping, or hyphenated word splits.
   - `CatalogSubcategoryNav.jsx`: Horizontal scrollable subcategory chips.
   - `CatalogCompareBar.jsx`: Floating compare bar with pinned item badge and shared `CompareIcon`.
   - `CatalogEmptyView.jsx`: Clean empty states for no products or no search results.
4. **Product Card Polish (`CatalogProductCard.css`)**:
   - Allowed up to 3 lines for titles with graceful word-break so full product names remain readable.
5. **Orchestrator Reduction**:
   - `CatalogScreen.jsx` reduced from 1,352 lines to ~380 lines of clean orchestrator code.
6. **Collapsible Header on Scroll (Stage 3)**:
   - Added `isHeaderScrolled` state and `handleShowcaseScroll` with hysteresis threshold (35px / 12px) in `CatalogScreen.jsx`.
   - `.catalog-topbar__fit-row` smoothly collapses (`max-height: 0`, `opacity: 0`, `transform: translateY(-8px)`) with cubic-bezier transition, while search input and barcode shortcut remain sticky.
   - `.catalog-topbar` padding and corner radius compact smoothly (`is-scrolled` modifier: 26px to 20px radius).
   - Grid/list view toggle and subcategory navigators upgraded to solid surface standards (`#ffffff` light, `#080811` dark).

## Verification
- `npm run lint`: PASS (0 errors).
- `node scripts/check-i18n.mjs`: PASS (100% parity across 13 namespaces).
- `npm run test:unit`: PASS (652/652 passing).
- `npm run build`: PASS (Vite production build successful with PWA precache).
- Playwright Visual Verification: Tested collapsed state on scroll down, smooth restore on scroll up, and subcategory navigation in both Light and Dark themes.
