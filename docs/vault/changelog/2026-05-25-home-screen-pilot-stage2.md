# 2026-05-25 — HomeScreen Pilot Upgrade Stage 2

Stage 2 rebuilds the consumer store HomeScreen information architecture without adding the full interactive story modal, PWA install flow, or avatar mini-menu.

Changes:
- Added `src/domain/home/homeScreenModel.js` for the staged HomeScreen section order, story descriptors, shopper-facing store facts, and quick actions.
- Added unit coverage proving the main canvas keeps only catalog and AI quick actions, excludes history, and shows only public shopper-useful store facts.
- Rebuilt `HomeScreen.jsx` order: compact store header with `<ProfileAvatar />`, stories rail, scan CTA, soft Fit-Check setup panel, catalog/AI quick actions, compact store facts and contacts.
- Removed catalog count, official-store status, and history from the main HomeScreen canvas.
- Added RU/KZ i18n for stories, Fit-Check setup, AI subtitle, sugar signal, and opening-hours fallback.
- Replaced decorative orb treatment with a calmer warm app layout using existing theme tokens.

Not done in Stage 2:
- Story detail viewer and story progress logic.
- Real Fit-Check completion detection from profile preferences.
- PWA install banner and platform-specific install handling.
- Avatar compact mini-menu.

Plan:
- Continue with Stage 3 from `docs/vault/plans/2026-05-25-home-screen-pilot-upgrade-plan.md`.
