---
title: Product EAN Integrity Recovery Plan
domain: plans
status: active
date: 2026-06-01
language: ru
---

# Product EAN Integrity Recovery Plan

## Context

Live scan testing exposed wrong product resolution: scanning a concrete package can open a similar product from the same brand but with another package, weight, fat percentage, or price. Examples reported by the owner include 3 Желания mayonnaise and milk 3.2% resolving as a different milk/fat variant.

No live data was changed during the initial investigation.

## Initial Evidence

Read-only Supabase audit on 2026-06-01 found:

- Active `global_products`: 13,101.
- Active `store_products`: 17,601.
- Active products with `alternate_eans`: 9,429.
- Total stored `alternate_eans`: 146,805.
- Products with more than 5 alternate EANs: 7,346.
- Products with more than 10 alternate EANs: 6,323.
- Alternate EAN codes used by multiple active products: 26,024.
- Alternate EAN codes that are also another active product's primary `ean`: 5,569.
- Active fake primary EANs (`arbuz_`, `kaspi_`, `korzinavdom_`): 2,009.
- `store_products.ean` vs `global_products.ean` mismatches: 0.

Full audit script: `scripts/audit-ean-integrity.mjs`.
Latest report: `C:\tmp\korset-ean-integrity-audit.json`.

Full read-only audit results:

- Active `global_products`: 13,101.
- Products with `alternate_eans`: 9,429.
- Total alias relations: 146,805.
- Unique alias codes: 54,950.
- Critical alias relations: 119,567 (81.4%).
- Suspicious alias relations: 25,754 (17.5%).
- Review alias relations: 1,383 (0.9%).
- Provisionally safe alias relations: 101 (0.1%).
- Estimated severity: 10/10.

Top conflict flags:

- `owner_has_many_alternates`: 135,320.
- `alias_used_by_multiple_products`: 117,879.
- `restricted_or_weight_scale_alias`: 57,684.
- `alias_is_another_primary_ean`: 33,780.
- `quantity_mismatch`: 19,945.
- `low_name_similarity`: 11,746.
- `subcategory_mismatch`: 10,041.
- `brand_mismatch`: 5,757.
- `category_mismatch`: 5,170.
- `flavor_variant_mismatch`: 2,463.
- `quantity_unit_type_mismatch`: 2,200.
- `fat_percent_mismatch`: 1,738.

High-risk groups:

- Dairy/milk: 2,590 products, 29,046 alias relations, 24,145 critical alias relations, 6,869 primary-EAN conflicts.
- Sauces/mayonnaise: 587 products, 8,587 alias relations, 7,399 critical alias relations, 2,546 primary-EAN conflicts.
- Baby products: 108 products, 1,107 alias relations, 846 critical alias relations, 208 primary-EAN conflicts.
- Sweets: 1,647 products, 16,490 alias relations, 13,787 critical alias relations, 4,064 primary-EAN conflicts.

Store impact from the full audit:

- `mars`: 13,101 active store products, 54,950 alias codes, 26,024 duplicate alias codes, 7,305 same-store primary conflicts, 0 outside-store primary conflicts.
- `nurly`: 2,500 active store products, 17,695 alias codes, 5,096 duplicate alias codes, 887 same-store primary conflicts, 2,294 outside-store primary conflicts.
- `kalina`: 2,000 active store products, 15,157 alias codes, 3,644 duplicate alias codes, 605 same-store primary conflicts, 2,256 outside-store primary conflicts.

Store-specific risk:

- `nurly`: 2,500 active products; 5,096 duplicate alternate codes inside store catalog; 2,294 alternate codes point to a primary product not in that store catalog.
- `kalina`: 2,000 active products; 3,644 duplicate alternate codes inside store catalog; 2,256 alternate codes point to a primary product not in that store catalog.
- `mars`: 13,101 active products; 26,024 duplicate alternate codes; 7,305 alternate codes are also primary products in the same store catalog. Exact primary match currently protects many scans in Mars, but the alternate layer remains polluted.

## Likely Root Cause

`scripts/arbuz-subcategory-parser.cjs` uses `npcSearchByName()` when Arbuz has no barcode. That function:

- strips quantity from the name;
- keeps only broad name/brand tokens;
- queries National Catalog search;
- accepts up to several result GTINs;
- stores the first as primary EAN and the rest as `alternate_eans` without verifying exact package identity.

This turns search results for a brand/product family into alternate barcodes for a single SKU. For grocery scanning, this is unsafe: different package, flavor, fat percentage, and weight must be separate products, not alternates.

## Current Resolution Risk

`src/domain/product/resolver.js` and `supabase/migrations/026_fn_resolve_product.sql` resolve scans by:

1. exact `global_products.ean` in the current store catalog;
2. exact `store_products.ean`;
3. `global_products.alternate_eans` containing the scanned EAN;
4. global exact/alternate fallback.

If the exact product is not in the current store catalog, a polluted alternate match can return another store product before the global exact product. This explains same-brand wrong package/weight/fat substitutions.

## Recovery Direction

Recommended direction before any live writes:

