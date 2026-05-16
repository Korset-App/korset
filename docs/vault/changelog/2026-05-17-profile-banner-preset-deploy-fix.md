---
type: changelog
status: active
date: 2026-05-17
area: profile
---

# Profile Banner Preset Deploy Fix

## Summary

Fixed profile banner preset thumbnails rendering as empty cards in production on `/setup-profile` and `/s/:storeSlug/profile/edit`.

## Root Cause

`BANNER_PRESETS` referenced `/profile-bgs/thumbs/*.webp`, but `public/profile-bgs/thumbs/` is ignored by `.gitignore` as generated output and is not tracked by Git. Production requests therefore fell through to the SPA HTML fallback (`index.html`, about 1.83 KB) instead of returning WebP images.

## Changes

- Removed `thumb` references from `src/constants/bannerPresets.js` so existing grid renderers use the tracked full-size `/profile-bgs/*.webp` assets through `preset.thumb || preset.src`.
- Added `tests/unit/bannerPresets.test.mjs` to verify banner assets exist and presets do not reference ignored generated thumbnails.

## Verification

- `node --test tests/unit/bannerPresets.test.mjs` passes: 3/3.
- `npm run test:unit` passes: 272/272.
- `npm run build` passes.
- `npm run lint` exits with 0 errors and existing warnings unrelated to this fix.
