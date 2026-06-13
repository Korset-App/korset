---
title: EAN Stage 7D Manual Alias UI
domain: changelog
status: complete-local
date: 2026-06-13
language: ru
---

# EAN Stage 7D Manual Alias UI

## Context

Stage 7C added the server-side `create-manual-alias-candidate` action. Stage 7D wires this into the existing `/retail/:storeSlug/ean-recovery` screen so an admin can create a review candidate from a manually entered/scanned EAN without changing product primary EAN fields.

## Changes

- Added `buildManualAliasCandidateRequest()` to `src/domain/product/eanAliases.js`.
- Added a TDD unit contract for manual candidate request payloads in `tests/unit/eanAliasModel.test.mjs`.
- In `EanRecoveryScreen.jsx`, the existing fake-EAN product edit row now shows an admin-only `В review` / `Review-ге` action beside the existing save button.
- The new action calls `create-manual-alias-candidate`, refreshes trusted alias candidates, and shows a success/error message.
- RU/KZ i18n keys were added for candidate creation, duplicate, invalid EAN, failure, and success states.

## Safety

- The UI action creates only `review` candidates; it does not promote to `trusted`.
- It does not mutate `global_products.ean`, `global_products.alternate_eans`, `store_products.ean`, price, stock, or product facts.
- Existing direct `update-ean` action remains unchanged for now; use the new `В review` action for safer trusted-alias workflow.
- No live UI action or Supabase write was executed in this session.

## Verification

- TDD red was observed: `node --test tests/unit/eanAliasModel.test.mjs` failed before `buildManualAliasCandidateRequest()` was exported.
- `node --test tests/unit/eanAliasModel.test.mjs` — 14/14 passed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs tests/unit/productScanContainment.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/legacyEanScriptGuard.test.mjs` — 32/32 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint src/domain/product/eanAliases.js src/screens/EanRecoveryScreen.jsx api/ean-recovery.js tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 0 errors, existing `react-hooks/set-state-in-effect` warnings remain in `EanRecoveryScreen.jsx`.

## Next

Run a controlled live admin smoke with one verified package only: create review candidate, confirm it appears in the candidate block, then promote through typed confirmation if the package/SKU truly matches. Do not bulk-promote legacy evidence.
