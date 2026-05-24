# /stores Premium Gateway Redesign

Date: 2026-05-24
Domain: changelog

## Summary

Redesigned `/stores` from a plain inline-styled list into a premium, mobile-first glass gateway between the landing page and store-scoped consumer app.

## What Changed

- Rebuilt `src/screens/StoresScreen.jsx` with a branded hero, network stats, search, loading skeletons, empty/search-empty states, store cards, and a subtle owner CTA.
- Added `src/screens/StoresScreen.css` with theme-aware dark/light glass styling, decorative atmosphere, Android-friendly motion, reduced-motion fallback, and narrow-device adjustments.
- Added `src/domain/stores/listing.js` for stable public store card normalization and filtering.
- Added RU/KZ i18n keys in `src/locales/ru/common.json` and `src/locales/kz/common.json`.
- Added `tests/unit/storeListing.test.mjs` for store listing normalization and search behavior.

## Product Notes

- The screen remains `/stores` and still routes selected stores into `/s/:storeSlug`.
- Store list still queries active Supabase `stores` first and falls back to `src/data/stores.js` when needed.
- Future “soon” stores are supported in the card model, but inactive/coming-soon stores should not be publicly queried until the data model explicitly supports public preview records.
- Opening hours are currently shown as a localized placeholder because the current `stores` schema has no hours field.

## Verification

- `node --test "tests/unit/storeListing.test.mjs"` passed.
- `npm run check:agent:i18n` passed.
- `npx eslint "src/screens/StoresScreen.jsx" "src/domain/stores/listing.js"` passed.
- `npm run build` passed with existing Vite/Sentry warnings.
