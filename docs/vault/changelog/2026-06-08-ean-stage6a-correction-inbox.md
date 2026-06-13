---
title: EAN Stage 6A Correction Inbox
domain: changelog
status: complete-local
date: 2026-06-08
language: ru
---

# EAN Stage 6A Correction Inbox

## Context

After Stage 5A, shoppers can submit metadata-only product correction reports into `product_correction_events`. Stage 6A starts admin/review tooling carefully, without allowing trusted alias promotion or broad alternate resolution.

## Scope

Stage 6A is intentionally read-only:

- show open shopper correction reports inside `/retail/:storeSlug/ean-recovery`;
- normalize report metadata through a small domain helper;
- show summary counts for open reports, identity/EAN issues, and product data issues;
- show latest report rows with EAN, shown EAN, reason, product name, comment, and timestamp;
- keep all review actions deferred.

## Changes

- Added `src/domain/product/correctionReview.js`.
- Added `tests/unit/productCorrectionReview.test.mjs`.
- Updated `src/screens/EanRecoveryScreen.jsx` to load open `product_correction_events` for the current store and render a read-only inbox card.
- Added RU/KZ i18n keys under `retail.eanRecovery.*`.

## Safety

- No `product_ean_aliases` writes.
- No `trusted` promotion.
- No broad `alternate_eans` resolution.
- No status update buttons yet.
- No photo upload/storage.
- Public users still cannot read correction reports; retail access relies on existing `RetailLayout` owner/admin guard plus Supabase RLS.

## Verification

- TDD red was verified first: `node --test tests/unit/productCorrectionReview.test.mjs` failed with `ERR_MODULE_NOT_FOUND` before implementation.
- `node --test tests/unit/productCorrectionReview.test.mjs` — 2/2 passed after implementation.
- `node --test tests/unit/productCorrectionReview.test.mjs tests/unit/productCorrectionReports.test.mjs` — 6/6 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint src/domain/product/correctionReview.js src/screens/EanRecoveryScreen.jsx` — 0 errors, existing `set-state-in-effect` warnings in `EanRecoveryScreen.jsx` remain.
- Live data sanity with service role: open correction reports are currently 0 for `mars`, `nurly`, and `kalina`.

## Next

Stage 6B should design review actions before implementation. Do not add “promote trusted” buttons until hard conflict checks and audit evidence requirements are defined and tested.
