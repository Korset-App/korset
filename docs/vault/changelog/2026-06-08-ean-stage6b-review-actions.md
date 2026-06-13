---
title: EAN Stage 6B Review Actions
domain: changelog
status: complete-local
date: 2026-06-08
language: ru
---

# EAN Stage 6B Review Actions

## Context

Stage 6A made shopper correction reports visible in `/retail/:storeSlug/ean-recovery` as a read-only inbox. Stage 6B adds the first safe mutation layer: report status transitions only.

## Scope

Allowed status transitions:

- `new` -> `reviewing`
- `new` -> `fixed`
- `new` -> `rejected`
- `new` -> `duplicate`
- `reviewing` -> `fixed`
- `reviewing` -> `rejected`
- `reviewing` -> `duplicate`

No reopening, notes, photos, alias writes, or product data updates were added in this slice.

## Changes

- Added transition helpers in `src/domain/product/correctionReview.js`:
  - `canTransitionProductCorrectionStatus()`;
  - `buildProductCorrectionStatusUpdate()`.
- Expanded `tests/unit/productCorrectionReview.test.mjs` for transition rules and metadata-only update payloads.
- Added `tests/unit/eanRecoveryApiCorrectionStatus.test.mjs` for server-side owner/admin correction status authorization.
- Updated `api/ean-recovery.js` with `update-correction-status`:
  - product mutation actions remain admin-only;
  - correction status update is allowed for admin or the owner of the report's `store_id`;
  - update writes only `status`, `reviewed_by_auth_id`, `reviewed_at`, and `resolution_json`.
- Updated `src/screens/EanRecoveryScreen.jsx` with status buttons: `reviewing`, `fixed`, `rejected`, `duplicate`.
- Added RU/KZ i18n action labels.

## Safety

- No writes to `product_ean_aliases`.
- No `trusted` alias promotion.
- No changes to `global_products.alternate_eans`.
- No broad alternate scan resolution.
- No product EAN/name/price updates from correction report actions.
- Service-role usage is server-side only after JWT verification and explicit admin/store-owner check.

## Verification

- TDD red for transition helpers: `node --test tests/unit/productCorrectionReview.test.mjs` failed before helper exports were implemented.
- `node --test tests/unit/eanRecoveryApiCorrectionStatus.test.mjs tests/unit/productCorrectionReview.test.mjs tests/unit/productCorrectionReports.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/productScanContainment.test.mjs` — 24/24 passed.
- `node --check api/ean-recovery.js` — passed.
- `npx eslint src/domain/product/correctionReview.js src/screens/EanRecoveryScreen.jsx api/ean-recovery.js` — 0 errors, existing `set-state-in-effect` warnings remain in `EanRecoveryScreen.jsx`.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npm run check:agent:docs` — PASS.
- `npm run build` — passed with existing Vite/Sentry warnings.
- Live DB smoke: temporary `product_correction_events` row for `mars` was inserted with service role, updated `new -> rejected` using the Stage 6B payload and real store `owner_id`, then deleted (`cleanupDeleted: 1`).

## Next

Stage 6C must design trusted-alias candidate review separately. Do not add alias promotion until conflict checks, evidence requirements, and rollback behavior are specified and tested.
