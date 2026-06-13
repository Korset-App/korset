---
title: EAN Stage 6B Review Actions Plan
domain: plans
status: complete
date: 2026-06-08
language: ru
---

# EAN Stage 6B Review Actions Plan

## Goal

Add the first safe mutation layer for shopper correction reports without touching trusted aliases, legacy `alternate_eans`, or product identity data.

## Scope

Stage 6B allows only status transitions on `product_correction_events`:

- `new` -> `reviewing`
- `new` -> `fixed`
- `new` -> `rejected`
- `new` -> `duplicate`
- `reviewing` -> `fixed`
- `reviewing` -> `rejected`
- `reviewing` -> `duplicate`

No reopening in this slice. No notes/photos in this slice.

## Guardrails

- Do not write to `product_ean_aliases`.
- Do not create or promote `trusted` aliases.
- Do not update `global_products.alternate_eans`.
- Do not re-enable broad alternate scan resolution.
- Do not update product EAN/name/price from correction report actions.
- Product mutation actions in `/api/ean-recovery` stay admin-only.
- Correction status actions may be executed by admin or by the owner of the report's `store_id` only.
- Use service-role only server-side after JWT verification and explicit owner/admin checks.

## Implementation Slice

Files:

- `src/domain/product/correctionReview.js`: transition validation and update payload builder.
- `tests/unit/productCorrectionReview.test.mjs`: TDD coverage for allowed/blocked transitions and payload shape.
- `api/ean-recovery.js`: add `update-correction-status` action with owner/admin authorization.
- `src/screens/EanRecoveryScreen.jsx`: add status buttons on open report rows and refresh the inbox after successful action.
- `src/locales/ru/retail.json`, `src/locales/kz/retail.json`: labels for actions and errors.

## Verification

- Red/green unit tests for transition rules.
- Targeted ESLint for touched files.
- i18n check.
- Build.
- Live smoke only if at least one safe test row exists or after creating/deleting a clearly marked smoke row with service role.

## Stop Line

Stop before adding trusted alias promotion. Stage 6C must separately design conflict checks and evidence requirements.

## Completion Notes

Stage 6B was completed locally on 2026-06-08.

Implemented:

- Status transition helpers in `src/domain/product/correctionReview.js`.
- Server-side `update-correction-status` in `api/ean-recovery.js`.
- Owner/admin authorization for correction status updates.
- Status buttons in `/retail/:storeSlug/ean-recovery`.
- RU/KZ action labels.

Verification:

- Targeted EAN/correction unit tests: 24/24 passed.
- API syntax check passed.
- Targeted ESLint: 0 errors, existing `EanRecoveryScreen.jsx` warnings only.
- i18n check passed.
- docs check passed.
- build passed with existing warnings.
- Live DB smoke inserted, updated, and deleted a temporary Stage 6B correction event row.
