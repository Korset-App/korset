# Fix: Banner images blocked by adblockers in profile edit / setup flows

**Date:** 2026-05-17
**Scope:** ProfileEditScreen, SetupProfileScreen (step 2), ProfileScreen banner preview
**Root cause:** Adblockers (uBlock Origin, AdGuard, etc.) block HTTP requests to URLs containing `/banners/`, treating them as advertising banners. The requests are silently cancelled, so the browser shows empty black cards instead of broken-image icons.
**Fix:** Renamed the static asset directory and all references from `public/banners` to `public/profile-bgs`.

## Changed files

- `public/banners` → `public/profile-bgs` (moved recursively, including `thumbs/` and `raw/`)
- `src/constants/bannerPresets.js` — updated all `src` and `thumb` paths from `/banners/` to `/profile-bgs/`
- `scripts/optimize-banners.mjs` — updated `RAW_DIR`, `OUT_DIR`, `THUMB_DIR` constants and usage comment
- `.gitignore` — updated ignored paths to `public/profile-bgs/raw/` and `public/profile-bgs/thumbs/`

## Verification

- `npm run build` passes
- `npm run lint` passes (no new errors)
- Playwright smoke test of `/setup-profile` step 2 shows all 7 banner thumbnails correctly in both dev and preview builds
- No other code references to `/banners/` remain (only legacy changelog notes)

## Notes

- Supabase Storage bucket name `profile-banners` was intentionally left unchanged; it is unrelated to the blocked static asset path.
- Existing user data stores banner values as `preset:<id>` or full URLs, so no data migration is required.
