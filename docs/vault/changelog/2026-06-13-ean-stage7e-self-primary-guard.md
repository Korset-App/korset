---
title: EAN Stage 7E Self Primary Guard
domain: changelog
status: complete-local
date: 2026-06-13
language: ru
---

# EAN Stage 7E Self Primary Guard

## Context

Stage 7C/7D added manual `review` candidate creation for exact EAN evidence. A remaining low-risk gap allowed creating an alias candidate when the entered EAN was already the target product's active primary EAN. That would not create a false scan match, but it would pollute the review queue with redundant rows.

## Changes

- `handleManualAliasCandidateCreate()` in `api/ean-recovery.js` now blocks same-product primary EAN duplicates with reason `ean_already_primary_for_same_product`.
- RU/KZ i18n labels were added for this block reason.
- `tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` now covers the self-primary block.

## Safety

- No live write was run.
- No product data is mutated.
- Cross-product primary EAN conflicts remain blocked as before.
- Same-product primary EAN duplicates are now blocked before insert.

## Verification

- TDD red was observed: `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` failed with `200 !== 400` before the guard was added.
- `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 8/8 passed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs tests/unit/productScanContainment.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/legacyEanScriptGuard.test.mjs` — 33/33 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint api/ean-recovery.js tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — passed with no output.

## Next

The next step remains a controlled live admin smoke with one verified package only. Create a `review` candidate only for an EAN that is not already the same product primary EAN, then promote only after manual same-SKU/package verification.
