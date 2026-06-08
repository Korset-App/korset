---
title: EAN Stage 3 Legacy Alias Dry-Run
domain: changelog
status: complete-dry-run
date: 2026-06-08
language: ru
---

# EAN Stage 3 Legacy Alias Dry-Run

## Context

Stage 2 migration `047_product_ean_aliases.sql` was applied by the owner. A read-only check confirmed `product_ean_aliases` exists in live Supabase and had 0 rows before Stage 3.

Stage 3 was executed as dry-run only. No live rows were inserted, updated, or deleted.

## Changes

- Added `src/domain/product/eanAliasClassification.js` with conservative legacy alias classification.
- Added `tests/unit/eanAliasClassification.test.mjs`.
- Added `scripts/migrate-legacy-ean-aliases.mjs`.
- The script refuses `--live` in this dry-run stage and writes reports to `C:\tmp` only.

## Dry-Run Output

- Summary: `C:\tmp\korset-ean-alias-migration-dry-run.json`.
- Candidate JSONL: `C:\tmp\korset-ean-alias-candidates.jsonl`.

Results:

- Active products: 13,101.
- Products with alternates: 9,429.
- Alias relations: 146,805.
- Unique alias codes: 54,950.
- Insertable candidate rows: 144,860 (98.7%).
- Skipped rows: 1,945 (1.3%).
- `quarantined`: 118,086 (80.4%).
- `review`: 26,774 (18.2%).
- `rejected`: 1,945 (1.3%).
- `trusted`: 0 intentionally.

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

## Verification

- `node --test tests/unit/eanAliasClassification.test.mjs tests/unit/eanAliasModel.test.mjs` — 9/9 passed.
- `node --check scripts/migrate-legacy-ean-aliases.mjs` — passed with no output.
- Dry-run executed with `node scripts/migrate-legacy-ean-aliases.mjs`.
- Post-run live check confirmed `product_ean_aliases` remained at 0 rows.

## Interpretation

The dry-run confirms that legacy `alternate_eans` should not be bulk-promoted to trusted buyer scan aliases. Most legacy relations are conflict-prone and should become review/quarantine evidence first. Trusted aliases should be created only from stronger sources such as store import, manual admin review, audit scan with evidence, or exact external barcode lookup.

## Next

Review the dry-run report before any writes. The next safe implementation step is to add a reviewed live writer that inserts only `review` and `quarantined` evidence rows, still with `trusted = 0`, or to move first to Stage 5/6 correction tooling depending on product priority.
