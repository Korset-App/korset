# 2026-05-25 — HomeScreen Pilot Upgrade Stages 3-4

Stages 3 and 4 add the first interactive layer on top of the staged HomeScreen IA.

Changes:
- Stories are now clickable and open a compact modal with RU/KZ title, explanation, and action.
- Added soft Fit-Check state detection for halal, allergens, and sugar from local `ProfileContext` preferences.
- Added install banner logic for PWA: Android `beforeinstallprompt`, iOS manual instruction, appinstalled/dismiss persistence.
- Added iOS PWA metadata in `index.html`.
- Avatar now opens a compact mini-menu with profile, preferences, language/theme, history, FAQ/support, and install actions.
- Store contacts still stay compact and shopper-facing only.

Not done:
- Visual browser smoke was intentionally skipped in this pass to keep the staged iteration lightweight.
- Language/theme menu item currently routes to profile; a dedicated compact settings drawer can be separated later if needed.
- Full PWA install behavior still depends on browser/platform support and production installability.

Verification:
- `node --test tests/unit/homeScreenModel.test.mjs`
- `node scripts/check-i18n.mjs`
- `npx eslint src/domain/home/homeScreenModel.js src/screens/HomeScreen.jsx`
