---
title: EAN Stage 6C-D Typed Promotion Confirmation
domain: changelog
status: complete-local
date: 2026-06-09
language: ru
---

# EAN Stage 6C-D Typed Promotion Confirmation

## Context

Stage 6C-C exposed admin-only trusted EAN candidates in read-only mode. Stage 6C-D adds the first UI path that can call the existing `promote-ean-alias-trusted` API, but only behind explicit admin-only typed confirmation.

## Scope

- Added `buildTrustedAliasTypedConfirmation()` in `src/domain/product/eanAliases.js`.
- Expanded `tests/unit/eanAliasModel.test.mjs` with TDD coverage for last-4-EAN confirmation.
- Updated `/retail/:storeSlug/ean-recovery` trusted candidate UI:
  - promotion action is visible only inside the existing admin-only block;
  - action is rendered only when `candidate.canRequestPromotion === true`;
  - modal requires manual same-product/same-package review and typed last 4 EAN digits;
  - API call is made only after typed confirmation matches.
- Added RU/KZ i18n keys for the confirmation flow.

## Safety

- No bulk promotion was added.
- Retail owners do not receive a promotion button unless they are also admin.
- Legacy/broad-source rows remain blocked by `canRequestPromotion=false` and server guardrails.
- No `global_products.alternate_eans` deletion or mutation.
- No broad alternate resolution.
- No live promotion was executed because no separately verified safe real candidate was selected in this session.
- Live count after verification remained total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.

## Verification

- TDD red: `node --test tests/unit/eanAliasModel.test.mjs` failed before `buildTrustedAliasTypedConfirmation()` existed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 16/16 passed.
- Broader EAN/correction unit set — 36/36 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint src/domain/product/eanAliases.js src/screens/EanRecoveryScreen.jsx` — 0 errors; existing `set-state-in-effect` warnings remain in `EanRecoveryScreen.jsx`.
- `npm run build` — passed with existing Vite/Sentry warnings.
- Live alias count check — total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.

## Next

Only run a live trusted promotion after selecting a separately verified safe candidate with real package/SKU evidence. If no safe candidate exists, continue with mocked/unit-tested UI and Stage 7 parser/import hardening.
