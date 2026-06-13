---
title: EAN Stage 7-A Parser Import Hardening
domain: changelog
status: complete-local
date: 2026-06-10
language: ru
---

# EAN Stage 7-A Parser Import Hardening

## Context

The EAN recovery audit identified broad NPC/name search as the main source of polluted `global_products.alternate_eans`. Stage 7-A prevents the active Arbuz import scripts from recreating the same pollution.

## Scope

- Added `scripts/import-ean-policy.cjs`.
- Added `tests/unit/importEanPolicy.test.mjs`.
- Updated `scripts/arbuz-subcategory-parser.cjs`.
- Updated `scripts/arbuz-catalog-parser.cjs`.

## Behavior

- Exact Arbuz barcode fields can still become primary `global_products.ean`.
- Broad NPC/name search results no longer become primary `ean`.
- Broad NPC/name search results no longer become buyer-visible `alternate_eans`.
- NPC codes are preserved only as review evidence under `specs_json.ean_recovery_candidates`.
- Products with no exact source barcode still fall back to `arbuz_<id>`.

## Safety

- No live parser/import run was executed.
- No live data was changed.
- `global_products.alternate_eans` was not deleted or mutated.
- No trusted alias promotion was executed.
- Broad alternate resolution remains disabled for buyer scan containment.

## Verification

- TDD red: `node --test tests/unit/importEanPolicy.test.mjs` failed before `scripts/import-ean-policy.cjs` existed.
- `node --test tests/unit/importEanPolicy.test.mjs` — 3/3 passed.
- `node --test tests/unit/importEanPolicy.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/productScanContainment.test.mjs` — 24/24 passed.
- `node --check scripts/import-ean-policy.cjs` — passed.
- `node --check scripts/arbuz-subcategory-parser.cjs` — passed.
- `node --check scripts/arbuz-catalog-parser.cjs` — passed.

## Remaining Risk

Other legacy NPC enrichment scripts still need separate hardening or retirement before any live run, especially `scripts/npc-eans-harvest.cjs`, `scripts/npc-enrich.cjs`, and old resolver/promoter scripts.
