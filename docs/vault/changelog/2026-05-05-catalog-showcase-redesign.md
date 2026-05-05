# 2026-05-05 — CatalogScreen Bento Showcase Redesign

## Summary

CatalogScreen получил новый верхний уровень: вместо простой сетки иконок теперь показывается адаптивная bento-витрина 18 основных категорий с реальными category cutout-изображениями.

## Files

- `src/screens/CatalogScreen.jsx`
- `src/index.css`
- `src/domain/product/catalogShowcase.js`
- `tests/unit/catalogShowcase.test.mjs`
- `public/catalog-categories/*.webp`
- `public/catalog-raw/*.png` remains as source assets

## Implementation

- PNG-исходники из `public/catalog-raw/` сконвертированы через `sharp` в WebP:
  - target: `public/catalog-categories/category-*.webp`
  - quality: `86`
  - alpha quality: `92`
  - sizes after conversion: примерно `30–129 KB` на категорию
- `catalogShowcase.js` задаёт стабильный контракт для каждой категории:
  - `image`
  - `variant`: `hero`, `wide`, `portrait`, `compact`, `square`
  - `tone`
  - `textTone`
- `CatalogScreen` рендерит `CategoryShowcaseCard` для верхнего уровня каталога.
- Если данные каталога ещё грузятся, экран всё равно показывает все 18 категорий; счётчик товаров показывается только при `count > 0`.
- Клик по категории сохраняет прежнее поведение: пользователь попадает во внутренний список товаров выбранной категории, где остаются поиск, сортировка, подкатегории и Virtuoso.

## Responsive Design

- Mobile-first CSS Grid: `repeat(6, minmax(0, 1fr))`.
- Bento-ритм задаётся через `grid-column/span` и `grid-row/span`.
- Размеры завязаны на `clamp()` и остаются стабильными на 360/393/430px.
- На desktop app-frame всё ещё ограничивает приложение как телефонную рамку; отдельная desktop-раскладка не нужна для V1, потому что основной сценарий — смартфон/планшет.
- Hover-эффекты включаются только внутри `@media (hover: hover)`.
- `prefers-reduced-motion` отключает каскадную bounce-анимацию.

## Theme Notes

- Добавлен `--text-on-accent-dark` для тёмного текста поверх светлых/ярких category cards.
- Карточки проверены в dark и light themes.
- Цвета категорий остаются управляемой палитрой, не прямой копией Figma.

## Verification

- `node --test tests/unit/catalogShowcase.test.mjs` — PASS, 2 tests.
- `node scripts/check-i18n.mjs` — PASS, 0 missing KZ keys.
- `npm run lint` — 0 errors, existing warnings remain.
- `npm run build` — PASS.
- Playwright visual smoke:
  - `360x740`: 18 cards, 0 overlaps.
  - `393x851`: 18 cards, 0 overlaps.
  - `430x932`: 18 cards, 0 overlaps.
  - dark/light screenshots captured to `C:/tmp/korset-catalog-*.png`.
  - category click verified: showcase disappears and back button appears.

## Follow-up Ideas

- After real-device review, tune individual category image positions (`--cat-image-y`, scale) for exact optical balance.
- If production category counts load slowly, consider a subtle skeleton/count shimmer instead of hiding counts.
- If category subcategory landing screens become a priority, reuse the same showcase contract pattern for subcategory groups.

## Refinement After Visual Review

- Reworked the top-level showcase from auto-dense placement to explicit `grid-template-areas`, so the order follows the Figma-inspired merchandising priority and the bottom of the catalog no longer degrades into single-card rows.
- Removed visible category/product counts from the showcase header/cards; the screen now emphasizes discovery rather than database volume.
- Matched the catalog title treatment closer to ProfileScreen and kept the store name on the right (`Mars` fallback from `/s/mars/...`).
- Tuned individual image crop/scale for `water_beverages`, `tea_coffee`, `grocery`, `bread`, `frozen`, and `household`.
- Strengthened light-theme card borders/shadows, especially for pale cards such as water, frozen, and household.
- Added a short premium click transition before opening a category: selected card lifts while the rest fade/settle, then the product list opens.
- Visual smoke after refinement: `360x740`, `393x851`, and `430x932` all render 18 cards with 0 detected overlaps; first 8 cards keep the expected order.

## Geometry Polish After Second Review

- Restored proportions closer to the Figma reference instead of overfitting to a regular grid: tea/coffee is back to a controlled portrait block, dairy/fish are one-line, and the lower half keeps varied bento rhythm.
- Replaced invalid/non-rectangular area attempts with a valid explicit `grid-template-areas` layout: bread/frozen/snacks and ready/sauces/healthy/care/household now form clean rectangles with no single-card tail.
- Removed double image scaling in CSS (`width/height` now stay at 100%, only `transform: scale(...)` controls optical zoom).
- Tuned per-category image scale: sweets less zoomed, meat closer, tea/grocery controlled, household still slightly backed off.
- Reduced compact-card typography and tightened title line-height so two-line labels read cleaner and use less vertical space.
- Light theme separation strengthened for mint/leaf/pale cards; text backing is clearer without turning every title into a heavy label.
- Click transition simplified for performance: shorter 120ms delay, no `filter`, smaller transform and opacity movement.
- Verification after polish: showcase unit test passed, i18n check passed, lint passed with 0 errors and existing warnings, build passed, Chromium smoke at 393px found 18 cards, 0 overlaps, and fitting title widths.
