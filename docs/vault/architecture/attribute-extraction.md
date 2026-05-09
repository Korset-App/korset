# Attribute Extraction System

> Связи: [[fit-check-engine]] · [[category-system]] · [[name-normalization]] · [[data-moat-pipeline-strategy]]

## Overview

Rule-based extraction of structured product attributes from free-text product names.
Part of Data Moat strategy — transforms chaotic naming into queryable DB columns.

## Files

| File | Purpose |
|------|---------|
| `src/domain/product/attributeExtractor.js` | Core extraction engine |
| `scripts/extract-attributes.mjs` | Backfill script (--dry-run/--live) |
| `supabase/migrations/024_attribute_extraction.sql` | DDL: columns, CHECK, indexes |

## Extracted Attributes

### packaging_type (text, nullable)
6 valid values: `bottle_plastic`, `bottle_glass`, `can`, `tetrapak`, `pouch`, `tub`

Extraction strategy:
1. Priority suffix matching: КНВРТ→pouch, ТБА→tetrapak, Ж/Б→bottle_glass|can (context-dependent), П/Б→pouch, ПЭТ→bottle_plastic, СТБ→bottle_glass, ТБ→tub
2. Fallback keyword regex matching from PACKAGING_TYPES dictionary
3. Context disambiguation: Ж/Б = can for fish/canned goods, bottle_glass for beverages

### fat_percent (numeric(4,1), nullable)
Extraction strategy:
1. Regex: `\d{1,2}[,.]?\d?\s*%` — matches percentages like 2.5%, 3,2%, 9%
2. Context validation: must have fat-related keywords nearby (жир, молок, сливк, etc.)
3. Category hints: only extracted for dairy_eggs, meat, deli, sauces_spices, healthy, baby_food, ready_meals
4. Positional fallback: in hint categories, first % before weight number is likely fat

### diet_tags_json (jsonb, existing column — appended)
13 diet patterns detected by name keywords:
- sugar_free: "без сахара", "б.сах", "no sugar"
- gluten_free: "без глютен", "безглютен", "gluten free"
- lactose_free: "без лактоз", "lactose free"
- vegan: "vegan"
- vegetarian: "вегетариан", "vegetarian"
- fitness: "фитнес", "fitness", "протеин", "диетич"
- organic: "organic", "органик", "эко", "био"
- kosher: "kosher", "кошерн"
- diabetic: "диабетич", "diabetic"
- low_calorie: "низкокалор", "light"
- low_fat: "низк.*жирн", "обезжирен", "low fat"
- enriched: "обогащён", "fortified", "с витамин"

### halal_status (text, existing column — upgraded)
Patterns: HALAL, халяль, халял, халал, halal certified
Only upgrades: unknown → yes. Never downgrades yes → no or no → anything.

## fitCheck Integration

- `fatPercent` used for low_fat diet goal: >20% = caution, ≤5% = safe confirmation
- `dietTags` sugar_free/gluten_free used for positive confirmations in diet goals
- All 13 diet tags searchable in catalog/filter

## Pipeline Integration

All 3 pipeline scripts call `globalThis._extractAttributes()` after normalizeCategory():
- `arbuz-import.cjs` — extract on new product creation
- `arbuz-catalog-parser.cjs` — extract on enrich + create
- `korzinavdom-parser.cjs` — extract in mapToGlobalProduct()

## Data Quality Score

Migration 024 updates `calc_data_quality_score()` to reward:
- +3 for packaging_type NOT NULL
- +3 for fat_percent NOT NULL

## Expected Results (dry-run)

Based on analysis of 7008 active products:
- packaging_type: ~126 extracted
- fat_percent: ~590 extracted
- diet_tags: ~94 new tags added
- halal: ~10 upgraded unknown→yes
