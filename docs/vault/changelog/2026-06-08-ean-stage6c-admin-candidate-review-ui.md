---
title: EAN Stage 6C-C Admin Candidate Review UI
domain: changelog
status: complete-local
date: 2026-06-08
language: ru
---

# EAN Stage 6C-C Admin Candidate Review UI

## Context

Stage 6C-B added an admin-only server action for trusted alias promotion, but no UI exposed it. Stage 6C-C adds a read-only admin candidate view in `/retail/:storeSlug/ean-recovery` so the owner/admin can inspect why candidates are blocked or need server checks before any promotion button exists.

## Scope

- Added `normalizeTrustedAliasReviewCandidate()` in `src/domain/product/eanAliases.js`.
- Expanded `tests/unit/eanAliasModel.test.mjs` for read-only candidate normalization.
- Added an admin-only, read-only “Trusted EAN candidates” block in `src/screens/EanRecoveryScreen.jsx`.
- Added RU/KZ i18n keys under `retail.eanRecovery.alias*`.

## UI Behavior

- Visible only when `useAuth().isAdmin` is true.
- Loads up to 20 active `review` rows from `product_ean_aliases`.
- Shows up to 6 latest candidates in the card.
- Shows product name/brand, candidate EAN, target product id, source, confidence, and block reasons.
- Uses explicit Supabase relationship `global_products!product_ean_aliases_global_product_id_fkey(...)` for live compatibility.
- Labels locally passable candidates as “needs server-check”; they are not promoted from the UI.

## Safety

- No promotion button was added.
- No API promotion call from UI.
- No `product_ean_aliases` writes.
- No trusted aliases created.
- No broad alternate resolution.
- Retail owners do not see the trusted candidate block unless they are also admin.

## Verification

- TDD red: `node --test tests/unit/eanAliasModel.test.mjs` failed before `normalizeTrustedAliasReviewCandidate()` existed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 14/14 passed.
- Broader EAN/correction unit set — 29/29 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint src/domain/product/eanAliases.js src/screens/EanRecoveryScreen.jsx` — 0 errors, existing `set-state-in-effect` warnings remain in `EanRecoveryScreen.jsx`.
- `npm run build` — passed with existing Vite/Sentry warnings.
- Live candidate query with explicit FK returned 3 sample rows successfully.
- Live alias count remained total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.

## Next

Stage 6C-D can add an explicit admin-only confirmation flow that calls `promote-ean-alias-trusted`, but only for candidates that the UI marks as requiring server check and after the reviewer confirms same SKU/package manually.
