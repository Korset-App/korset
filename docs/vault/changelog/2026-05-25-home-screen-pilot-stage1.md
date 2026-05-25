# 2026-05-25 — HomeScreen Pilot Upgrade Stage 1

Stage 1 implements the store data foundation for the staged HomeScreen pilot upgrade.

Changes:
- Added local migration `042_add_store_opening_hours.sql` for `public.stores.opening_hours`.
- Added `opening_hours` to `buildRetailStoreSettingsPayload()` with the same whitespace cleanup pattern as other store profile fields.
- Added Retail Settings input and RU/KZ labels so store owners can maintain opening hours.
- Added a targeted unit assertion for `opening_hours` payload cleanup.

Not done in Stage 1:
- HomeScreen visual rebuild.
- Stories, avatar mini-menu, Fit-Check gate, and PWA install UI.
- Browser/mobile smoke QA.

Plan:
- Continue from `docs/vault/plans/2026-05-25-home-screen-pilot-upgrade-plan.md`, Stage 2.
