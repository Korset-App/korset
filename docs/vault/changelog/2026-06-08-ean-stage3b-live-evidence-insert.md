---
title: EAN Stage 3B Live Evidence Insert
domain: changelog
status: complete
date: 2026-06-08
language: ru
---

# EAN Stage 3B Live Evidence Insert

## Context

After Stage 3 dry-run, the owner approved continuing. The goal was to write legacy `alternate_eans` into `product_ean_aliases` as review/quarantine evidence only, with zero trusted aliases.

## Changes

- Updated `scripts/migrate-legacy-ean-aliases.mjs` with a guarded `--live` mode.
- Live mode refuses to write if any legacy candidate is classified as `trusted`.
- Added candidate deduplication by `ean::global_product_id` before insert.
- Existing rows are skipped by default for performance; `--update-existing` remains available but was not used in the final full insert.

## Live Execution

Smoke insert:

- Command: `node scripts/migrate-legacy-ean-aliases.mjs --live --limit-products=10 --report=C:\tmp\korset-ean-alias-smoke-live.json --candidates=C:\tmp\korset-ean-alias-smoke-candidates.jsonl --batch-size=50`
- Result: 21 review rows inserted.

First full insert attempt:

- Stopped on `product_ean_aliases_active_pair_key` duplicate pair constraint.
- This was expected-safe behavior: the DB prevented duplicate active `ean + global_product_id` rows.
- Writer was fixed to dedupe candidates before insert.

Second full insert attempt:

- Timed out because per-row updates for existing rows were too slow through Supabase API.
- Writer was changed to skip existing rows by default.

Final full insert:

- Command: `node scripts/migrate-legacy-ean-aliases.mjs --live --report=C:\tmp\korset-ean-alias-live-insert.json --candidates=C:\tmp\korset-ean-alias-live-candidates.jsonl --batch-size=250`
- Attempted unique candidate rows: 144,856.
- Inserted: 135,856.
- Skipped existing: 9,000.
- Updated existing: 0.
- Batches: 580.

## Final Live Counts

- Total `product_ean_aliases`: 144,856.
- `trusted`: 0.
- `review`: 26,771.
- `quarantined`: 118,085.
- `rejected`: 0.

## Verification

- `node --test tests/unit/eanAliasClassification.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/productScanContainment.test.mjs` — 13/13 passed.
- `node --check scripts/migrate-legacy-ean-aliases.mjs` — passed.
- Live count queries confirmed status totals above.

## Impact

This stage does not change buyer scan resolution because no trusted aliases were inserted and Stage 4 resolver support is not active. It creates a controlled evidence/review layer for future correction tooling and trusted alias promotion.

## Next

Recommended next step is not to bulk-promote aliases. Proceed with either:

- Stage 5/6 correction and admin review tooling so trusted aliases can be created from real evidence; or
- Stage 4 resolver support for trusted aliases, which will be behaviorally inert until trusted rows exist.
