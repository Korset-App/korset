---
title: Product Card Normalization Planning
date: 2026-05-23
domain: changelog
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[attribute-extraction]] · [[product-comparison-engine]]
---

# Product Card Normalization Planning

Documented the professional plan for ProductScreen and product normalization before starting the Compare rebuild.

## Decisions

- Product normalization is now treated as a dedicated major workstream.
- ProductScreen should hide missing sections instead of showing "not enough data" messages.
- AI answers may mention data incompleteness when relevant; the product card itself should stay confident and clean.
- Flavor is required as a visible characteristic when confidently detected, across the full grocery catalog, not only in dairy/drinks/sweets.
- Flavor extraction must be conservative and confidence-based.
- Packaging type remains internal and should not be shown in ProductScreen.
- Data source, data quality, NOVA group, Nutri-Score, and technical categories should not be shown in ProductScreen.
- Internal product score should be designed during the future Compare workstream, not in ProductScreen normalization.

## Key Audit Findings Preserved

- Many missing calories/proteins are caused by key mismatches, not true missing data.
- Arbuz-style nutrition uses `energy_kcal`, `protein_100g`, `fat_100g`, and `carbohydrates_100g`.
- Current UI/domain logic often expects `kcal`, `energy_kcal_100g`, `protein`, or `proteins_100g`.
- Sugar/salt coverage is genuinely low: about 51 sugar/sugars rows and 32 salt rows in the active full dataset.
- Storage conditions exist in `specs_json.storage_conditions`, while UI logic expects other field names.
- Nutrition/ingredient label images are effectively absent from current product data.

## Plan

The full implementation plan is saved at:

- `docs/vault/plans/2026-05-23-product-card-normalization-professional-plan.md`

The plan is staged:

1. Data contract audit and real sample set.
2. Canonical nutrition normalization.
3. Full ProductScreen loading contract.
4. Product specs normalization.
5. Flavor extraction.
6. Unit price visibility rules.
7. ProductScreen visual composition.
8. Real catalog QA.
9. Compare readiness handoff.

## Next Workstream

Start implementation from Stage 1. Do not begin Compare scoring until product normalization has passed real catalog QA.

