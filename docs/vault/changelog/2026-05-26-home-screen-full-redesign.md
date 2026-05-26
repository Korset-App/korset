# Home Screen Full Redesign

Date: 2026-05-26

## Summary

Replaced the previous lightweight `/s/:storeSlug` home screen pass with a fuller mobile-first store entry experience.

Implemented:

- Brand/store header with visible `Korset & {storeName}` lockup and `<ProfileAvatar />`.
- Avatar menu around the avatar with profile, preferences, inline RU/KZ language switch, inline dark/light theme switch, and install action only when browser install prompt is available.
- Five horizontal story highlight cards with real image placeholders and a story viewer with progress bars, slide navigation, close control, and CTA.
- Primary scan CTA focused on "scan product before purchase".
- Inline Fit-Check setup on the home screen: preferences and allergens are saved without routing the shopper to profile. Added explicit "no preferences" and "no allergies" options.
- AI assistant and catalog shortcuts using the existing app navigation pattern.
- Store card with logo/name, description, address/opening hours, phone, WhatsApp, Instagram, 2GIS-style contact badges, and public store page link.
- PWA install banner remains conditional and is hidden after installation/dismissal.

## Store Settings Fix

`RetailSettingsScreen` no longer reuses previous local form values when `currentStore` has an empty field. This fixes the local state path for clearing address/district/description/opening-hour-like fields before save.

If live saving still fails for opening hours, check whether the production Supabase database has the `opening_hours` migration applied.

## Files

- `src/screens/HomeScreen.jsx`
- `src/screens/HomeScreen.css`
- `src/domain/home/homeScreenModel.js`
- `src/components/BottomNav.jsx`
- `src/screens/RetailSettingsScreen.jsx`
- `src/locales/ru/home.json`
- `src/locales/kz/home.json`
- `tests/unit/homeScreenModel.test.mjs`

## Verification

- `node --test tests\unit\homeScreenModel.test.mjs tests\unit\retailStoreSettings.test.mjs`
- `node scripts\check-i18n.mjs`
- `npx eslint src\screens\HomeScreen.jsx src\components\BottomNav.jsx`
- `npx eslint src\domain\home\homeScreenModel.js src\screens\HomeScreen.jsx`
- `npm run build`
- Local Playwright/static smoke over `dist` for `/s/mars` at mobile widths, with screenshots:
  - `C:\tmp\korset-home-390.png`
  - `C:\tmp\korset-home-story-390.png`
  - `C:\tmp\korset-home-fit-390.png`
  - `C:\tmp\korset-home-430.png`

Known smoke caveat: the temporary static-server smoke logs one generic `Unexpected token '<'` page error while still rendering the screen and returning no bad network responses. This should be rechecked on the normal Vite dev server or deployed preview if the error appears in real browser usage.

## Header And Avatar Menu Follow-Up

Later on 2026-05-26, the top area was refined again based on owner feedback:

- Removed the custom drawn header mark and decorative grid background.
- Switched the header to store-first co-branding: compact Körset service chip, local store logo/name as the primary identity, store type/opening-hours line, and a small "about store" action that scrolls to the store details block.
- Added local fallback logos for pilot stores (`mars`, `nurly`, `kalina`) on the home header.
- Reworked the avatar menu into a glass capsule opening from the avatar position. The visible avatar remains in the top-right area and closes the menu when tapped again; a separate pencil button navigates to profile editing.
- Avatar menu now contains only user-relevant shortcuts: preferences, favorites, check history, compact language/theme controls in one row, and install-app help.
- Profile now initializes the correct stats tab from `?tab=preferences`, `?tab=favorites`, or `?tab=history`, so home menu shortcuts open the intended profile section.
- Install prompt visibility now uses session dismissal instead of permanent localStorage hiding. On iOS or when the browser prompt is unavailable, the home install block shows manual installation steps instead of a dead button.

Additional verification:

- `npx eslint src\screens\HomeScreen.jsx`
- `node scripts\check-i18n.mjs`
- `npm run build`
- Static Playwright screenshots:
  - `C:\tmp\korset-home-390.png`
  - `C:\tmp\korset-home-avatar-menu-390.png`
