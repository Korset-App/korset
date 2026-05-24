# Halal Ingredient & Name Analysis

Domain: changelog / halal
Date: 2026-05-24
Status: completed

## Summary

Ingredient-based and name-based halal analysis of the product database.
Combined approach: scan 9532 `ingredients_raw` texts and 11862 product names for halal/haram signals.

## Changes

- `scripts/halal-ingredient-analysis.cjs`: new script for ingredient-based halal detection
- `scripts/fix-haram-from-name.cjs`: new script for name-based haram detection
- `data/halal-e-code-report.json`: saved E-code analysis report (156 products with suspicious E-codes)

## Results

| Status | Before | After | Change |
|--------|--------|-------|--------|
| yes    | 598 (5.0%) | 598 (5.0%) | 0 |
| no     | 8 (0.1%) | 84 (0.7%) | +76 |
| unknown| 11,256 (94.9%) | 11,180 (94.3%) | -76 |
| total  | 11,862 | 11,862 | — |

### Ingredient analysis (9532 products)
- **0** explicit halal mentions in ingredients (already caught by name check)
- **23** with E120 (carmine) or E904 (shellac) → marked `no`
- **156** with suspicious E-codes → report only, no auto-update
- **0** with pork/alcohol keywords in ingredients
- **9376** with no signals at all

### Name-based haram detection (11862 products)
- **53** with "со свининой", "свиная", "свиной", "свинина", "шпик" → `no`
- Properly excluded: "без свинины" products, bacon-flavored snacks, "приправа для свинины"

### E-code findings (top)
E322 (lecithin, 37), E471 (mono/diglycerides, 31), E476 (PGPR, 25), E415 (xanthan gum, 21), E170 (calcium carbonate, 19), E422 (glycerin, 10), E631 (sodium inosinate, 11).

## Verification

- `node scripts/_tmp_halal_stats.cjs` confirms totals
- Scripts run without errors

## Files changed

- `scripts/halal-ingredient-analysis.cjs` (new)
- `scripts/fix-haram-from-name.cjs` (new)
- `data/halal-e-code-report.json` (new)
- `docs/CONTEXT.md` (updated halal stats)

## Next steps

- E120/E904 was an easy win. Next E-code candidates for manual verification: E322 (lecithin), E471 (mono/diglycerides) — most common, most ambiguous.
- Consider adding `halal_notes` or `halal_source` column to `global_products` for tracking HOW halal status was determined.
- For remaining 94.3% unknown: brand whitelist (manual), or reverse engineering Halal Guide KZ app.