1. Temporarily stop trusting `alternate_eans` for buyer scan resolution, or only use alternates that pass a strict confidence gate.
2. Quarantine current `alternate_eans` as untrusted evidence, not as scan-match truth.
3. Build a read-only audit report that classifies every alternate EAN into safe, conflict, duplicate, restricted/weighted, fake-source, and review buckets.
4. Rebuild alternate relationships only when identity is strong: exact package identity by EAN source, same brand, same normalized name core, same quantity/unit, same fat/flavor/package where applicable, and no collision with another primary product.
5. Add DB constraints or a dedicated mapping table so one scannable EAN cannot silently belong to multiple active product identities.
6. Re-run store scan QA with real owner-provided barcodes before re-enabling broad alternate matching.

## Important Principle

For V1 grocery scanning, false unknown is safer than false product. If confidence is not high, the app should show unknown-EAN flow or exact global product without store price, not a wrong same-brand product with a misleading price and Fit-Check.

## Owner Alignment

The owner confirmed that alternate barcodes are strategically important and should not be removed wholesale. Correct direction: keep multi-EAN support, but move from uncontrolled `alternate_eans` to a professional trusted-alias system with quarantine/review states and one trusted active product per scannable EAN.

## Stage-By-Stage Implementation Plan

### Stage 0 — Evidence Baseline (Done)

Goal: prove the scale and root cause before touching production behavior.

Status: complete.

Artifacts:

- `scripts/audit-ean-integrity.mjs`
- `C:\tmp\korset-ean-integrity-audit.json`

Verification already run:

- `node scripts/audit-ean-integrity.mjs`
- `node --check scripts/audit-ean-integrity.mjs`
- `npm run check:agent:docs`
- `npm run memory:save`

Exit criteria:

- We have a measurable baseline for critical/suspicious/review/provisionally-safe aliases.
- We know the current estimated severity is 10/10.

### Stage 1 — Buyer Scan Containment

Goal: stop false-positive scan results before changing the database model.

Status: complete locally on 2026-06-01. No live Supabase data or function was changed in this stage.

Why first: false product is the most damaging user-facing failure. This stage prioritizes not lying to the shopper over broad recognition.

Expected behavior after Stage 1:

- Buyer scan trusts exact primary EAN matches.
- Buyer scan does not use polluted `global_products.alternate_eans` as authoritative product identity.
- If an EAN cannot be resolved exactly in the current safe path, it goes to unknown/correction flow instead of showing a similar wrong product.
- Existing `alternate_eans` stay in the database untouched for later quarantine/rebuild.

Likely files:

- `src/domain/product/resolver.js`
- `supabase/migrations/026_fn_resolve_product.sql` or a new replacement migration for `fn_resolve_product_by_ean`
- `tests/unit/` targeted resolver/RPC contract tests where feasible
- `docs/vault/plans/2026-06-01-product-ean-integrity-recovery-plan.md`

Important implementation rule:

- Do not delete `alternate_eans`.
- Do not mutate product data.
- Only stop unsafe alternates from controlling buyer scan resolution.

Verification gate:

- Targeted unit tests for exact EAN vs alternate conflict behavior.
- `npm run check:agent` if only JS changes.
- Supabase SQL dry review before any migration is applied.

Stop point:

- Ask owner before applying any live database function migration.

### Stage 2 — Trusted Alias Data Model

Goal: create a professional EAN alias system with status, source, confidence, and evidence.

Status: complete locally on 2026-06-01. Migration created but not applied to live Supabase.

Expected model:

- `product_ean_aliases.ean`
- `product_ean_aliases.global_product_id`
- `product_ean_aliases.status`: `trusted`, `review`, `quarantined`, `rejected`
- `product_ean_aliases.source`: `store_import`, `manual_admin`, `audit_scan`, `external_exact_barcode`, `npc_search`, `legacy_alternate_eans`, etc.
- `product_ean_aliases.confidence`
- `product_ean_aliases.evidence_json`
- `product_ean_aliases.created_at`, `updated_at`, `reviewed_at`, `reviewed_by`

Core invariant:

- One scannable EAN can have at most one active `trusted` product mapping.

Likely files:

- New Supabase migration under `supabase/migrations/`
- Possibly `src/domain/product/eanAliasModel.js` for shared status constants
- `docs/vault/architecture/product-resolution.md` or this recovery plan

Security/RLS requirement:

- Public buyer resolution can read only trusted alias mappings through controlled RPC, not arbitrary review/quarantine data.
- Writes/reviews require service role or admin/retail-owner controlled paths.

Verification gate:

- SQL review for constraints and indexes.
- Supabase advisor/relevant checks where available.
- `npm run check:agent:docs` for migration/script syntax checks.

Stop point:

- Do not apply live schema without explicit owner approval.

### Stage 2 Completion Notes

Implemented locally:

- `src/domain/product/eanAliases.js` defines the shared JS contract for alias statuses, sources, scannable EAN validation, and buyer-resolution eligibility.
- `tests/unit/eanAliasModel.test.mjs` covers the JS contract and expected buyer-resolution guard.
- `supabase/migrations/047_product_ean_aliases.sql` creates `public.product_ean_aliases` with:
  - `status`: `trusted`, `review`, `quarantined`, `rejected`;
  - `source`: `global_primary`, `store_import`, `manual_admin`, `audit_scan`, `shopper_report`, `external_exact_barcode`, `npc_search`, `legacy_alternate_eans`, `arbuz_barcode`, `arbuz_search`, `kaspi`, `korzinavdom`, `openfoodfacts`, `unknown`;
  - `confidence` 0-100;
  - `evidence_json` object;
  - `is_active` for retiring historical rows;
  - optional `created_by_auth_id`, `reviewed_by_auth_id`, `reviewed_at`;
  - updated-at trigger.
