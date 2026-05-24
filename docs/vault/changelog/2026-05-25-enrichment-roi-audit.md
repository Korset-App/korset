# Enrichment ROI audit

Date: 2026-05-25

## What was checked

Created and ran `scripts/_tmp_enrichment_roi_audit.mjs` as a read-only Supabase audit over active `global_products`.
The report is saved to `C:\tmp\korset-enrichment-roi-audit.json`.

Also ran `node scripts\arbuz-enrich.cjs --dry-run --limit=30` to measure the current Arbuz automatic enrichment behavior without writing to the database.

## Main findings

- Active products: 11,862
- Ingredients known: 10,125 (85.4%)
- Carbs known: 8,446 (71.2%)
- Sugar known: 51 (0.4%)
- Fiber known: 9 (0.1%)
- Real EAN: 9,732 (82.0%)
- Product image present: 11,809 (99.6%)

Recommended path counts from the audit:

- `ean_source_cascade`: 9,732 products
- `back_label_photo_or_ocr`: 2,113 products
- `manual_or_store_photo`: 17 products

Arbuz dry-run sample over 30 products missing composition:

- Found candidate: 26/30 (87%)
- Composition found: 12/30
- KBJU found: 13/30
- Halal marker found: 4/30
- No match: 4/30

## Interpretation

The data does not support a single-source "enrich everything automatically" promise.
It does support a staged enrichment system:

1. Use EAN/source cascade for broad automatic coverage.
2. Use strict confidence gates before writing external matches.
3. Use back-label photo/OCR for sugar and fiber because current catalog sources barely cover these fields.
4. Keep weak matches as review candidates, not buyer-visible facts.

The current Arbuz enrichment script proves strong potential, but it is not safe for mass writes yet: dry-run exposed some likely false positives where a high-scoring match returned unrelated composition/nutrition. Before production writes, matching must validate EAN/article index, brand, normalized name tokens, package size, category compatibility, and reject semantic conflicts.

## Product decision

For keto/diabetes/nutrition-grade Fit-Check, the next real leverage is not another rule tweak. It is a data quality pipeline with field-level source/confidence and a store/photo review workflow for missing sugar/fiber/back-label facts.
