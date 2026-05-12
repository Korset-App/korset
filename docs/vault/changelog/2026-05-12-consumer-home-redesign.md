---
title: Consumer Home Redesign
date: 2026-05-12
domain: changelog
status: done
---

# Consumer Home Redesign

The buyer home screen at `/s/:storeSlug` was redesigned as a mobile-first store scan hub.

## Changed

- Replaced the old inline-style-heavy store home with a dedicated `HomeScreen.css` visual system.
- Kept `/` delegated to `LandingScreen`; `HomeScreen` now focuses on the store-context consumer app.
- Added explicit loading and missing-store states for `/s/:storeSlug` when store data is not available yet.
- Added a stronger primary scan CTA, store context explanation, fit signals, and catalog/AI/history quick actions.
- Preserved store contacts and public-store-page navigation.
- Added RU/KZ i18n coverage for all new home copy.

## Verification

- `node scripts/check-i18n.mjs` passes: all KZ keys present.
- `npm run lint` completes with existing warnings and no errors.
- `npm run build` is blocked by pre-existing deleted modules outside this change, starting with `src/domain/product/alternatives.js` imported by `AlternativesScreen.jsx`.
