---
title: EAN Stage 7-B Legacy Script Live Guard
domain: changelog
status: complete-local
date: 2026-06-10
language: ru
---

# EAN Stage 7-B Legacy Script Live Guard

## Context

Stage 7-A hardened the active Arbuz parser/import path. Stage 7-B prevents older EAN recovery/enrichment scripts from accidentally running live and writing broad NPC/search results into `global_products.ean`, `global_products.alternate_eans`, or `global_products.is_active`.

## Scope

- Added `scripts/legacy-ean-script-guard.cjs`.
- Added `tests/unit/legacyEanScriptGuard.test.mjs`.
- Guarded these scripts as dry-run-only:
  - `scripts/npc-eans-harvest.cjs`;
  - `scripts/npc-enrich.cjs`;
  - `scripts/resolve-v3.cjs`;
  - `scripts/resolve-alternate-eans.cjs`.

## Behavior

- `--dry-run` mode remains allowed.
- Running the guarded scripts without `--dry-run` throws before Supabase/API work.
- There is no override flag such as `--live` or `--force`.
- Future live writes must be rebuilt through reviewed `product_ean_aliases` flows, not legacy `alternate_eans` mutation.

## Safety

- No live data was changed.
- No `global_products.ean` writes were executed.
- No `global_products.alternate_eans` writes were executed.
- No product deactivation was executed.
- No trusted alias promotion was executed.

## Verification

- TDD red: `node --test tests/unit/legacyEanScriptGuard.test.mjs` failed before `scripts/legacy-ean-script-guard.cjs` existed.
- `node --test tests/unit/legacyEanScriptGuard.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/productScanContainment.test.mjs` — 27/27 passed.
- `node --check scripts/legacy-ean-script-guard.cjs` — passed.
- `node --check scripts/npc-eans-harvest.cjs` — passed.
- `node --check scripts/npc-enrich.cjs` — passed.
- `node --check scripts/resolve-v3.cjs` — passed.
- `node --check scripts/resolve-alternate-eans.cjs` — passed.
- Live guard smoke: `node scripts/npc-enrich.cjs --limit=1` aborted before live work with expected guard error.

## Current Live Read-Only Stats

- Active `global_products`: 13,101.
- Products with non-empty legacy `alternate_eans`: 9,429.
- Legacy alias relations: 146,805.
- Unique legacy alias codes: 54,950.
- Duplicate legacy alias codes: 26,024.
- Legacy alias relations that are also an active primary EAN: 35,516.
- `product_ean_aliases`: total 144,856; trusted 0; review 26,771; quarantined 118,085; rejected 0.
- `product_correction_events`: 0 rows across counted statuses.

## Next

Review remaining barcode/enrichment scripts outside this guard set before any live use, then build an exact-evidence path into `product_ean_aliases` for future trusted alias growth.
