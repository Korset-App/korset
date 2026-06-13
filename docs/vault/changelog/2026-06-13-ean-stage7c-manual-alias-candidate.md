---
title: EAN Stage 7C Manual Alias Candidate
domain: changelog
status: complete-local
date: 2026-06-13
language: ru
---

# EAN Stage 7C Manual Alias Candidate

## Context

After Stage 4 moved buyer scan resolution to exact primary EAN plus `trusted` aliases only, live `trusted` coverage remained `0`. Stage 7C adds the first clean exact-evidence insert path into `product_ean_aliases` without reviving legacy `global_products.alternate_eans`.

## Changes

- Added `handleManualAliasCandidateCreate()` to `api/ean-recovery.js`.
- Added API action `create-manual-alias-candidate`.
- The action is admin-only and server-side service-role only after JWT/admin verification.
- It creates a `product_ean_aliases` row with:
  - `status = review`;
  - `source = manual_admin`;
  - `confidence = 95`;
  - `evidence_json.reviewerConfirmedSameSku = true`;
  - `created_by_auth_id` set to the admin user.
- Before insert, the server checks the target product exists, the EAN is scannable, and the EAN is not already another active product primary EAN or trusted for another product.

## Safety

- No live candidate was inserted in this session.
- No alias is automatically promoted to `trusted`.
- No `global_products.ean`, `global_products.alternate_eans`, `store_products.ean`, or product facts are mutated.
- Retail owners cannot create manual alias candidates unless they are admins.

## Verification

- TDD red was observed before implementation: `tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` failed because `api/ean-recovery.js` did not export `handleManualAliasCandidateCreate`.
- `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 7/7 passed.
- `node --test tests/unit/productScanContainment.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/legacyEanScriptGuard.test.mjs` — 31/31 passed.
- `node --check api/ean-recovery.js` — passed.
- `npx eslint api/ean-recovery.js src/domain/product/eanAliases.js tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — passed with no output.

## Next

Add a UI affordance or controlled admin workflow to call `create-manual-alias-candidate` from real manual review, then promote only verified candidates through the existing typed confirmation flow. Do not bulk-promote legacy evidence.
