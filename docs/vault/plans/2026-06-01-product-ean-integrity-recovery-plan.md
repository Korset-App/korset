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

### Stage 6 — Admin Audit Mode And Review Queue

Goal: support the owner’s supermarket scanning idea safely, without mixing audit scans with ordinary shopper analytics.

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
