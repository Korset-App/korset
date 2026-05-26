# 2026-05-27 — Home fit setup panel

Updated the consumer home Fit setup block so it reads as a temporary task panel instead of a Fit-Check accordion.

What changed:
- Replaced the old collapsed summary pattern with an expanded panel shown by default when the profile is incomplete.
- Renamed the copy away from Fit-Check language toward plain shopper wording about diet, halal, and allergies.
- Added a visible close button and changed the save action to hide the block after the profile is saved.
- Reworked the options into compact icon chips using the existing profile diet/allergen icon style.
- Tightened the visible choice set so the panel stays readable on mobile and does not dominate the home screen.

Files:
- `src/screens/HomeScreen.jsx`
- `src/screens/HomeScreen.css`
- `src/locales/ru/home.json`
- `src/locales/kz/home.json`

Verification:
- `node scripts/check-i18n.mjs`
- `npm run build`
- Chromium smoke screenshot on `/s/mars` at 390px width