- Core DB invariant: one active trusted mapping per scannable EAN via partial unique index `product_ean_aliases_one_trusted_active_ean_key`.
- RLS: no anon/public table access; authenticated access is admin-only through `public.is_admin_user(auth.uid())`; `service_role` gets full table privileges.

Verification:

- `node --test tests/unit/eanAliasModel.test.mjs` — 4/4 passed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/productScanContainment.test.mjs` — 8/8 passed.
- `npx eslint src/domain/product/eanAliases.js` — passed with no output.
- `node --check scripts/audit-ean-integrity.mjs` — passed with no output.
- `npm run check:agent:docs` — passed.

Verification limitation:

- `npx supabase migration list --local` was attempted, but the Supabase CLI failed to parse the current `.env.local` (`unexpected character '-' in variable name`). The migration was not applied. Before live DB apply, either run the SQL through Supabase SQL Editor or fix/override the local env parsing issue and rerun Supabase CLI verification.

Next recommended step: review and approve the Stage 2 SQL for live apply, then proceed to Stage 3 dry-run migration/classification of legacy `alternate_eans`.

### Stage 3 — Legacy Alias Quarantine And Classification

Goal: migrate current `alternate_eans` into a controlled review/quarantine system without losing evidence.

Status: dry-run complete on 2026-06-08. No live writes were made.

Expected behavior:

- Current `alternate_eans` are treated as legacy evidence, not trusted truth.
- Conflicting aliases become `quarantined` or `rejected`.
- Weak but non-conflicting aliases become `review`.
- Only extremely strong candidates may become `trusted`, and only if the one-EAN-one-product invariant holds.

Likely files:

- New script: `scripts/migrate-legacy-ean-aliases.mjs`
- Existing audit helper reuse: `scripts/audit-ean-integrity.mjs`
- New report output: `C:\tmp\korset-ean-alias-migration-plan.json`

Required script behavior:

- Default mode is dry-run.
- `--live` is required for writes.
- Writes are batched.
- Script prints exact counts by status.
- Script never deletes `global_products.alternate_eans` in this stage.

Verification gate:

- Dry-run report reviewed before writes.
- Live run only after owner approval.
- Re-run `node scripts/audit-ean-integrity.mjs` after migration and compare baseline.

Stop point:

- Owner reviews dry-run status counts before any write.

### Stage 3 Dry-Run Results

Artifacts:

- Script: `scripts/migrate-legacy-ean-aliases.mjs`.
- Pure classifier: `src/domain/product/eanAliasClassification.js`.
- Tests: `tests/unit/eanAliasClassification.test.mjs`.
- Summary report: `C:\tmp\korset-ean-alias-migration-dry-run.json`.
- Candidate JSONL: `C:\tmp\korset-ean-alias-candidates.jsonl`.

Live DB safety check:

- `product_ean_aliases` existed before dry-run and had 0 rows.
- After dry-run, `product_ean_aliases` still had 0 rows.

Dry-run classification:

- Active products scanned: 13,101.
- Products with alternates: 9,429.
- Legacy alias relations: 146,805.
- Unique alias codes: 54,950.
- Insertable candidate rows: 144,860 (98.7%).
- Skipped rows: 1,945 (1.3%).
- `quarantined`: 118,086 (80.4%).
- `review`: 26,774 (18.2%).
- `rejected`/skipped: 1,945 (1.3%).
- `trusted`: 0 by design, because legacy aliases lack per-alias evidence.

Top flags:

- `legacy_without_per_alias_evidence`: 146,805.
- `alias_used_by_multiple_products`: 116,437.
- `alias_is_another_primary_ean`: 33,741.
- `quantity_mismatch`: 19,628.
- `subcategory_mismatch`: 10,040.
- `brand_mismatch`: 5,755.
- `category_mismatch`: 5,170.
- `quantity_unit_type_mismatch`: 2,194.
- `self_alias`: 1,736.
- `non_scannable_alias`: 209.

Important interpretation:

- The dry-run confirms the conservative policy is correct: legacy `alternate_eans` should not be bulk-promoted to trusted aliases.
- A future live insert should likely insert `review` and `quarantined` rows as evidence/review queue, not buyer-resolvable trusted rows.
- Trusted aliases should be created only from stronger evidence sources: store import, manual admin review, audit scan with evidence, or exact external barcode lookup.

### Stage 3B Live Evidence Insert Results

Status: complete on 2026-06-08.

Goal: insert legacy `alternate_eans` as non-buyer-resolvable evidence rows only. No `trusted` rows were inserted.

Live safety behavior:

- Script: `scripts/migrate-legacy-ean-aliases.mjs --live`.
- The script refuses to write if any legacy candidate becomes `trusted`.
- Only `review` and `quarantined` rows are inserted.
- Existing rows are skipped by default to avoid slow per-row updates; `--update-existing` exists but was not used for the final full insert.
- Buyer scan behavior is unchanged because Stage 4 trusted-alias resolver has not been implemented and `trusted=0`.

Live execution notes:

- A small smoke insert with `--limit-products=10` inserted 21 `review` rows successfully.
- First full insert attempt stopped safely on the DB unique constraint because legacy data produced duplicate candidate pairs. The writer was fixed to dedupe candidates by `ean::global_product_id` before writing.
- A second run with per-row update behavior timed out while trying to update existing rows; the writer was switched to skip existing rows by default.
- Final full insert completed successfully.

Final live counts:

- Total `product_ean_aliases`: 144,856.
- `trusted`: 0.
- `review`: 26,771.
- `quarantined`: 118,085.
- `rejected`: 0.

Artifacts:

- Live report: `C:\tmp\korset-ean-alias-live-insert.json`.
- Live candidate JSONL: `C:\tmp\korset-ean-alias-live-candidates.jsonl`.

Important interpretation:

- Stage 3B created a controlled evidence/review layer; it did not restore buyer-visible alternate matching.
- The large `quarantined` count confirms old `alternate_eans` are not safe as scan truth.
- Next trusted aliases should come from stronger evidence workflows, not from blind promotion of this legacy evidence.

### Stage 4 — Resolver Switch To Trusted Aliases

Goal: make product resolution use exact primary EAN plus trusted aliases only.

Expected behavior:

- Exact `global_products.ean` remains the strongest match.
- Exact `store_products.ean` remains valid for store overlays.
- Trusted alias can resolve to product.
- Review/quarantine/rejected aliases cannot resolve buyer-visible product cards.
- Scan result can include diagnostic metadata internally: `matchType = primary_ean | store_ean | trusted_alias | unknown`.

Likely files:

- New Supabase migration replacing `fn_resolve_product_by_ean`
- `src/domain/product/resolver.js`
- `src/utils/offlineDB.js` if offline alias behavior needs a safe key strategy
- Unit tests for resolver normalization and match precedence

Verification gate:

- Targeted resolver tests.
- Manual smoke for `/s/mars/scan` with known exact EAN.
- Manual smoke for known conflict EAN: should not show wrong product.
- `npm run check:agent` or stronger if UI touched.

Stop point:

- Compare false-product risk against the audit baseline before moving on.

### Stage 5 — User-Facing Error Reporting

Goal: convert real scan/card mistakes into structured correction events.

Status: Stage 5A complete on 2026-06-08. Migration 048 was applied to live Supabase by the owner and live smoke submit passed.

Two user-facing entry points:

- Post-scan/card action: “Неверный товар”.
- Product card action: “Сообщить об ошибке”.

Correction reasons:

- wrong_product
- wrong_weight_or_volume
- wrong_fat_percent
- wrong_flavor
- wrong_package
- wrong_brand
- wrong_price
- wrong_stock
- wrong_ingredients
- wrong_allergens
- wrong_halal
- wrong_nutrition
- wrong_image
- other

Likely files:

- New Supabase migration for correction events/table.
- `src/screens/ProductScreen.jsx`
- `src/screens/ScanScreen.jsx` or scan result component after locating exact file.
- `src/locales/ru/*.json`, `src/locales/kz/*.json`
- New domain helper for correction payloads.

Privacy/security requirement:

- Do not store raw allergy profile, user messages, or unnecessary PII.
- Store EAN, shown product id, store id, reason, optional comment, optional image metadata/path only if approved.

Verification gate:

- i18n check: `node scripts/check-i18n.mjs`.
- UI/unit smoke for submit payload shape.
- RLS/service-role review before live writes.

Stop point:

- Ask owner before adding photo upload/storage behavior.

### Stage 5A Completion Notes

Implemented locally:

- `src/domain/product/correctionReports.js` defines metadata-only correction report payloads.
- `tests/unit/productCorrectionReports.test.mjs` covers allowed reasons, payload shape, no profile/allergen/ingredient persistence, comment/name truncation, and client-token/EAN requirements.
- `supabase/migrations/048_product_correction_events.sql` creates `public.product_correction_events` with RLS and metadata-only constraints.
- `ProductScreen.jsx` now has a compact “Сообщить об ошибке” action and modal with correction reasons, optional short comment, and client-side submit helper.
- RU/KZ i18n keys were added under `product.report.*`.

Privacy/security contract:

- Stage 5A stores EAN, shown product ids/EAN, store id, reason, context, optional <=500 char comment, client token, and small metadata (`shownProductName`).
- It does not store shopper profile, allergens, ingredients, AI messages, email, phone, IP, or photos.
- Photo upload/storage is explicitly deferred.

Verification:

- `node --test tests/unit/productCorrectionReports.test.mjs` — 4/4 passed.
- `node --test tests/unit/productCorrectionReports.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/productScanContainment.test.mjs` — 17/17 passed.
- `node scripts/check-i18n.mjs` — PASS, all KZ keys present.
- `npx eslint src/domain/product/correctionReports.js src/screens/ProductScreen.jsx` — passed with no output.
- `npm run check:agent:docs` — PASS.
- `npm run build` — passed with existing Vite/Sentry warnings.
- Live smoke after owner-applied migration 048: domain helper submit through anon key returned `{ ok: true }`; smoke row cleanup deleted 1 row.

Live note:

- `product_correction_events` is present in live Supabase. Anonymous insert without readback works; anonymous `insert().select()` is intentionally blocked because public users do not have read access to the correction queue.

Next required action:

- Continue to admin review tooling and trusted alias promotion workflows. Do not bulk-promote legacy aliases and do not re-enable broad alternate resolution.

### Stage 6 — Admin Audit Mode And Review Queue

Goal: support the owner’s supermarket scanning idea safely, without mixing audit scans with ordinary shopper analytics.

Status: Stage 6A read-only correction inbox and Stage 6B correction status actions are complete locally on 2026-06-08.

Expected behavior:

- Audit Mode is owner/admin-only.
- Audit scans are tagged separately from shopper scan events.
- Admin can mark: correct, wrong product, unknown, create candidate, trust alias, reject alias, quarantine alias.
- Correct confirmations increase confidence, but do not bypass hard conflict rules.

Likely files:

- Retail/admin screen or extension of `/retail/:storeSlug/ean-recovery`
- API/RPC for correction review actions
- Supabase migration for review status fields if not covered in Stage 5

Verification gate:

- Admin-only access check.
- Manual QA of review queue actions on test rows.
- No public client can write trusted aliases directly.

Stop point:

- Owner confirms workflow is usable before mass supermarket audit.

### Stage 6A Completion Notes

Implemented locally:

- `src/domain/product/correctionReview.js` normalizes correction report rows for retail review UI and summarizes open/identity/data-quality counts.
- `tests/unit/productCorrectionReview.test.mjs` covers metadata-safe normalization and open report summary logic.
- `/retail/:storeSlug/ean-recovery` now loads open `product_correction_events` for the current store and shows a read-only inbox card above the fake-EAN product queue.
- RU/KZ i18n keys were added under `retail.eanRecovery.*`.

Safety contract:

- Stage 6A does not update report status.
- Stage 6A does not write to `product_ean_aliases`.
- Stage 6A does not promote anything to `trusted`.
- Stage 6A does not re-enable `alternate_eans` scan resolution.
- Stage 6A does not add photo upload/storage.

Verification:

- TDD red was verified first: `node --test tests/unit/productCorrectionReview.test.mjs` failed with `ERR_MODULE_NOT_FOUND` before implementation.
- `node --test tests/unit/productCorrectionReview.test.mjs tests/unit/productCorrectionReports.test.mjs` — 6/6 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint src/domain/product/correctionReview.js src/screens/EanRecoveryScreen.jsx` — 0 errors, existing `set-state-in-effect` warnings remain in `EanRecoveryScreen.jsx`.
- Live service-role sanity: `mars`, `nurly`, and `kalina` currently have 0 open correction reports.

Next required action:

- Design Stage 6C trusted-alias candidate review and hard conflict checks before implementing any alias promotion. Do not add a trusted-promotion button until conflict checks and evidence requirements are explicit and tested.

### Stage 6B Completion Notes

Implemented locally:

- `src/domain/product/correctionReview.js` now validates correction status transitions and builds metadata-only update payloads.
- `api/ean-recovery.js` supports `update-correction-status`.
- Existing product mutation actions in `api/ean-recovery.js` remain admin-only.
- Correction status updates are allowed for admin or the owner of the correction report's `store_id`.
- `/retail/:storeSlug/ean-recovery` now shows status action buttons on open correction reports: `reviewing`, `fixed`, `rejected`, and `duplicate`.
- RU/KZ i18n keys were added for the action labels.

Safety contract:

- Stage 6B writes only `product_correction_events.status`, `reviewed_by_auth_id`, `reviewed_at`, and `resolution_json`.
- Stage 6B does not write to `product_ean_aliases`.
- Stage 6B does not update `global_products`, `store_products`, or `global_products.alternate_eans`.
- Stage 6B does not promote anything to `trusted`.
- Stage 6B does not re-enable broad alternate scan resolution.

Verification:

- TDD red was verified for transition helpers before implementation.
- `node --test tests/unit/eanRecoveryApiCorrectionStatus.test.mjs tests/unit/productCorrectionReview.test.mjs tests/unit/productCorrectionReports.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/productScanContainment.test.mjs` — 24/24 passed.
- `node --check api/ean-recovery.js` — passed.
- `npx eslint src/domain/product/correctionReview.js src/screens/EanRecoveryScreen.jsx api/ean-recovery.js` — 0 errors, existing `EanRecoveryScreen.jsx` warnings remain.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npm run check:agent:docs` — PASS.
- `npm run build` — passed with existing Vite/Sentry warnings.
- Live DB smoke inserted, updated `new -> rejected`, and deleted one temporary correction event row.

Next required action:

- Stage 6C-B: design server-side trusted alias promotion action with live conflict checks before any promotion UI exists.

### Stage 6C-A Completion Notes

Implemented locally:

- `src/domain/product/eanAliases.js` now has trusted promotion guard helpers:
  - `canPromoteEanAliasToTrusted()`;
  - `buildTrustedAliasPromotionUpdate()`.
- `tests/unit/eanAliasModel.test.mjs` covers strong evidence acceptance, legacy/broad source rejection, primary EAN conflicts, existing trusted conflicts, and update payload shape.

Safety contract:

- Stage 6C-A is local domain logic only.
- No UI/API trusted promotion action was added.
- No `product_ean_aliases` writes were made.
- Live `trusted` count remains 0.
- Legacy/broad search sources are explicitly blocked from trusted promotion: `legacy_alternate_eans`, `npc_search`, `arbuz_search`, `kaspi`, `korzinavdom`, `unknown`.
- Promotion requires active/scannable alias, confidence >=80, trustable source, `reviewerConfirmedSameSku: true`, no primary-EAN conflict, and no existing trusted conflict for another product.

Verification:

- TDD red was verified: `node --test tests/unit/eanAliasModel.test.mjs` failed before new exports existed.
- `node --test tests/unit/eanAliasModel.test.mjs` — 8/8 passed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/productScanContainment.test.mjs tests/unit/eanRecoveryApiCorrectionStatus.test.mjs tests/unit/productCorrectionReview.test.mjs tests/unit/productCorrectionReports.test.mjs` — 28/28 passed.
- `npx eslint src/domain/product/eanAliases.js` — passed with no output.
- Live alias count check: total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.

Next required action:

- Stage 6C-C should add admin-only trusted-candidate review UI/read-only affordance before exposing the promotion API in the interface.

### Stage 6C-B Completion Notes

Implemented locally:

- `api/ean-recovery.js` now supports admin-only `promote-ean-alias-trusted` through exported `handleTrustedAliasPromotion()`.
- `tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` covers successful promotion after conflict reads, admin-only access, primary-EAN conflict blocking, and legacy-source blocking.

Safety contract:

- Stage 6C-B adds a server-side API contract only.
- No UI promotion button was added.
- No live promotion write was executed.
- The server reads current alias data, active trusted alias for the same EAN, and active primary `global_products.ean` target in the same request before update.
- The server applies Stage 6C-A guardrails before update.
- The update is guarded with current alias id and current status to reduce stale-status races.
- Non-admin users cannot call trusted promotion.

Verification:

- TDD red was verified: `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` failed before `handleTrustedAliasPromotion` existed.
- `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 4/4 passed.
- `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs tests/unit/eanRecoveryApiCorrectionStatus.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/productScanContainment.test.mjs tests/unit/productCorrectionReview.test.mjs tests/unit/productCorrectionReports.test.mjs` — 32/32 passed.
- `node --check api/ean-recovery.js` — passed.
- `npx eslint api/ean-recovery.js src/domain/product/eanAliases.js` — passed with no output.
- Live alias count check: total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.

Next required action:

- Stage 6C-D: design explicit admin-only typed confirmation before calling the promotion API from UI. Do not expose promotion to retail owners yet.

### Stage 6C-C Completion Notes

Implemented locally:

- `src/domain/product/eanAliases.js` now exposes `normalizeTrustedAliasReviewCandidate()` for read-only review cards.
- `tests/unit/eanAliasModel.test.mjs` covers read-only candidate normalization and blocked reason exposure.
- `/retail/:storeSlug/ean-recovery` now shows an admin-only read-only trusted EAN candidates block.
- RU/KZ i18n keys were added under `retail.eanRecovery.alias*`.

Safety contract:

- Stage 6C-C does not add a promotion button.
- Stage 6C-C does not call `promote-ean-alias-trusted` from the UI.
- Stage 6C-C does not write to `product_ean_aliases`.
- Retail owners do not see the candidate block unless they are also admin.
- The UI marks locally passable candidates as needing server check, not as safe to promote.

Verification:

- TDD red was verified: `node --test tests/unit/eanAliasModel.test.mjs` failed before `normalizeTrustedAliasReviewCandidate()` existed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 14/14 passed.
- Broader EAN/correction unit set — 29/29 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint src/domain/product/eanAliases.js src/screens/EanRecoveryScreen.jsx` — 0 errors, existing `set-state-in-effect` warnings remain.
- `npm run build` — passed with existing Vite/Sentry warnings.
- Live candidate query with explicit FK returned sample rows.
- Live alias count check: total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.

Next required action:

- Stage 6C-D should add explicit admin-only typed confirmation and call the promotion API only for candidates that still pass server-side guardrails.

### Stage 7 — Parser And Import Hardening

Goal: prevent future imports from recreating the same pollution.

Required changes:

- `npcSearchByName()` cannot write search results directly into trusted aliases or buyer-visible `alternate_eans`.
- Exact source barcode fields can become candidates/trusted depending on source confidence.
- Broad search results go to review-only candidate state.
- Store POS/import barcodes become high-priority evidence, but still respect one trusted EAN per active product.

Likely files:

- `scripts/arbuz-subcategory-parser.cjs`
- `scripts/arbuz-catalog-parser.cjs`
- `scripts/arbuz-enrich.cjs`
- Retail import utilities under `src/utils/retailImport.js`
- New shared helper for EAN confidence/classification if needed

Verification gate:

- Parser dry-run on a small category.
- Confirm no broad NPC search result is written as trusted without exact identity gates.
- `node --check` for touched scripts.

Stop point:

- Owner confirms parser policy: fewer false recognitions are acceptable to avoid false products.

### Stage 7-A Completion Notes

Implemented locally on 2026-06-10:

- Added `scripts/import-ean-policy.cjs` with `buildArbuzImportEanDecision()`.
- Added `tests/unit/importEanPolicy.test.mjs`.
- `scripts/arbuz-subcategory-parser.cjs` now keeps exact Arbuz barcode fields as primary EAN, but broad NPC/name search results no longer become primary `ean` or `alternate_eans`.
- `scripts/arbuz-catalog-parser.cjs` now stores NPC/name search codes only as review evidence.
- NPC review evidence is stored under `specs_json.ean_recovery_candidates` for later admin/audit processing.

Safety contract:

- No live import was run.
- No live data was changed.
- No `global_products.alternate_eans` deletion or mutation was performed.
- Broad NPC/name search results remain review-only evidence, not buyer-visible scan truth.
- Exact source barcode fields can still become primary EAN.

Verification:

- TDD red was verified: `node --test tests/unit/importEanPolicy.test.mjs` failed before `scripts/import-ean-policy.cjs` existed.
- `node --test tests/unit/importEanPolicy.test.mjs` — 3/3 passed.
- `node --test tests/unit/importEanPolicy.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/productScanContainment.test.mjs` — 24/24 passed.
- `node --check scripts/import-ean-policy.cjs` — passed.
- `node --check scripts/arbuz-subcategory-parser.cjs` — passed.
- `node --check scripts/arbuz-catalog-parser.cjs` — passed.

Remaining Stage 7 work:

- Harden or retire legacy NPC enrichment scripts such as `scripts/npc-eans-harvest.cjs`, `scripts/npc-enrich.cjs`, and old resolver/promoter scripts before any live run.
- Add a clean path that writes strong exact evidence into `product_ean_aliases` instead of uncontrolled `alternate_eans`.

### Stage 7-B Completion Notes

Implemented locally on 2026-06-10:

- Added `scripts/legacy-ean-script-guard.cjs`.
- Added `tests/unit/legacyEanScriptGuard.test.mjs`.
- Guarded legacy risky scripts:
  - `scripts/npc-eans-harvest.cjs`;
  - `scripts/npc-enrich.cjs`;
  - `scripts/resolve-v3.cjs`;
  - `scripts/resolve-alternate-eans.cjs`.

Safety contract:

- These scripts are now dry-run-only.
- Running them without `--dry-run` aborts before DB/API work.
- No live data was changed.
- No `global_products.ean`, `global_products.alternate_eans`, or `global_products.is_active` writes were executed.

Verification:

- TDD red was verified: `node --test tests/unit/legacyEanScriptGuard.test.mjs` failed before `scripts/legacy-ean-script-guard.cjs` existed.
- `node --test tests/unit/legacyEanScriptGuard.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/productScanContainment.test.mjs` — 27/27 passed.
- `node --check scripts/legacy-ean-script-guard.cjs` — passed.
- `node --check scripts/npc-eans-harvest.cjs` — passed.
- `node --check scripts/npc-enrich.cjs` — passed.
- `node --check scripts/resolve-v3.cjs` — passed.
- `node --check scripts/resolve-alternate-eans.cjs` — passed.
- Live guard smoke: `node scripts/npc-enrich.cjs --limit=1` aborted with the expected guard error before live work.

Live read-only stats after Stage 7-B:

- Active `global_products`: 13,101.
- Products with non-empty legacy `alternate_eans`: 9,429.
- Legacy alias relations: 146,805.
- Unique legacy alias codes: 54,950.
- Duplicate legacy alias codes: 26,024.
- Legacy alias relations that are also an active primary EAN: 35,516.
- `product_ean_aliases`: total 144,856; trusted 0; review 26,771; quarantined 118,085; rejected 0.
- `product_correction_events`: 0 rows across `new`, `reviewing`, `fixed`, `rejected`, and `duplicate` in the live count query.

Remaining Stage 7 work:

- Review remaining barcode/enrichment scripts outside the Stage 7-B set before live use.
- Build a clean exact-evidence insert path into `product_ean_aliases` instead of adding uncontrolled `alternate_eans`.

### Stage 7-C Completion Notes

Implemented locally on 2026-06-13:

- Added admin-only `handleManualAliasCandidateCreate()` to `api/ean-recovery.js`.
- Added API action `create-manual-alias-candidate`.
- The action creates only `review` candidates in `product_ean_aliases` with `source='manual_admin'`, `confidence=95`, `created_by_auth_id`, and evidence confirming same SKU/package review.
- Before insert, the server checks target product existence, scannable EAN format, active primary-EAN conflicts, and active trusted-alias conflicts.

Safety contract:

- No live data write was run.
- No candidate is automatically promoted to `trusted`.
- No writes to `global_products.ean`, `global_products.alternate_eans`, `store_products.ean`, or product facts.
- Retail owners cannot create manual candidates unless they are admins.

Verification:

- TDD red was verified: `tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` failed before `handleManualAliasCandidateCreate` was exported by `api/ean-recovery.js`.
- `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 7/7 passed.
- `node --test tests/unit/productScanContainment.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/legacyEanScriptGuard.test.mjs` — 31/31 passed.
- `node --check api/ean-recovery.js` — passed.
- `npx eslint api/ean-recovery.js src/domain/product/eanAliases.js tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — passed with no output.

Remaining Stage 7 work:

- Wire a controlled admin UI/workflow to call `create-manual-alias-candidate` during manual review.
- Review remaining barcode/enrichment scripts outside the Stage 7-B guard set before live use.
- Start Stage 8 audit scans with manual candidate creation plus existing typed trusted promotion.

### Stage 7-D Completion Notes

Implemented locally on 2026-06-13:

- Added `buildManualAliasCandidateRequest()` to `src/domain/product/eanAliases.js`.
- Added an admin-only `В review` / `Review-ге` UI action to the existing fake-EAN edit row in `/retail/:storeSlug/ean-recovery`.
- The UI calls `create-manual-alias-candidate`, refreshes trusted alias candidates, and leaves product data unchanged.
- RU/KZ i18n keys were added for success, duplicate, invalid EAN, and failure states.

Safety contract:

- No live write was run.
- The UI action creates only `review` rows.
- No automatic `trusted` promotion.
- No writes to `global_products.ean`, `global_products.alternate_eans`, `store_products.ean`, or product facts.

Verification:

- TDD red was verified: `node --test tests/unit/eanAliasModel.test.mjs` failed before `buildManualAliasCandidateRequest()` was exported.
- `node --test tests/unit/eanAliasModel.test.mjs` — 14/14 passed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs tests/unit/productScanContainment.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/legacyEanScriptGuard.test.mjs` — 32/32 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint src/domain/product/eanAliases.js src/screens/EanRecoveryScreen.jsx api/ean-recovery.js tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 0 errors, existing `react-hooks/set-state-in-effect` warnings remain in `EanRecoveryScreen.jsx`.

Remaining Stage 7 work:

- Controlled live smoke on one verified package: create review candidate, confirm it appears, then promote only if same SKU/package is manually verified.
- Review remaining barcode/enrichment scripts outside the Stage 7-B guard set before live use.
- Start Stage 8 audit scans after the owner confirms this workflow is usable in-store.

### Stage 7-E Completion Notes

Implemented locally on 2026-06-13:

- `handleManualAliasCandidateCreate()` now blocks redundant aliases when the entered EAN is already the target product's active primary EAN.
- New block reason: `ean_already_primary_for_same_product`.
- RU/KZ i18n labels were added for the block reason.

Safety contract:

- No live write was run.
- No product data is mutated.
- Cross-product primary EAN conflicts remain blocked.
- Same-product primary EAN duplicates are now blocked before insert, keeping the review queue cleaner.

Verification:

- TDD red was verified: `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` failed with `200 !== 400` before the guard was added.
- `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 8/8 passed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/eanRecoveryApiTrustedPromotion.test.mjs tests/unit/productScanContainment.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/legacyEanScriptGuard.test.mjs` — 33/33 passed.
- `node scripts/check-i18n.mjs` — PASS, no missing KZ keys.
- `npx eslint api/ean-recovery.js tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — passed with no output.

Remaining Stage 7 work:

- Controlled live smoke on one verified package: create review candidate, confirm it appears, then promote only if same SKU/package is manually verified.
- Review remaining barcode/enrichment scripts outside the Stage 7-B guard set before live use.
- Start Stage 8 audit scans after the owner confirms this workflow is usable in-store.

### Stage 8 — Mass QA And Supermarket Audit

Goal: rebuild trusted multi-EAN coverage using real-world scans after containment and review tooling exist.

Recommended audit workflow:

- Use Audit Mode, not ordinary shopper scan mode.
- Scan high-risk categories first: milk/dairy, mayonnaise/sauces, baby food, sweets, drinks.
- For wrong/unknown results, capture front package photo and barcode photo if the approved workflow supports images.
- Mark correct matches too, because confirmations are useful confidence evidence.

Success metrics:

- False product reports trend toward zero.
- Unknown/review rate becomes measurable and shrinks over time.
- Trusted aliases grow only when conflict-free.
- Every trusted alias has source/evidence.

Verification gate:

- Weekly audit report from `product_ean_aliases` and correction events.
- Sample manual review of trusted aliases in high-risk categories.

Stop point:

- Decide whether more external barcode providers or store POS integrations are worth the cost.

## Recommended Execution Order

Do not skip stages 1-4. Stages 5-8 are valuable, but they are only safe after buyer scan containment and trusted alias infrastructure.

Recommended next step: Stage 1 only.

Stage 1 is intentionally small and reversible: stop unsafe `alternate_eans` from producing buyer-visible false products while preserving all existing data for later recovery.

### Stage 1 Completion Notes

Implemented local containment in code:

- `src/domain/product/resolver.js` now rejects RPC results whose returned primary product EAN does not exactly match the scanned EAN. This prevents the existing live `fn_resolve_product_by_ean` alternate branch from being accepted by the client as a buyer-visible product.
- `src/domain/product/resolver.js` fallback queries no longer resolve through legacy `global_products.alternate_eans`.
- `src/domain/product/alternatives.js` `findProductInCatalog()` now supports `{ allowAlternate: false }`.
- `src/screens/ProductScreen.jsx` uses exact-only catalog lookup for `fromScan` routes, so immediate scan navigation cannot pick a catalog product through polluted alternates before the resolver runs.
- `tests/unit/productScanContainment.test.mjs` covers exact-only catalog lookup and exact-only resolver acceptance.

Verification:

- `node --test tests/unit/productScanContainment.test.mjs` — 4/4 passed.
- `node --test tests/unit/productScanContainment.test.mjs tests/unit/alternativesRpcMapping.test.mjs tests/unit/aiProductContext.test.mjs` — 13/13 passed.
- `npm run lint` — 0 errors, 77 existing warnings in unrelated files.

Known limitation:

- Stage 1 intentionally increases unknown/not-found outcomes for unsafe alternate-only scans until Stage 2-4 rebuild trusted aliases. This is the desired safety tradeoff.

Next recommended step: Stage 2 trusted alias data model.
