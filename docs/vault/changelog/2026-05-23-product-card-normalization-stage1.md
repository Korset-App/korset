---
title: Product Card Normalization Stage 1
date: 2026-05-23
domain: changelog
status: completed
area: product
related: [[2026-05-23-product-card-normalization-stage1-audit]] · [[2026-05-23-product-card-normalization-professional-plan]]
---

# Product Card Normalization Stage 1

Completed Stage 1 of the product card normalization workstream.

## What Changed

- Added read-only Supabase audit script `scripts/audit-product-card-normalization.cjs`.
- Generated real-data QA fixture `tests/fixtures/product-card-normalization-samples.json` from MARS/store-one.
- Documented the Stage 1 findings in `docs/vault/plans/2026-05-23-product-card-normalization-stage1-audit.md`.

## Main Findings

- Calories and protein are often present in Supabase but hidden by key mismatches.
- `fn_get_store_catalog` was already expanded by migration 037 to return `ingredients_raw`, `nutriments_json`, and `traces_json`, but frontend catalog mapping still ignores them.
- Full ProductScreen fetch loads full product fields, but passes raw nutrition through, so it still depends on incomplete UI aliases.
- Storage conditions are present as `specs_json.storage_conditions`, while UI expects `storage`.
- Nutrition/ingredient label images are absent in current data, so image-based nutrition/composition display should not be added now.

## Verification

- `node scripts/audit-product-card-normalization.cjs --write --store=store-one` passed against live Supabase after network approval.

